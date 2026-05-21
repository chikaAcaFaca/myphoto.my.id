/**
 * Cloud Download — download files from cloud (Wasabi S3) to device.
 * Enables multi-device sync: files uploaded from one device
 * can be downloaded to another.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export interface CloudFile {
  id: string;
  name: string;
  s3Key: string;
  mimeType: string;
  size: number;
  type: string;
  smallThumbUrl?: string;
  thumbnailUrl?: string;
}

/**
 * Get a presigned download URL for a file
 */
export async function getDownloadUrl(s3Key: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/files/download-url`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3Key }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.downloadUrl || null;
  } catch {
    return null;
  }
}

/**
 * Download a file from cloud to device storage.
 * For images/videos, saves to camera roll. For other files, saves to downloads.
 */
export async function downloadToDevice(
  file: CloudFile,
  token: string,
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; localUri?: string; error?: string }> {
  try {
    // Get presigned download URL
    const downloadUrl = await getDownloadUrl(file.s3Key, token);
    if (!downloadUrl) {
      return { success: false, error: 'Could not get download URL' };
    }

    // Download to a temp location first
    const tempDir = FileSystem.cacheDirectory + 'downloads/';
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    const tempPath = tempDir + file.name;

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      tempPath,
      {},
      (downloadProgress) => {
        if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
          const percent = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          onProgress(percent);
        }
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      return { success: false, error: 'Download failed' };
    }

    // For images and videos, save to camera roll
    if (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(result.uri);
        // Optionally save to a "MyPhoto" album
        try {
          let album = await MediaLibrary.getAlbumAsync('MyPhoto');
          if (!album) {
            album = await MediaLibrary.createAlbumAsync('MyPhoto', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch {
          // Album creation might fail on some devices, asset is still saved
        }
        return { success: true, localUri: asset.uri };
      }
    }

    // For other files, move to document directory for persistence
    const docsDir = FileSystem.documentDirectory + 'MySpace/';
    await FileSystem.makeDirectoryAsync(docsDir, { intermediates: true });
    const finalPath = docsDir + file.name;

    // If file exists, add suffix
    const info = await FileSystem.getInfoAsync(finalPath);
    let destPath = finalPath;
    if (info.exists) {
      const dotIdx = file.name.lastIndexOf('.');
      const base = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
      const ext = dotIdx > 0 ? file.name.slice(dotIdx) : '';
      destPath = docsDir + `${base}_${Date.now()}${ext}`;
    }

    await FileSystem.moveAsync({ from: result.uri, to: destPath });
    return { success: true, localUri: destPath };
  } catch (e) {
    console.error('Download error:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Download multiple files with progress tracking
 */
export async function downloadMultiple(
  files: CloudFile[],
  token: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const result = await downloadToDevice(files[i], token);
    if (result.success) {
      success++;
    } else {
      failed++;
    }
    onProgress?.(i + 1, files.length);
  }

  return { success, failed };
}
