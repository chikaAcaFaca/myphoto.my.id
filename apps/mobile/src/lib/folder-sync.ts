/**
 * Folder Sync Module for MySpace
 *
 * Scans user-selected device folders and syncs all files to MySpace,
 * preserving folder structure. Uses SAF (Storage Access Framework) on Android.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOLDER_SYNC_STATE_KEY = '@myphoto/folder_sync_state';
const FOLDER_SYNC_SETTINGS_KEY = '@myphoto/folder_sync_settings';

export interface SyncFolder {
  uri: string;       // SAF content URI or file:// path
  name: string;      // Display name
  addedAt: number;   // When the folder was added
}

export interface FolderSyncSettings {
  enabled: boolean;
  folders: SyncFolder[];
}

export interface SyncedFile {
  uri: string;          // Original device URI
  remoteFolderId: string;
  remoteFileId: string;
  size: number;
  modTime: number;      // Last modified timestamp
  syncedAt: number;
}

export interface FolderSyncState {
  syncedFiles: Record<string, SyncedFile>; // key = relative path
  lastSyncTime: number | null;
}

interface DeviceFile {
  uri: string;
  name: string;
  size: number;
  modTime: number;
  isDirectory: boolean;
  relativePath: string; // Path relative to sync root folder
}

const DEFAULT_SETTINGS: FolderSyncSettings = {
  enabled: false,
  folders: [],
};

const DEFAULT_STATE: FolderSyncState = {
  syncedFiles: {},
  lastSyncTime: null,
};

// MIME type detection by extension
const MIME_MAP: Record<string, string> = {
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'text/xml',
  html: 'text/html',
  md: 'text/markdown',
  rtf: 'application/rtf',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  // Video
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',
  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  // Other
  apk: 'application/vnd.android.package-archive',
};

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
}

// ---- Settings persistence ----

export async function loadFolderSyncSettings(): Promise<FolderSyncSettings> {
  try {
    const data = await AsyncStorage.getItem(FOLDER_SYNC_SETTINGS_KEY);
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error loading folder sync settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export async function saveFolderSyncSettings(settings: FolderSyncSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLDER_SYNC_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving folder sync settings:', e);
  }
}

export async function loadFolderSyncState(): Promise<FolderSyncState> {
  try {
    const data = await AsyncStorage.getItem(FOLDER_SYNC_STATE_KEY);
    if (data) return { ...DEFAULT_STATE, ...JSON.parse(data) };
  } catch (e) {
    console.error('Error loading folder sync state:', e);
  }
  return DEFAULT_STATE;
}

export async function saveFolderSyncState(state: FolderSyncState): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLDER_SYNC_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving folder sync state:', e);
  }
}

// ---- Folder picker (SAF on Android) ----

export async function pickFolder(): Promise<SyncFolder | null> {
  try {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) return null;

    const uri = permissions.directoryUri;
    // Extract folder name from URI
    const decoded = decodeURIComponent(uri);
    const parts = decoded.split('/').filter(Boolean);
    const name = parts[parts.length - 1] || 'Folder';

    return {
      uri,
      name,
      addedAt: Date.now(),
    };
  } catch (e) {
    console.error('Error picking folder:', e);
    return null;
  }
}

// ---- Scan folder for files ----

async function scanSAFDirectory(
  dirUri: string,
  rootName: string,
  relativePath: string = '',
): Promise<DeviceFile[]> {
  const files: DeviceFile[] = [];

  try {
    const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(dirUri);

    for (const entryUri of entries) {
      try {
        const info = await FileSystem.getInfoAsync(entryUri);
        const decodedUri = decodeURIComponent(entryUri);
        const nameParts = decodedUri.split('/').filter(Boolean);
        const name = nameParts[nameParts.length - 1] || 'unknown';

        // Skip hidden files
        if (name.startsWith('.')) continue;

        const currentPath = relativePath ? `${relativePath}/${name}` : name;
        const modTime = (info as any).modificationTime || 0;

        if (info.isDirectory) {
          // Recurse into subdirectory
          files.push({
            uri: entryUri,
            name,
            size: 0,
            modTime,
            isDirectory: true,
            relativePath: currentPath,
          });
          const subFiles = await scanSAFDirectory(entryUri, rootName, currentPath);
          files.push(...subFiles);
        } else {
          files.push({
            uri: entryUri,
            name,
            size: (info as any).size || 0,
            modTime,
            isDirectory: false,
            relativePath: currentPath,
          });
        }
      } catch (e) {
        // Skip files we can't access
        console.log('Skipping inaccessible entry:', e);
      }
    }
  } catch (e) {
    console.error('Error scanning directory:', e);
  }

  return files;
}

// ---- Find files that need syncing ----

export async function findUnsyncedFiles(
  folders: SyncFolder[],
  syncState: FolderSyncState,
): Promise<DeviceFile[]> {
  const unsynced: DeviceFile[] = [];

  for (const folder of folders) {
    const files = await scanSAFDirectory(folder.uri, folder.name);

    for (const file of files) {
      if (file.isDirectory) continue;

      const key = `${folder.name}/${file.relativePath}`;
      const existing = syncState.syncedFiles[key];

      // Upload if: never synced, or file modified since last sync
      if (!existing || (file.modTime > 0 && file.modTime > existing.modTime)) {
        unsynced.push({
          ...file,
          relativePath: key, // prefix with folder name for unique path
        });
      }
    }
  }

  return unsynced;
}

// ---- Upload a file to MySpace ----

export async function uploadFileToMySpace(
  file: DeviceFile,
  token: string,
  apiUrl: string,
  folderIdCache: Map<string, string>,
): Promise<{ success: boolean; fileId?: string; folderId?: string }> {
  try {
    const mimeType = getMimeType(file.name);

    // Ensure folder structure exists in MySpace
    const pathParts = file.relativePath.split('/');
    const fileName = pathParts.pop()!;
    const folderPath = pathParts; // Each segment is a folder level

    let parentFolderId = 'root';
    for (const segment of folderPath) {
      const cacheKey = `${parentFolderId}/${segment}`;
      let folderId = folderIdCache.get(cacheKey);

      if (!folderId) {
        const res = await fetch(`${apiUrl}/api/folders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: segment,
            parentId: parentFolderId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          folderId = data.id || data.folderId;
          if (folderId) {
            folderIdCache.set(cacheKey, folderId);
          }
        }
      }

      if (folderId) {
        parentFolderId = folderId;
      }
    }

    // 1. Get presigned URL
    const urlRes = await fetch(`${apiUrl}/api/disk-files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: fileName,
        mimeType,
        size: file.size,
        folderId: parentFolderId,
      }),
    });

    if (!urlRes.ok) return { success: false };
    const { uploadUrl, fileId, s3Key } = await urlRes.json();

    // 2. Upload to S3
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': mimeType },
    });

    if (uploadResult.status !== 200) return { success: false };

    // 3. Confirm upload
    const confirmRes = await fetch(`${apiUrl}/api/disk-files`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        s3Key,
        filename: fileName,
        mimeType,
        size: file.size,
        folderId: parentFolderId,
      }),
    });

    if (!confirmRes.ok) return { success: false };

    return { success: true, fileId, folderId: parentFolderId };
  } catch (e) {
    console.error('Folder sync upload error:', e);
    return { success: false };
  }
}
