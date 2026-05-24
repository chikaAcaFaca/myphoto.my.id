/**
 * Save an arbitrary local (or remote) file into the user's MySpace cloud —
 * their "lični prostor" — under a named folder. Used by the creative tools so
 * a background-removed cutout, a sticker, or a baked meme can be kept in the
 * user's own space (not just the device gallery). Mirrors the disk-files
 * upload dance used by folder sync: ensure folder → presign → PUT → confirm.
 */
import * as FileSystem from 'expo-file-system/legacy';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export const CREATIONS_FOLDER = 'MyPhoto Kreacije';

// Resolve a top-level MySpace folder by name, creating it if missing. The API
// handles duplicates gracefully, so a POST is safe to call every time.
async function ensureFolder(name: string, token: string): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/api/folders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: 'root' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.id || data.folderId || 'root';
    }
  } catch (e) {
    console.warn('ensureFolder failed:', e);
  }
  return 'root';
}

export async function saveToMySpace(opts: {
  uri: string;
  filename: string;
  mimeType: string;
  token: string;
  folderName?: string;
}): Promise<boolean> {
  const { uri, filename, mimeType, token, folderName = CREATIONS_FOLDER } = opts;
  let localUri = uri;
  let tmpToCleanup: string | null = null;
  try {
    // Remote sources (presigned S3 / thumbnails) must be pulled local first —
    // uploadAsync only streams files off disk.
    if (uri.startsWith('http')) {
      const dl = await FileSystem.downloadAsync(
        uri,
        `${FileSystem.cacheDirectory}myspace_${Date.now()}_${filename}`,
      );
      localUri = dl.uri;
      tmpToCleanup = localUri;
    }

    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) return false;
    const size = (info as any).size || 0;

    const folderId = await ensureFolder(folderName, token);

    const urlRes = await fetch(`${API_URL}/api/disk-files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, mimeType, size, folderId }),
    });
    if (!urlRes.ok) return false;
    const { uploadUrl, fileId, s3Key } = await urlRes.json();

    const up = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': mimeType },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });
    if (up.status < 200 || up.status >= 300) return false;

    const confirm = await fetch(`${API_URL}/api/disk-files`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, s3Key, filename, mimeType, size, folderId }),
    });
    return confirm.ok;
  } catch (e) {
    console.warn('saveToMySpace failed:', e);
    return false;
  } finally {
    if (tmpToCleanup) {
      try { await FileSystem.deleteAsync(tmpToCleanup, { idempotent: true }); } catch {}
    }
  }
}
