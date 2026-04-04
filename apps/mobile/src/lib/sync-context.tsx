import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from './auth-context';
import { generateFileId, getFileExtension, getFileType } from '@myphoto/shared';

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

interface SyncState {
  pendingUploads: string[]; // Asset IDs
  uploadedAssets: string[]; // Asset IDs already uploaded
  lastSyncTime: number | null;
}

interface SyncSettings {
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
  isSyncing: boolean;
  syncProgress: number;
  pendingCount: number;
  settings: SyncSettings;
  deviceAlbums: DeviceAlbum[];
  isLoadingAlbums: boolean;
  startSync: () => Promise<void>;
  stopSync: () => void;
  updateSettings: (settings: Partial<SyncSettings>) => Promise<void>;
  getQueuedPhotos: () => Promise<MediaLibrary.Asset[]>;
  refreshDeviceAlbums: () => Promise<void>;
}

const defaultSettings: SyncSettings = {
  syncMode: 'wifi_only',
  autoBackup: true,
  allowRoaming: false,
  uploadQuality: 'original',
  backupFolders: [],
};

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
async function backgroundUploadAsset(
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
async function backgroundFindNewPhotos(
  settings: SyncSettings,
  syncState: SyncState
): Promise<MediaLibrary.Asset[]> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
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

// Register background task (wrapped in try-catch to prevent crash on init)
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

    for (const asset of batch) {
      const success = await backgroundUploadAsset(asset, token, apiUrl);
      if (success) {
        uploaded.push(asset.id);
      }
    }

    // Update sync state
    if (uploaded.length > 0) {
      // Try to claim backup bonus after first successful upload
      await tryClaimBackupBonus(token, apiUrl);

      const newState: SyncState = {
        ...syncState,
        uploadedAssets: [...syncState.uploadedAssets, ...uploaded],
        lastSyncTime: Date.now(),
      };
      await saveSyncState(newState);
      console.log(`Background sync: uploaded ${uploaded.length} photos`);
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

async function loadSyncState(): Promise<SyncState> {
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
  };
}

async function saveSyncState(state: SyncState): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving sync state:', error);
  }
}

async function loadSyncSettings(): Promise<SyncSettings> {
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
  const { user, getToken } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncState, setSyncState] = useState<SyncState>({
    pendingUploads: [],
    uploadedAssets: [],
    lastSyncTime: null,
  });
  const [settings, setSettings] = useState<SyncSettings>(defaultSettings);
  const [deviceAlbums, setDeviceAlbums] = useState<DeviceAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);

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

      const albumList: DeviceAlbum[] = albums
        .filter((a) => a.assetCount > 0)
        .sort((a, b) => b.assetCount - a.assetCount)
        .map((a) => ({
          id: a.id,
          title: a.title,
          assetCount: a.assetCount,
        }));

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
      await refreshDeviceAlbums();
    })();
  }, []);

  // Register background fetch
  useEffect(() => {
    if (settings.autoBackup && user) {
      registerBackgroundFetch();
    }
    return () => {
      unregisterBackgroundFetch();
    };
  }, [settings.autoBackup, user]);

  const registerBackgroundFetch = async () => {
    try {
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

    // Block upload on cellular if roaming is not allowed
    if (
      networkState.type === Network.NetworkStateType.CELLULAR &&
      !settings.allowRoaming
    ) {
      console.log('Cellular connection - roaming upload disabled');
      // Note: Full roaming detection requires native carrier API
      // This serves as a user-controlled safety toggle
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      const newPhotos = await findNewPhotos();
      const total = newPhotos.length;

      if (total === 0) {
        console.log('No new photos to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`Syncing ${total} photos...`);

      const newUploaded: string[] = [];

      for (let i = 0; i < newPhotos.length; i++) {
        const asset = newPhotos[i];
        const success = await uploadAsset(asset);

        if (success) {
          newUploaded.push(asset.id);
        }

        setSyncProgress(((i + 1) / total) * 100);
      }

      // Update sync state
      const newState: SyncState = {
        ...syncState,
        uploadedAssets: [...syncState.uploadedAssets, ...newUploaded],
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

      console.log(`Sync complete. Uploaded ${newUploaded.length} photos.`);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  }, [isSyncing, user, settings, syncState]);

  const stopSync = useCallback(() => {
    setIsSyncing(false);
    setSyncProgress(0);
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<SyncSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSyncSettings(updated);
  }, [settings]);

  const getQueuedPhotos = useCallback(async () => {
    return findNewPhotos();
  }, [syncState]);

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
        settings,
        deviceAlbums,
        isLoadingAlbums,
        startSync,
        stopSync,
        updateSettings,
        getQueuedPhotos,
        refreshDeviceAlbums,
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
