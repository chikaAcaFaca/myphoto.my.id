const DB_NAME = 'myphoto-uploads';
const DB_VERSION = 2;

export interface QueuedUpload {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileBlob: Blob;
  authToken: string;
  queuedAt: number;
  needsTokenRefresh?: boolean;
}

export interface SyncSettings {
  syncMode: 'wifi_only' | 'wifi_and_mobile' | 'manual';
  allowRoaming: boolean;
  autoBackup: boolean;
}

export function openUploadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-uploads')) {
        db.createObjectStore('pending-uploads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueFileForUpload(file: File, authToken: string): Promise<boolean> {
  if (!('indexedDB' in window)) return false;

  try {
    const db = await openUploadDB();
    const tx = db.transaction('pending-uploads', 'readwrite');
    const store = tx.objectStore('pending-uploads');
    store.add({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileBlob: file,
      authToken,
      queuedAt: Date.now(),
    } satisfies QueuedUpload);
    return true;
  } catch {
    return false;
  }
}

export async function syncSettingsToIDB(settings: Partial<SyncSettings>): Promise<void> {
  try {
    const db = await openUploadDB();
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    store.put({ key: 'sync', ...settings });
  } catch {
    // Non-fatal
  }
}

export async function requestBackgroundSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await (reg as any).sync.register('sync-uploads');
    }
  } catch {
    // Background sync not supported or failed
  }
}

export async function refreshStaleTokens(newToken: string): Promise<boolean> {
  try {
    const db = await openUploadDB();
    const tx = db.transaction('pending-uploads', 'readwrite');
    const store = tx.objectStore('pending-uploads');
    const items: QueuedUpload[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    let updated = false;
    for (const item of items) {
      if (item.needsTokenRefresh) {
        item.authToken = newToken;
        item.needsTokenRefresh = false;
        store.put(item);
        updated = true;
      }
    }

    return updated;
  } catch {
    return false;
  }
}
