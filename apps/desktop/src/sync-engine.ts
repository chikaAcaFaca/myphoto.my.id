import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface SyncEngineOptions {
  syncFolder: string;
  apiToken: string;
  serverUrl: string;
  onStatus: (status: 'idle' | 'syncing' | 'error' | 'paused') => void;
  onNotification: (title: string, message: string) => void;
  onLog: (message: string) => void;
}

interface SyncStats {
  filesWatched: number;
  filesSynced: number;
  lastSync: number | null;
  errors: string[];
}

// MIME type detection from extension
const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml', '.heic': 'image/heic', '.heif': 'image/heif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska', '.webm': 'video/webm',
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
  '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

const IMAGE_VIDEO_PREFIXES = ['image/', 'video/'];

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function isMediaFile(mimeType: string): boolean {
  return IMAGE_VIDEO_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

// Track synced files by content hash to avoid re-uploads
const SYNC_DB_FILE = '.myphoto-sync-db.json';

interface SyncDB {
  files: Record<string, { hash: string; remoteFolderId: string; remoteFileId: string; syncedAt: number }>;
  folders: Record<string, string>; // relative path → remote folder ID
}

export class SyncEngine {
  private watcher: chokidar.FSWatcher | null = null;
  private options: SyncEngineOptions;
  private stats: SyncStats = { filesWatched: 0, filesSynced: 0, lastSync: null, errors: [] };
  private syncDB: SyncDB = { files: {}, folders: {} };
  private uploadQueue: string[] = [];
  private isProcessing = false;
  private syncDBPath: string;

  constructor(options: SyncEngineOptions) {
    this.options = options;
    this.syncDBPath = path.join(options.syncFolder, SYNC_DB_FILE);
    this.loadSyncDB();
  }

  private loadSyncDB(): void {
    try {
      if (fs.existsSync(this.syncDBPath)) {
        const data = fs.readFileSync(this.syncDBPath, 'utf-8');
        this.syncDB = JSON.parse(data);
      }
    } catch {
      this.syncDB = { files: {}, folders: {} };
    }
  }

  private saveSyncDB(): void {
    try {
      fs.writeFileSync(this.syncDBPath, JSON.stringify(this.syncDB, null, 2));
    } catch (err) {
      this.log(`Error saving sync DB: ${err}`);
    }
  }

  private log(msg: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.options.onLog(`[${timestamp}] ${msg}`);
  }

  private async fileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Ensure a folder exists on MySpace, creating it recursively if needed.
   * Returns the remote folder ID.
   */
  private async ensureRemoteFolder(relativePath: string): Promise<string> {
    if (!relativePath || relativePath === '.') return 'root';

    // Check cache
    if (this.syncDB.folders[relativePath]) {
      return this.syncDB.folders[relativePath];
    }

    // Ensure parent exists first
    const parentPath = path.dirname(relativePath);
    const parentId = parentPath === '.' ? 'root' : await this.ensureRemoteFolder(parentPath);

    const folderName = path.basename(relativePath);

    try {
      const res = await fetch(`${this.options.serverUrl}/api/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          parentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const folderId = data.id || data.folderId;
        if (folderId) {
          this.syncDB.folders[relativePath] = folderId;
          this.saveSyncDB();
          return folderId;
        }
      }
    } catch (err) {
      this.log(`Error creating remote folder "${relativePath}": ${err}`);
    }

    return parentId; // Fallback to parent
  }

  /**
   * Upload a single file to MySpace (and MyPhoto if it's an image/video).
   */
  private async uploadFile(filePath: string): Promise<boolean> {
    const relativePath = path.relative(this.options.syncFolder, filePath);
    const relativeDir = path.dirname(relativePath);
    const fileName = path.basename(filePath);
    const mimeType = getMimeType(filePath);

    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return false;

      // Check if already synced with same hash
      const hash = await this.fileHash(filePath);
      const existing = this.syncDB.files[relativePath];
      if (existing && existing.hash === hash) {
        return true; // Already synced, no changes
      }

      // Ensure remote folder structure exists
      const folderId = await this.ensureRemoteFolder(relativeDir);

      this.log(`Uploading: ${relativePath} (${(stat.size / 1024).toFixed(1)} KB)`);

      // 1. Get pre-signed upload URL from disk-files endpoint
      // This endpoint auto-creates MyPhoto record for images/videos
      const urlRes = await fetch(`${this.options.serverUrl}/api/disk-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileName,
          mimeType,
          size: stat.size,
          folderId,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || `Upload URL failed: ${urlRes.status}`);
      }

      const { uploadUrl, fileId, s3Key } = await urlRes.json();

      // 2. Upload file to S3
      const fileBuffer = fs.readFileSync(filePath);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`S3 upload failed: ${uploadRes.status}`);
      }

      // 3. Confirm upload (creates disk file + photo record for images + AI processing)
      const confirmRes = await fetch(`${this.options.serverUrl}/api/disk-files`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.options.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          s3Key,
          filename: fileName,
          mimeType,
          size: stat.size,
          folderId,
        }),
      });

      if (!confirmRes.ok) {
        throw new Error(`Confirm failed: ${confirmRes.status}`);
      }

      // Update sync DB
      this.syncDB.files[relativePath] = {
        hash,
        remoteFolderId: folderId,
        remoteFileId: fileId,
        syncedAt: Date.now(),
      };
      this.saveSyncDB();

      this.stats.filesSynced++;
      this.log(`Synced: ${relativePath}`);
      return true;
    } catch (err: any) {
      this.log(`Error uploading ${relativePath}: ${err.message}`);
      this.stats.errors.push(`${relativePath}: ${err.message}`);
      if (this.stats.errors.length > 50) this.stats.errors.shift();
      return false;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.uploadQueue.length === 0) return;

    this.isProcessing = true;
    this.options.onStatus('syncing');

    while (this.uploadQueue.length > 0) {
      const filePath = this.uploadQueue.shift()!;

      // Skip if file no longer exists
      if (!fs.existsSync(filePath)) continue;

      // Skip sync DB file and hidden files
      const basename = path.basename(filePath);
      if (basename === SYNC_DB_FILE || basename.startsWith('.')) continue;

      await this.uploadFile(filePath);
    }

    this.stats.lastSync = Date.now();
    this.isProcessing = false;
    this.options.onStatus('idle');
  }

  /**
   * Start watching the sync folder for changes.
   */
  start(): void {
    if (this.watcher) return;

    this.log(`Starting sync for: ${this.options.syncFolder}`);
    this.options.onStatus('syncing');

    this.watcher = chokidar.watch(this.options.syncFolder, {
      ignored: [
        /(^|[\/\\])\../, // Hidden files
        `**/${SYNC_DB_FILE}`,
      ],
      persistent: true,
      ignoreInitial: false, // Process existing files on first run
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (filePath) => {
        this.stats.filesWatched++;
        this.uploadQueue.push(filePath);
        this.processQueue();
      })
      .on('change', (filePath) => {
        this.uploadQueue.push(filePath);
        this.processQueue();
      })
      .on('error', (error) => {
        this.log(`Watcher error: ${error}`);
        this.options.onStatus('error');
      })
      .on('ready', () => {
        this.log(`Watching ${this.stats.filesWatched} files`);
        if (this.uploadQueue.length === 0) {
          this.options.onStatus('idle');
        }
      });
  }

  /**
   * Stop watching.
   */
  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.uploadQueue = [];
    this.isProcessing = false;
    this.log('Sync stopped');
  }

  /**
   * Force re-sync all files.
   */
  forceSync(): void {
    this.log('Force sync: re-scanning all files...');
    this.syncDB.files = {};
    this.saveSyncDB();

    // Re-scan folder
    this.stop();
    this.start();
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }
}
