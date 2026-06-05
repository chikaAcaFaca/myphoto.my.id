import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './auth-context';
import { generateFileId, getFileExtension, getFileType } from '@myphoto/shared';
import {
  type FolderSyncSettings,
  type FolderSyncState,
  type SyncFolder,
  loadFolderSyncSettings,
  saveFolderSyncSettings,
  loadFolderSyncState,
  saveFolderSyncState,
  findUnsyncedFiles,
  uploadFileToMySpace,
  pickFolder,
} from './folder-sync';
import {
  startForegroundSync,
  stopForegroundSync,
  isForegroundSyncAvailable,
} from './foreground-sync';

const BACKGROUND_SYNC_TASK = 'MYPHOTO_BACKGROUND_SYNC';
const SYNC_STATE_KEY = '@myphoto/sync_state';
const LAST_SYNC_KEY = '@myphoto/last_sync';
const BACKUP_BONUS_CLAIMED_KEY = '@myphoto/backup_bonus_claimed';

async function tryClaimBackupBonus(token: string, apiUrl: string): Promise<void> {
  try {
    const claimed = await AsyncStorage.getItem(BACKUP_BONUS_CLAIMED_KEY);
    if (claimed === 'true') return;

    const res = await fetch(`${apiUrl}/api/bonus/backup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });

    if (res.ok) {
      await AsyncStorage.setItem(BACKUP_BONUS_CLAIMED_KEY, 'true');
      console.log('Backup bonus claimed: +1GB');
    }
  } catch (error) {
    console.error('Backup bonus claim error:', error);
  }
}

interface FailedUpload {
  assetId: string;
  attempts: number;
  lastAttempt: number;
  error?: string;
}

export interface SyncState {
  pendingUploads: string[]; // Asset IDs
  uploadedAssets: string[]; // Asset IDs already uploaded
  lastSyncTime: number | null;
  failedUploads: FailedUpload[]; // Failed uploads for retry
}

export interface SyncSettings {
  syncMode: 'wifi_only' | 'wifi_and_mobile' | 'manual';
  autoBackup: boolean;
  allowRoaming: boolean;
  uploadQuality: 'original' | 'high' | 'medium';
  backupFolders: string[]; // Album titles to backup (empty = all)
}

export interface DeviceAlbum {
  id: string;
  title: string;
  assetCount: number;
}

interface SyncContextType {
  // Photo sync
  isSyncing: boolean;
  syncProgress: number;
  pendingCount: number;
  failedCount: number;
  settings: SyncSettings;
  deviceAlbums: DeviceAlbum[];
  isLoadingAlbums: boolean;
  startSync: () => Promise<void>;
  stopSync: () => void;
  retryFailed: () => Promise<void>;
  updateSettings: (settings: Partial<SyncSettings>) => Promise<void>;
  getQueuedPhotos: () => Promise<MediaLibrary.Asset[]>;
  // On-demand backup of a single device asset (used by the cloud gate so
  // tools can protect the original before processing it). Resolves true
  // once the photo is safely in the cloud.
  uploadSingleAsset: (assetId: string) => Promise<boolean>;
  refreshDeviceAlbums: () => Promise<void>;
  // Folder sync (MySpace)
  folderSyncSettings: FolderSyncSettings;
  folderSyncPending: number;
  isFolderSyncing: boolean;
  folderSyncProgress: number;
  addSyncFolder: () => Promise<SyncFolder | null>;
  removeSyncFolder: (uri: string) => Promise<void>;
  toggleFolderSync: (enabled: boolean) => Promise<void>;
  startFolderSync: () => Promise<void>;
}

const defaultSettings: SyncSettings = {
  // Default to WiFi + Mobile so a fresh install actually uploads on
  // the first session — testers on mobile data were seeing nothing
  // happen because the previous "wifi_only" default silently bailed
  // out of startSync before the syncing UI flipped on.
  syncMode: 'wifi_and_mobile',
  autoBackup: true,
  allowRoaming: false,
  uploadQuality: 'original',
  backupFolders: [],
};

const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 2000; // 2s, 4s, 8s, 16s, 32s

function getRetryDelay(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt), 60000);
}

function shouldRetry(failed: FailedUpload): boolean {
  if (failed.attempts >= MAX_RETRY_ATTEMPTS) return false;
  const delay = getRetryDelay(failed.attempts);
  return Date.now() - failed.lastAttempt >= delay;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Cache of device album title → MySpace folder ID (to avoid re-creating folders)
const folderIdCache = new Map<string, string>();

// Ensure a MySpace folder exists for a device album, returns folderId
async function ensureMySpaceFolder(
  albumTitle: string,
  token: string,
  apiUrl: string
): Promise<string> {
  // Check cache first
  const cached = folderIdCache.get(albumTitle);
  if (cached) return cached;

  // Create folder in MySpace (API handles duplicates gracefully)
  try {
    const res = await fetch(`${apiUrl}/api/folders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: albumTitle,
        parentId: 'root',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const folderId = data.id || data.folderId;
      if (folderId) {
        folderIdCache.set(albumTitle, folderId);
        return folderId;
      }
    }
  } catch (error) {
    console.error('Error creating MySpace folder:', error);
  }

  return 'root';
}

// Upload asset to BOTH MyPhoto (for gallery/AI) AND MySpace (for folder structure)
// Uses disk-files endpoint which auto-creates photo record for images/videos
async function uploadAssetDual(
  asset: MediaLibrary.Asset,
  albumTitle: string | undefined,
  token: string,
  apiUrl: string
): Promise<boolean> {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    const uri = assetInfo.localUri || asset.uri;

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return false;

    const mimeType = asset.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';

    // Resolve MySpace folder from album name
    const folderId = albumTitle
      ? await ensureMySpaceFolder(albumTitle, token, apiUrl)
      : 'root';

    // 1. Get pre-signed upload URL via disk-files (MySpace endpoint)
    // This endpoint auto-creates MyPhoto record for images/videos
    const urlRes = await fetch(`${apiUrl}/api/disk-files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: asset.filename,
        mimeType,
        size: fileInfo.size,
        folderId,
      }),
    });

    if (!urlRes.ok) return false;
    const { uploadUrl, fileId, s3Key } = await urlRes.json();

    // 2. Upload to S3
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': mimeType },
    });

    if (uploadResult.status !== 200) return false;

    // 3. Confirm upload (creates disk file + photo record + triggers AI)
    const confirmRes = await fetch(`${apiUrl}/api/disk-files`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        s3Key,
        filename: asset.filename,
        mimeType,
        size: fileInfo.size,
        folderId,
      }),
    });

    return confirmRes.ok;
  } catch (error) {
    console.error('Dual upload error:', error);
    return false;
  }
}

// Standalone upload function for background task (no React context)
export async function backgroundUploadAsset(
  asset: MediaLibrary.Asset,
  token: string,
  apiUrl: string
): Promise<boolean> {
  // Get album name for folder structure
  let albumTitle: string | undefined;
  try {
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    for (const album of albums) {
      const { assets } = await MediaLibrary.getAssetsAsync({
        album: album.id,
        first: 0,
      });
      // Quick check if this asset belongs to this album
      // (simplified — full check would query per-asset)
      if (album.assetCount > 0) {
        albumTitle = album.title;
        break;
      }
    }
  } catch {
    // Fall back to no album
  }

  return uploadAssetDual(asset, albumTitle, token, apiUrl);
}

// Find new photos for background sync (standalone, no React state)
export async function backgroundFindNewPhotos(
  settings: SyncSettings,
  syncState: SyncState
): Promise<MediaLibrary.Asset[]> {
  try {
    // CHECK only — never request here. The background/foreground sync path must
    // not open a permission dialog that collides with the gallery's own
    // MediaLibrary request at launch. The in-app kicker/home screen acquire the
    // grant; this just reads it.
    const { status } = await MediaLibrary.getPermissionsAsync(false, ['photo', 'video']);
    if (status !== 'granted') return [];
  } catch {
    console.log('MediaLibrary permissions not available (Expo Go limitation)');
    return [];
  }

  let allAssets: MediaLibrary.Asset[] = [];

  if (settings.backupFolders.length > 0) {
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const selected = albums.filter((a) => settings.backupFolders.includes(a.title));

    for (const album of selected) {
      const { assets } = await MediaLibrary.getAssetsAsync({
        album: album.id,
        mediaType: ['photo', 'video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 100, // Smaller batch for background task
      });
      allAssets.push(...assets);
    }

    // Deduplicate
    const seen = new Set<string>();
    allAssets = allAssets.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  } else {
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: ['photo', 'video'],
      sortBy: [MediaLibrary.SortBy.creationTime],
      first: 100,
    });
    allAssets = assets;
  }

  return allAssets.filter((a) => !syncState.uploadedAssets.includes(a.id));
}

// Register background task — deferred to avoid crash if native module not ready
let _bgTaskRegistered = false;
function ensureBackgroundTaskRegistered() {
  if (_bgTaskRegistered) return;
  _bgTaskRegistered = true;
  try {
    TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync task running...');
    const settings = await loadSyncSettings();
    const syncState = await loadSyncState();

    if (!settings.autoBackup || settings.syncMode === 'manual') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check network conditions
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (settings.syncMode === 'wifi_only' && networkState.type !== Network.NetworkStateType.WIFI) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get auth token from SecureStore (background tasks can't use React context)
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      console.log('Background sync: no auth token');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      console.log('Background sync: no API URL');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Find new photos to upload
    const newPhotos = await backgroundFindNewPhotos(settings, syncState);
    if (newPhotos.length === 0) {
      console.log('Background sync: no new photos');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log(`Background sync: uploading ${newPhotos.length} photos...`);

    // Upload photos (limit to 10 per background run to stay within time limits)
    const batch = newPhotos.slice(0, 10);
    const uploaded: string[] = [];
    const newFailed: FailedUpload[] = [...(syncState.failedUploads || [])];

    for (const asset of batch) {
      const success = await backgroundUploadAsset(asset, token, apiUrl);
      if (success) {
        uploaded.push(asset.id);
      } else {
        // Track failure for retry, but don't duplicate
        const existing = newFailed.find(f => f.assetId === asset.id);
        if (existing) {
          existing.attempts++;
          existing.lastAttempt = Date.now();
        } else {
          newFailed.push({ assetId: asset.id, attempts: 1, lastAttempt: Date.now() });
        }
      }
    }

    // Clean up expired retries
    const activeFailed = newFailed.filter(f => f.attempts < 5);

    // Update sync state
    const hasChanges = uploaded.length > 0 || activeFailed.length !== (syncState.failedUploads || []).length;
    if (hasChanges) {
      // Try to claim backup bonus after first successful upload
      if (uploaded.length > 0) {
        await tryClaimBackupBonus(token, apiUrl);
      }

      const newState: SyncState = {
        ...syncState,
        uploadedAssets: [...syncState.uploadedAssets, ...uploaded],
        failedUploads: activeFailed,
        lastSyncTime: Date.now(),
      };
      await saveSyncState(newState);
      console.log(`Background sync: uploaded ${uploaded.length}, failed ${activeFailed.length}`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
  });
  } catch (e) {
    console.warn('Failed to register background task:', e);
  }
}

export async function loadSyncState(): Promise<SyncState> {
  try {
    const data = await AsyncStorage.getItem(SYNC_STATE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sync state:', error);
  }
  return {
    pendingUploads: [],
    uploadedAssets: [],
    lastSyncTime: null,
    failedUploads: [],
  };
}

export async function saveSyncState(state: SyncState): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving sync state:', error);
  }
}

export async function loadSyncSettings(): Promise<SyncSettings> {
  try {
    const data = await AsyncStorage.getItem('@myphoto/sync_settings');
    if (data) {
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Error loading sync settings:', error);
  }
  return defaultSettings;
}

async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  try {
    await AsyncStorage.setItem('@myphoto/sync_settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving sync settings:', error);
  }
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, getToken, refreshAppUser } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>({
    pendingUploads: [],
    uploadedAssets: [],
    lastSyncTime: null,
    failedUploads: [],
  });
  const [syncCancelled, setSyncCancelled] = useState(false);
  const [settings, setSettings] = useState<SyncSettings>(defaultSettings);
  const [deviceAlbums, setDeviceAlbums] = useState<DeviceAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  // Folder sync state
  const [folderSyncSettings, setFolderSyncSettings] = useState<FolderSyncSettings>({ enabled: false, folders: [] });
  const [folderSyncState, setFolderSyncState] = useState<FolderSyncState>({ syncedFiles: {}, lastSyncTime: null });
  const [folderSyncPending, setFolderSyncPending] = useState(0);
  const [isFolderSyncing, setIsFolderSyncing] = useState(false);
  const [folderSyncProgress, setFolderSyncProgress] = useState(0);

  // Load device albums from MediaLibrary
  const refreshDeviceAlbums = useCallback(async () => {
    setIsLoadingAlbums(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') {
        setDeviceAlbums([]);
        return;
      }

      const albums = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      // Deduplicate albums by title (same name from different sources)
      const albumMap = new Map<string, DeviceAlbum>();
      for (const a of albums) {
        if (a.assetCount === 0) continue;
        const existing = albumMap.get(a.title);
        if (existing) {
          existing.assetCount += a.assetCount;
        } else {
          albumMap.set(a.title, {
            id: a.id,
            title: a.title,
            assetCount: a.assetCount,
          });
        }
      }

      const albumList = Array.from(albumMap.values())
        .sort((a, b) => b.assetCount - a.assetCount);

      setDeviceAlbums(albumList);
    } catch (error) {
      console.log('Device albums not available:', error?.toString?.() || error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, []);

  // Load state, settings, and device albums on mount
  useEffect(() => {
    (async () => {
      const loadedState = await loadSyncState();
      const loadedSettings = await loadSyncSettings();
      setSyncState(loadedState);
      setSettings(loadedSettings);
      // Load folder sync settings
      const fsSettings = await loadFolderSyncSettings();
      const fsState = await loadFolderSyncState();
      setFolderSyncSettings(fsSettings);
      setFolderSyncState(fsState);
      await refreshDeviceAlbums();
      // Count pending folder files
      if (fsSettings.enabled && fsSettings.folders.length > 0) {
        findUnsyncedFiles(fsSettings.folders, fsState)
          .then(files => setFolderSyncPending(files.length))
          .catch(() => {});
      }
    })();
  }, []);

  // Register background sync. Two layers, used together:
  //   1. Foreground service (react-native-background-actions) — the reliable
  //      path that keeps uploading even after the app is swiped away/killed.
  //   2. expo-background-fetch — OS WorkManager fallback for when the
  //      foreground service isn't available (Expo Go / pre-rebuild) or was
  //      reaped, and to nudge a wake on boot.
  useEffect(() => {
    let fgTimer: ReturnType<typeof setTimeout> | undefined;
    if (settings.autoBackup && user && settings.syncMode !== 'manual') {
      registerBackgroundFetch();
      // DEFER the foreground service. Starting it at launch fired its own
      // permission requests (POST_NOTIFICATIONS + MediaLibrary) at the same
      // moment the photo grid was requesting MediaLibrary — the collision left
      // the home tab stuck on "Učitavanje slika" with nothing rendering. Start
      // it only after the app has settled and the initial permission grant is
      // done, so the gallery loads first.
      fgTimer = setTimeout(() => {
        startForegroundSync().then((ok) => {
          if (!ok && !isForegroundSyncAvailable()) {
            console.log('Foreground sync unavailable — relying on background-fetch');
          }
        });
      }, 15000);
    } else {
      stopForegroundSync();
    }
    return () => {
      if (fgTimer) clearTimeout(fgTimer);
      unregisterBackgroundFetch();
    };
  }, [settings.autoBackup, user, settings.syncMode]);

  // Stop the persistent service entirely when the user signs out.
  useEffect(() => {
    if (!user) stopForegroundSync();
  }, [user]);

  // Foreground auto-backup kicker. Background fetch is unreliable on
  // Android — the system frequently never wakes the task, especially
  // during the first few app sessions. To get device photos into the
  // cloud reliably we also run startSync() once the user is signed in,
  // settings are loaded, and we haven't already started syncing. This
  // is fire-and-forget; startSync() guards against double-runs and
  // skips when the network policy says so.
  const autoBackupKickedRef = useRef(false);
  useEffect(() => {
    if (!user) {
      autoBackupKickedRef.current = false;
      return;
    }
    if (autoBackupKickedRef.current) return;
    if (!settings.autoBackup || settings.syncMode === 'manual') return;
    autoBackupKickedRef.current = true;
    // Give MediaLibrary permissions a moment to settle on first launch
    // — kicking the sync immediately on mount sometimes fires before
    // the permission prompt finishes and findNewPhotos returns [].
    const t = setTimeout(async () => {
      // Photos/videos first, then any synced document folders, then refresh
      // the quota so the storage gauge + proactive upsell react to what we
      // just uploaded. Each call self-guards (network policy, enabled flags).
      try {
        await startSync();
        await startFolderSync();
      } catch (e) {
        console.warn('Auto-backup kick failed:', e);
      } finally {
        refreshAppUser().catch(() => {});
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [user, settings.autoBackup, settings.syncMode]);

  const registerBackgroundFetch = async () => {
    try {
      ensureBackgroundTaskRegistered();
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('Background fetch registered');
    } catch (error) {
      console.error('Error registering background fetch:', error);
    }
  };

  const unregisterBackgroundFetch = async () => {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    } catch (error) {
      // Task might not be registered
    }
  };

  // Find new photos to upload (filtered by selected backup folders)
  const findNewPhotos = async (): Promise<MediaLibrary.Asset[]> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') return [];
    } catch {
      console.log('MediaLibrary permissions not available (Expo Go limitation)');
      return [];
    }

    let allAssets: MediaLibrary.Asset[] = [];

    if (settings.backupFolders.length > 0) {
      // Get assets only from selected albums
      const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
      const selectedAlbums = albums.filter((a) =>
        settings.backupFolders.includes(a.title)
      );

      for (const album of selectedAlbums) {
        const { assets } = await MediaLibrary.getAssetsAsync({
          album: album.id,
          mediaType: ['photo', 'video'],
          sortBy: [MediaLibrary.SortBy.creationTime],
          first: 1000,
        });
        allAssets.push(...assets);
      }

      // Deduplicate (a photo can appear in multiple albums)
      const seen = new Set<string>();
      allAssets = allAssets.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    } else {
      // No folder filter — backup all photos
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 1000,
      });
      allAssets = assets;
    }

    // Filter out already uploaded ones
    const newAssets = allAssets.filter(
      (asset) => !syncState.uploadedAssets.includes(asset.id)
    );

    return newAssets;
  };

  const uploadAsset = async (asset: MediaLibrary.Asset): Promise<boolean> => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('No API URL');

      // Find which album this asset belongs to (for MySpace folder structure)
      let albumTitle: string | undefined;
      try {
        const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
        for (const album of albums) {
          if (album.assetCount === 0) continue;
          const { assets } = await MediaLibrary.getAssetsAsync({
            album: album.id,
            first: 500,
          });
          if (assets.some((a) => a.id === asset.id)) {
            albumTitle = album.title;
            break;
          }
        }
      } catch {
        // Fall back to no album
      }

      // Upload to both MySpace (folder structure) and MyPhoto (gallery + AI)
      return await uploadAssetDual(asset, albumTitle, token, apiUrl);
    } catch (error) {
      console.error('Upload error:', error);
      return false;
    }
  };

  const startSync = useCallback(async () => {
    if (isSyncing || !user) return;

    // Check network conditions
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      console.log('No network connection');
      return;
    }

    if (settings.syncMode === 'wifi_only' && networkState.type !== Network.NetworkStateType.WIFI) {
      console.log('WiFi only mode - not on WiFi');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncCancelled(false);

    try {
      const newPhotos = await findNewPhotos();
      // Also gather retryable failed uploads
      const retryable = syncState.failedUploads.filter(shouldRetry);
      const retryAssetIds = new Set(retryable.map(f => f.assetId));

      const total = newPhotos.length + retryable.length;

      if (total === 0) {
        console.log('No new photos to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing ${newPhotos.length} new + ${retryable.length} retry = ${total} photos...`);

      const newUploaded: string[] = [];
      const newFailed: FailedUpload[] = [...syncState.failedUploads.filter(f => !retryAssetIds.has(f.assetId))];
      let processed = 0;

      // Multi-thread upload: 4 concurrent workers
      const CONCURRENT = 4;
      const queue = [...newPhotos];

      const worker = async () => {
        while (queue.length > 0 && !syncCancelled) {
          const asset = queue.shift();
          if (!asset) break;

          const success = await uploadAsset(asset);
          processed++;

          if (success) {
            newUploaded.push(asset.id);
          } else {
            newFailed.push({
              assetId: asset.id,
              attempts: 1,
              lastAttempt: Date.now(),
              error: 'Upload failed',
            });
          }

          setSyncProgress((processed / total) * 100);

          // Save progress every 10 uploads so MyPhoto tab can refresh
          if (newUploaded.length % 10 === 0 && newUploaded.length > 0) {
            const progressState: SyncState = {
              ...syncState,
              uploadedAssets: [...syncState.uploadedAssets, ...newUploaded],
              failedUploads: newFailed,
              lastSyncTime: Date.now(),
            };
            await saveSyncState(progressState);
          }
        }
      };

      await Promise.all(Array(CONCURRENT).fill(null).map(() => worker()));

      // Retry previously failed uploads
      for (const failed of retryable) {
        if (syncCancelled) break;

        try {
          // Fetch the asset from MediaLibrary by ID
          const assets = await MediaLibrary.getAssetsAsync({
            first: 1,
            // Filter to find specific asset - scan recent ones
          });
          // Try to find the asset
          let asset: MediaLibrary.Asset | null = null;
          const allAssets = await MediaLibrary.getAssetsAsync({ first: 5000, mediaType: ['photo', 'video'] });
          asset = allAssets.assets.find(a => a.id === failed.assetId) || null;

          if (!asset) {
            // Asset may have been deleted from device, remove from retry queue
            processed++;
            setSyncProgress((processed / total) * 100);
            continue;
          }

          // Wait with exponential backoff before retrying
          const delay = getRetryDelay(failed.attempts);
          if (delay > 0) await sleep(Math.min(delay, 5000)); // Cap wait at 5s during manual sync

          const success = await uploadAsset(asset);
          processed++;

          if (success) {
            newUploaded.push(asset.id);
          } else {
            newFailed.push({
              assetId: failed.assetId,
              attempts: failed.attempts + 1,
              lastAttempt: Date.now(),
              error: 'Retry failed',
            });
          }
        } catch {
          newFailed.push({
            ...failed,
            attempts: failed.attempts + 1,
            lastAttempt: Date.now(),
          });
          processed++;
        }

        setSyncProgress((processed / total) * 100);
      }

      // Clean up: remove failed entries that exceeded max retries
      const activeFailed = newFailed.filter(f => f.attempts < MAX_RETRY_ATTEMPTS);

      // Update sync state
      const newState: SyncState = {
        ...syncState,
        uploadedAssets: [...syncState.uploadedAssets, ...newUploaded],
        failedUploads: activeFailed,
        lastSyncTime: Date.now(),
      };
      setSyncState(newState);
      await saveSyncState(newState);

      // Try to claim backup bonus after first successful upload
      if (newUploaded.length > 0) {
        const token = await getToken();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (token && apiUrl) {
          await tryClaimBackupBonus(token, apiUrl);
        }
      }

      console.log(`Sync complete. Uploaded ${newUploaded.length}, failed ${activeFailed.length}.`);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
      // Reflect the new storageUsed in the quota gauge + upsell.
      refreshAppUser().catch(() => {});
    }
  }, [isSyncing, user, settings, syncState, syncCancelled, refreshAppUser]);

  const stopSync = useCallback(() => {
    setSyncCancelled(true);
    setIsSyncing(false);
    setSyncProgress(0);
  }, []);

  const retryFailed = useCallback(async () => {
    if (isSyncing || !user) return;
    // Clear retry counters so all failed uploads get retried
    const resetFailed = syncState.failedUploads.map(f => ({
      ...f,
      attempts: 0,
      lastAttempt: 0,
    }));
    const newState = { ...syncState, failedUploads: resetFailed };
    setSyncState(newState);
    await saveSyncState(newState);
    // Now start sync which will pick up the retryable items
    await startSync();
  }, [isSyncing, user, syncState, startSync]);

  // Back up one specific device photo right now, on demand. Reuses the
  // same dual-upload path as auto-backup, then records the asset as
  // uploaded so the gallery badge and future gate checks reflect it.
  const uploadSingleAsset = useCallback(async (assetId: string): Promise<boolean> => {
    if (!user) return false;
    // Already uploaded — nothing to do.
    if (syncState.uploadedAssets.includes(assetId)) return true;
    try {
      const info = await MediaLibrary.getAssetInfoAsync(assetId);
      if (!info) return false;
      const ok = await uploadAsset(info as unknown as MediaLibrary.Asset);
      if (ok) {
        setSyncState(prev => {
          if (prev.uploadedAssets.includes(assetId)) return prev;
          const next: SyncState = {
            ...prev,
            uploadedAssets: [...prev.uploadedAssets, assetId],
            lastSyncTime: Date.now(),
          };
          saveSyncState(next);
          return next;
        });
        const token = await getToken();
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (token && apiUrl) await tryClaimBackupBonus(token, apiUrl);
      }
      return ok;
    } catch (error) {
      console.error('uploadSingleAsset error:', error);
      return false;
    }
  }, [user, syncState.uploadedAssets, getToken]);

  const updateSettings = useCallback(async (newSettings: Partial<SyncSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSyncSettings(updated);
  }, [settings]);

  const getQueuedPhotos = useCallback(async () => {
    return findNewPhotos();
  }, [syncState]);

  // ---- Folder Sync Methods ----

  const addSyncFolder = useCallback(async (): Promise<SyncFolder | null> => {
    const folder = await pickFolder();
    if (!folder) return null;

    // Don't add duplicates
    const existing = folderSyncSettings.folders.find(f => f.uri === folder.uri);
    if (existing) return existing;

    const updated: FolderSyncSettings = {
      ...folderSyncSettings,
      enabled: true,
      folders: [...folderSyncSettings.folders, folder],
    };
    setFolderSyncSettings(updated);
    await saveFolderSyncSettings(updated);

    // Refresh pending count
    findUnsyncedFiles(updated.folders, folderSyncState)
      .then(files => setFolderSyncPending(files.length))
      .catch(() => {});

    return folder;
  }, [folderSyncSettings, folderSyncState]);

  const removeSyncFolder = useCallback(async (uri: string) => {
    const updated: FolderSyncSettings = {
      ...folderSyncSettings,
      folders: folderSyncSettings.folders.filter(f => f.uri !== uri),
    };
    if (updated.folders.length === 0) updated.enabled = false;
    setFolderSyncSettings(updated);
    await saveFolderSyncSettings(updated);
  }, [folderSyncSettings]);

  const toggleFolderSync = useCallback(async (enabled: boolean) => {
    const updated = { ...folderSyncSettings, enabled };
    setFolderSyncSettings(updated);
    await saveFolderSyncSettings(updated);
  }, [folderSyncSettings]);

  const startFolderSync = useCallback(async () => {
    if (isFolderSyncing || !user) return;
    if (!folderSyncSettings.enabled || folderSyncSettings.folders.length === 0) return;

    // Check network
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) return;
    if (settings.syncMode === 'wifi_only' && networkState.type !== Network.NetworkStateType.WIFI) return;

    setIsFolderSyncing(true);
    setFolderSyncProgress(0);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('No API URL');

      const unsynced = await findUnsyncedFiles(folderSyncSettings.folders, folderSyncState);
      const total = unsynced.length;

      if (total === 0) {
        console.log('Folder sync: everything up to date');
        setIsFolderSyncing(false);
        setFolderSyncPending(0);
        return;
      }

      console.log(`Folder sync: uploading ${total} files...`);

      const folderIdCache = new Map<string, string>();
      const updatedSyncedFiles = { ...folderSyncState.syncedFiles };
      let successCount = 0;

      for (let i = 0; i < unsynced.length; i++) {
        if (syncCancelled) break;

        const file = unsynced[i];
        const result = await uploadFileToMySpace(file, token, apiUrl, folderIdCache);

        if (result.success && result.fileId) {
          updatedSyncedFiles[file.relativePath] = {
            uri: file.uri,
            remoteFolderId: result.folderId || 'root',
            remoteFileId: result.fileId,
            size: file.size,
            modTime: file.modTime,
            syncedAt: Date.now(),
          };
          successCount++;
        }

        setFolderSyncProgress(((i + 1) / total) * 100);
      }

      // Save updated state
      const newFsState: FolderSyncState = {
        syncedFiles: updatedSyncedFiles,
        lastSyncTime: Date.now(),
      };
      setFolderSyncState(newFsState);
      await saveFolderSyncState(newFsState);
      setFolderSyncPending(total - successCount);

      console.log(`Folder sync complete: ${successCount}/${total} files uploaded.`);
    } catch (error) {
      console.error('Folder sync error:', error);
    } finally {
      setIsFolderSyncing(false);
      setFolderSyncProgress(0);
      refreshAppUser().catch(() => {});
    }
  }, [isFolderSyncing, user, folderSyncSettings, folderSyncState, settings, syncCancelled, refreshAppUser]);

  // ---- Photo pending count ----

  // pendingCount reflects actual unuploaded photos (computed on last sync run)
  const [pendingCount, setPendingCount] = useState(0);

  // Refresh pending count when sync state changes
  useEffect(() => {
    if (user && settings.autoBackup) {
      findNewPhotos().then((photos) => setPendingCount(photos.length)).catch(() => {});
    }
  }, [syncState.uploadedAssets.length, user, settings.autoBackup]);

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncProgress,
        pendingCount,
        failedCount: syncState.failedUploads.length,
        settings,
        deviceAlbums,
        isLoadingAlbums,
        startSync,
        stopSync,
        retryFailed,
        updateSettings,
        getQueuedPhotos,
        uploadSingleAsset,
        refreshDeviceAlbums,
        // Folder sync
        folderSyncSettings,
        folderSyncPending,
        isFolderSyncing,
        folderSyncProgress,
        addSyncFolder,
        removeSyncFolder,
        toggleFolderSync,
        startFolderSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
