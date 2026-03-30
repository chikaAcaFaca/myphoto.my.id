/**
 * On-Device AI Search Engine for MyPhoto
 *
 * Caches photo metadata (labels, faces, scene attributes) in IndexedDB
 * for instant local searching without server round-trips.
 *
 * Architecture:
 * 1. Server processes images → stores AI data in Firestore
 * 2. Client syncs metadata to IndexedDB (lightweight, no image data)
 * 3. Search queries run entirely on-device against cached index
 * 4. Falls back to server search when index is stale or missing
 *
 * Future: Can integrate TensorFlow.js or ONNX Runtime Web for
 * on-device image classification and face recognition directly
 * in the browser, enabling fully offline search.
 */

const DB_NAME = 'myphoto_search_index';
const DB_VERSION = 1;
const STORE_NAME = 'photo_index';
const META_STORE = 'sync_meta';

export interface PhotoIndexEntry {
  id: string;
  name: string;
  labels: string[];
  sceneType: string;
  sceneAttributes: Record<string, any>;
  faces: Array<{
    personId?: string;
    attributes?: {
      age?: number;
      gender?: string;
      hairColor?: string;
      glasses?: boolean;
      beard?: boolean;
    };
  }>;
  personIds: string[];
  locationName?: string;
  location?: { latitude: number; longitude: number };
  takenAt?: number; // timestamp ms
  createdAt: number;
  dominantColors?: string[];
  qualityScore?: number;
}

export interface OnDeviceSearchResult {
  fileId: string;
  score: number; // relevance score
}

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('labels', 'labels', { multiEntry: true });
        store.createIndex('sceneType', 'sceneType');
        store.createIndex('personIds', 'personIds', { multiEntry: true });
        store.createIndex('takenAt', 'takenAt');
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Sync photo metadata from server to local IndexedDB index.
 * Called after initial load and periodically to keep index fresh.
 */
export async function syncSearchIndex(
  photos: Array<{
    id: string;
    name: string;
    labels?: string[];
    sceneType?: string;
    sceneAttributes?: Record<string, any>;
    faces?: any[];
    locationName?: string;
    location?: { latitude: number; longitude: number };
    takenAt?: Date | string;
    createdAt: Date | string;
    dominantColors?: string[];
    qualityScore?: number;
  }>,
  personMap?: Map<string, string[]> // personId → fileIds
): Promise<number> {
  const db = await openDB();
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  let indexed = 0;

  for (const photo of photos) {
    // Resolve person IDs from faces
    const personIds: string[] = [];
    if (photo.faces) {
      for (const face of photo.faces) {
        if (face.personId) personIds.push(face.personId);
      }
    }
    // Also check reverse map
    if (personMap) {
      for (const [personId, fileIds] of personMap) {
        if (fileIds.includes(photo.id)) {
          personIds.push(personId);
        }
      }
    }

    const entry: PhotoIndexEntry = {
      id: photo.id,
      name: photo.name,
      labels: photo.labels || [],
      sceneType: photo.sceneType || 'general',
      sceneAttributes: photo.sceneAttributes || {},
      faces: (photo.faces || []).map((f) => ({
        personId: f.personId,
        attributes: f.attributes,
      })),
      personIds: [...new Set(personIds)],
      locationName: photo.locationName,
      location: photo.location,
      takenAt: photo.takenAt
        ? new Date(photo.takenAt).getTime()
        : undefined,
      createdAt: new Date(photo.createdAt).getTime(),
      dominantColors: photo.dominantColors,
      qualityScore: photo.qualityScore,
    };

    store.put(entry);
    indexed++;
  }

  // Update sync timestamp
  const metaStore = tx.objectStore(META_STORE);
  metaStore.put({ key: 'lastSync', value: Date.now(), count: indexed });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(indexed);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Search the local index. Returns matching file IDs with relevance scores.
 * This runs entirely on-device — no server calls needed.
 */
export async function searchLocalIndex(params: {
  labels?: string[];
  personIds?: string[];
  sceneFilters?: Array<{ field: string; value: string }>;
  faceFilters?: Array<{ field: string; value: string }>;
  dateRange?: { from: number; to: number };
  locationTerms?: string[];
  keywords?: string[];
}): Promise<OnDeviceSearchResult[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();

    request.onsuccess = () => {
      const entries: PhotoIndexEntry[] = request.result;
      const results: OnDeviceSearchResult[] = [];

      for (const entry of entries) {
        let score = 0;
        let matched = true;

        // --- Person filter ---
        if (params.personIds && params.personIds.length > 0) {
          const personMatch = params.personIds.some((pid) =>
            entry.personIds.includes(pid)
          );
          if (!personMatch) { matched = false; continue; }
          score += 30;
        }

        // --- Date range ---
        if (params.dateRange) {
          const fileTime = entry.takenAt || entry.createdAt;
          if (fileTime < params.dateRange.from || fileTime > params.dateRange.to) {
            matched = false; continue;
          }
          score += 10;
        }

        // --- Location ---
        if (params.locationTerms && params.locationTerms.length > 0) {
          const locName = (entry.locationName || '').toLowerCase();
          const locMatch = params.locationTerms.some((term) =>
            locName.includes(term.toLowerCase()) ||
            entry.labels.some((l) => l.toLowerCase().includes(term.toLowerCase()))
          );
          if (!locMatch) { matched = false; continue; }
          score += 20;
        }

        // --- Scene attributes ---
        if (params.sceneFilters && params.sceneFilters.length > 0) {
          const attrMatch = params.sceneFilters.every((filter) => {
            const val = entry.sceneAttributes[filter.field];
            if (Array.isArray(val)) return val.includes(filter.value);
            return val === filter.value;
          });
          if (!attrMatch) { matched = false; continue; }
          score += 15;
        }

        // --- Face attributes ---
        if (params.faceFilters && params.faceFilters.length > 0) {
          if (entry.faces.length === 0) { matched = false; continue; }
          const faceMatch = params.faceFilters.every((filter) =>
            entry.faces.some((face) => {
              const attrs = face.attributes || {};
              return (attrs as any)[filter.field]?.toString() === filter.value;
            })
          );
          if (!faceMatch) { matched = false; continue; }
          score += 15;
        }

        // --- Keyword/label matching ---
        if (params.keywords && params.keywords.length > 0) {
          const labelStr = entry.labels.join(' ').toLowerCase();
          const nameStr = entry.name.toLowerCase();
          const kwMatch = params.keywords.some((kw) =>
            labelStr.includes(kw) || nameStr.includes(kw)
          );
          if (!kwMatch) { matched = false; continue; }
          score += 10;
        }

        // If no filters specified at all, include everything
        if (
          !params.personIds?.length &&
          !params.dateRange &&
          !params.locationTerms?.length &&
          !params.sceneFilters?.length &&
          !params.faceFilters?.length &&
          !params.keywords?.length
        ) {
          matched = false;
        }

        if (matched) {
          results.push({ fileId: entry.id, score });
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get sync status — when was the index last updated and how many entries.
 */
export async function getIndexStatus(): Promise<{
  lastSync: number | null;
  entryCount: number;
}> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, META_STORE], 'readonly');

    const metaStore = tx.objectStore(META_STORE);
    const countReq = tx.objectStore(STORE_NAME).count();

    return new Promise((resolve) => {
      const metaReq = metaStore.get('lastSync');

      let lastSync: number | null = null;
      let entryCount = 0;

      metaReq.onsuccess = () => {
        lastSync = metaReq.result?.value || null;
      };

      countReq.onsuccess = () => {
        entryCount = countReq.result;
      };

      tx.oncomplete = () => resolve({ lastSync, entryCount });
      tx.onerror = () => resolve({ lastSync: null, entryCount: 0 });
    });
  } catch {
    return { lastSync: null, entryCount: 0 };
  }
}

/**
 * Clear the local search index (e.g., on logout).
 */
export async function clearSearchIndex(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  tx.objectStore(META_STORE).clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
