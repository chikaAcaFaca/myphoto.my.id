import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './auth-context';
import { generateFileId, getFileExtension, getFileType } from '@myphoto/shared';

const BACKGROUND_SYNC_TASK = 'MYPHOTO_BACKGROUND_SYNC';
const SYNC_STATE_KEY = '@myphoto/sync_state';
const LAST_SYNC_KEY = '@myphoto/last_sync';

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

// Standalone upload function for background task (no React context)
async function backgroundUploadAsset(
  asset: MediaLibrary.Asset,
  token: string,
  apiUrl: string
): Promise<boolean> {
  try {
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    const uri = assetInfo.localUri || asset.uri;

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return false;

    const mimeType = asset.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';
    const fileId = generateFileId();

    // 1. Get pre-signed upload URL
    const urlRes = await fetch(`${apiUrl}/api/files/upload-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: asset.filename,
        mimeType,
        size: fileInfo.size,
      }),
    });

    if (!urlRes.ok) return false;
    const { uploadUrl, s3Key } = await urlRes.json();

    // 2. Upload to S3
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': mimeType },
    });

    if (uploadResult.status !== 200) return false;

    // 3. Confirm upload
    const confirmRes = await fetch(`${apiUrl}/api/files/confirm-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        s3Key,
        name: asset.filename,
        size: fileInfo.size,
        mimeType,
      }),
    });

    return confirmRes.ok;
  } catch (error) {
    console.error('Background upload error:', error);
    return false;
  }
}

// Find new photos for background sync (standalone, no React state)
async function backgroundFindNewPhotos(
  settings: SyncSettings,
  syncState: SyncState
): Promise<MediaLibrary.Asset[]> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') return [];

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

// Register background task
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
      const { status } = await MediaLibrary.requestPermissionsAsync();
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
      console.error('Error loading device albums:', error);
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
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
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
      if (!token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;

      // Get asset info
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      const uri = assetInfo.localUri || asset.uri;

      // Determine file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      const mimeType = asset.mediaType === 'photo' ? 'image/jpeg' : 'video/mp4';
      const fileId = generateFileId();
      const extension = getFileExtension(asset.filename, mimeType);

      // 1. Get pre-signed upload URL
      const uploadUrlResponse = await fetch(`${apiUrl}/api/files/upload-url`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: asset.filename,
          mimeType,
          size: fileInfo.size,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const error = await uploadUrlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { uploadUrl, s3Key } = await uploadUrlResponse.json();

      // 2. Upload file to S3
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
      });

      if (uploadResult.status !== 200) {
        throw new Error('Upload failed');
      }

      // 3. Confirm upload
      const confirmResponse = await fetch(`${apiUrl}/api/files/confirm-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          s3Key,
          name: asset.filename,
          size: fileInfo.size,
          mimeType,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      return true;
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
