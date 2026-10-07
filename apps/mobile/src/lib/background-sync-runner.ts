/**
 * Background sync runner — the single, React-free sync engine.
 *
 * One `runSyncPass()` uploads every not-yet-backed-up device photo/video AND
 * every file in the user's synced document folders to Wasabi (via the web
 * API), looping until nothing is pending or it's told to stop. It reads the
 * auth token from SecureStore and settings/state from AsyncStorage, so it runs
 * identically whether it's driven by:
 *   - the in-app foreground kicker (sync-context), or
 *   - the Android foreground service (foreground-sync.ts), which keeps this
 *     looping even after the app UI is swiped away / killed.
 *
 * It reports progress through an optional callback so the foreground-service
 * notification can show "Otpremam 12/340…". It never throws — a failed item is
 * recorded for retry and the loop moves on.
 */
import * as MediaLibrary from 'expo-media-library';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import {
  type SyncSettings,
  loadSyncSettings,
  loadSyncState,
  saveSyncState,
  backgroundFindNewPhotos,
  backgroundUploadAsset,
} from './sync-context';
import {
  loadFolderSyncSettings,
  loadFolderSyncState,
  saveFolderSyncState,
  findUnsyncedFiles,
  uploadFileToMySpace,
} from './folder-sync';

export interface SyncProgress {
  phase: 'photos' | 'files' | 'idle';
  done: number;
  total: number;
}

export interface RunSyncOptions {
  /** Returns true to abort the pass between items (foreground service stop). */
  shouldStop?: () => boolean;
  /** Notification/progress updates. */
  onProgress?: (p: SyncProgress) => void;
  /** Hard ceiling on outer loop iterations so we can never spin forever. */
  maxRounds?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Network policy gate — mirrors startSync()'s rules so the background runner
// respects "WiFi only" / "manual" exactly like the in-app path.
async function networkAllows(settings: SyncSettings): Promise<boolean> {
  if (settings.syncMode === 'manual' || !settings.autoBackup) return false;
  const net = await Network.getNetworkStateAsync();
  if (!net.isConnected) return false;
  if (settings.syncMode === 'wifi_only' && net.type !== Network.NetworkStateType.WIFI) {
    return false;
  }
  return true;
}

async function getAuth(): Promise<{ token: string; apiUrl: string } | null> {
  const token = await SecureStore.getItemAsync('auth_token');
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!token || !apiUrl) return null;
  return { token, apiUrl };
}

// Upload all pending photos/videos (bounded per round so notification progress
// stays responsive). Returns how many were uploaded this round.
async function syncPhotosRound(
  token: string,
  apiUrl: string,
  opts: RunSyncOptions,
): Promise<{ uploaded: number; remaining: number }> {
  const settings = await loadSyncSettings();
  const state = await loadSyncState();
  const pending = await backgroundFindNewPhotos(settings, state);
  if (pending.length === 0) return { uploaded: 0, remaining: 0 };

  const uploadedIds: string[] = [];
  let i = 0;
  for (const asset of pending) {
    if (opts.shouldStop?.()) break;
    opts.onProgress?.({ phase: 'photos', done: i, total: pending.length });
    const ok = await backgroundUploadAsset(asset, token, apiUrl);
    if (ok) uploadedIds.push(asset.id);
    i++;
  }

  if (uploadedIds.length > 0) {
    const fresh = await loadSyncState();
    await saveSyncState({
      ...fresh,
      uploadedAssets: [...fresh.uploadedAssets, ...uploadedIds],
      lastSyncTime: Date.now(),
    });
  }
  return { uploaded: uploadedIds.length, remaining: pending.length - uploadedIds.length };
}

// Upload all pending document-folder files. Returns how many were uploaded.
async function syncFilesRound(
  token: string,
  apiUrl: string,
  opts: RunSyncOptions,
): Promise<{ uploaded: number; remaining: number }> {
  const fsSettings = await loadFolderSyncSettings();
  if (!fsSettings.enabled || fsSettings.folders.length === 0) {
    return { uploaded: 0, remaining: 0 };
  }
  const fsState = await loadFolderSyncState();
  const pending = await findUnsyncedFiles(fsSettings.folders, fsState);
  if (pending.length === 0) return { uploaded: 0, remaining: 0 };

  const folderIdCache = new Map<string, string>();
  const syncedFiles = { ...fsState.syncedFiles };
  let uploaded = 0;
  let i = 0;
  for (const file of pending) {
    if (opts.shouldStop?.()) break;
    opts.onProgress?.({ phase: 'files', done: i, total: pending.length });
    const res = await uploadFileToMySpace(file, token, apiUrl, folderIdCache);
    if (res.success && res.fileId) {
      syncedFiles[file.relativePath] = {
        uri: file.uri,
        remoteFolderId: res.folderId || 'root',
        remoteFileId: res.fileId,
        size: file.size,
        modTime: file.modTime,
        syncedAt: Date.now(),
      };
      uploaded++;
    }
    i++;
  }

  await saveFolderSyncState({ syncedFiles, lastSyncTime: Date.now() });
  return { uploaded, remaining: pending.length - uploaded };
}

/**
 * Run a full sync pass: photos + files, looping until both are drained, the
 * caller asks to stop, or we hit maxRounds. Resolves with totals. Safe to call
 * from anywhere; it self-guards on auth + network policy.
 */
export async function runSyncPass(opts: RunSyncOptions = {}): Promise<{
  photosUploaded: number;
  filesUploaded: number;
  stopped: boolean;
}> {
  const maxRounds = opts.maxRounds ?? 100;
  let photosUploaded = 0;
  let filesUploaded = 0;

  const auth = await getAuth();
  if (!auth) return { photosUploaded, filesUploaded, stopped: true };

  for (let round = 0; round < maxRounds; round++) {
    if (opts.shouldStop?.()) {
      return { photosUploaded, filesUploaded, stopped: true };
    }

    // Re-check network each round so we pause cleanly when WiFi drops.
    const settings = await loadSyncSettings();
    if (!(await networkAllows(settings))) break;

    const photos = await syncPhotosRound(auth.token, auth.apiUrl, opts);
    photosUploaded += photos.uploaded;

    const files = await syncFilesRound(auth.token, auth.apiUrl, opts);
    filesUploaded += files.uploaded;

    // Nothing moved and nothing left → we're drained, stop looping.
    const movedSomething = photos.uploaded > 0 || files.uploaded > 0;
    const stillPending = photos.remaining > 0 || files.remaining > 0;
    if (!movedSomething) break;
    if (!stillPending) break;

    await sleep(500); // brief breather between rounds
  }

  opts.onProgress?.({ phase: 'idle', done: 0, total: 0 });
  return { photosUploaded, filesUploaded, stopped: false };
}
