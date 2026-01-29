import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
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
  uploadQuality: 'original' | 'high' | 'medium';
}

interface SyncContextType {
  isSyncing: boolean;
  syncProgress: number;
  pendingCount: number;
  settings: SyncSettings;
  startSync: () => Promise<void>;
  stopSync: () => void;
  updateSettings: (settings: Partial<SyncSettings>) => Promise<void>;
  getQueuedPhotos: () => Promise<MediaLibrary.Asset[]>;
}

const defaultSettings: SyncSettings = {
  syncMode: 'wifi_only',
  autoBackup: true,
  uploadQuality: 'original',
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Register background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync task running...');
    // Perform background sync
    const syncState = await loadSyncState();
    const settings = await loadSyncSettings();

    if (!settings.autoBackup) {
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

    // Sync pending uploads
    if (syncState.pendingUploads.length > 0) {
      // Upload logic would go here
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

  // Load state and settings on mount
  useEffect(() => {
    (async () => {
      const loadedState = await loadSyncState();
      const loadedSettings = await loadSyncSettings();
      setSyncState(loadedState);
      setSettings(loadedSettings);
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

  // Find new photos to upload
  const findNewPhotos = async (): Promise<MediaLibrary.Asset[]> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      return [];
    }

    // Get all photos
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: ['photo', 'video'],
      sortBy: [MediaLibrary.SortBy.creationTime],
      first: 1000,
    });

    // Filter out already uploaded ones
    const newAssets = assets.filter(
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

  const pendingCount = syncState.pendingUploads.length;

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncProgress,
        pendingCount,
        settings,
        startSync,
        stopSync,
        updateSettings,
        getQueuedPhotos,
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
