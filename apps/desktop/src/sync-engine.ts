import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

interface SyncEngineOptions {
  syncFolder: string;
  /** MySpace folder (path) everything syncs under, e.g. "NKNET CONSULTING DOO".
   *  Slash- or backslash-separated for nested bases. Empty/undefined uploads
   *  straight to the MySpace root (legacy behavior). Lets the desktop mirror
   *  the local folder as a named tree instead of dumping its contents at root. */
  remoteBasePath?: string;
  apiToken: string;
  /** Resolves a fresh API token, refreshing in-band if the cached one
   *  is near expiry. The engine should call this before each HTTP
   *  request rather than reusing the constructor-time apiToken. */
  getToken?: () => Promise<string>;
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

// Editor lock/temp files we must never upload: Office leaves "~$Doc.docx"
// open while editing, LibreOffice writes ".~lock.Doc.docx#", and assorted
// tools drop "*.tmp". These churn constantly and would otherwise count as
// "watched"/"synced" and pollute MySpace. Hidden dotfiles are handled
// separately by the watcher's ignore rule.
function isTempFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return base.startsWith('~$') || base.startsWith('.~lock.') || /\.tmp$/i.test(base);
}

// Track synced files by content hash to avoid re-uploads
const SYNC_DB_FILE = '.myphoto-sync-db.json';

interface SyncDB {
  files: Record<string, { hash: string; remoteFolderId: string; remoteFileId: string; syncedAt: number }>;
  folders: Record<string, string>; // relative path → remote folder ID
}

// A cloud file discovered while walking the remote tree during a pull.
interface RemoteFile {
  id: string;        // diskFiles doc id
  name: string;
  size: number;
  relPath: string;   // path relative to the base folder, '/'-separated
  folderId: string;  // the cloud folder it lives in
}

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 2000;
// How often to pull remote (Boty/web/mobile) changes down to the local folder.
const REMOTE_PULL_INTERVAL = 60_000;

function retryDelay(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), 60000);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class SyncEngine {
  private watcher: chokidar.FSWatcher | null = null;
  private options: SyncEngineOptions;
  private stats: SyncStats = { filesWatched: 0, filesSynced: 0, lastSync: null, errors: [] };
  private syncDB: SyncDB = { files: {}, folders: {} };
  private uploadQueue: string[] = [];
  private retryQueue: Map<string, number> = new Map(); // filePath → attempt count
  private isProcessing = false;
  private syncDBPath: string;
  private retryTimer: NodeJS.Timeout | null = null;
  private remoteBaseFolderId: string | null = null;
  private pullTimer: NodeJS.Timeout | null = null;
  private isPulling = false;
  // Local paths we just wrote from a download — the watcher must not bounce
  // them straight back up. Belt-and-suspenders to the sync-DB hash check.
  private recentlyDownloaded = new Set<string>();

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

  // Resolve the current API token, refreshing through the host's
  // getToken() callback if one was provided. Falls back to the static
  // apiToken from construction time so legacy callers (no getToken)
  // keep working.
  private async authToken(): Promise<string> {
    if (this.options.getToken) {
      try {
        const t = await this.options.getToken();
        if (t) return t;
      } catch (err) {
        this.log(`Token refresh failed: ${err}`);
      }
    }
    return this.options.apiToken;
  }

  /**
   * Resolve (creating if needed) the remote base folder everything syncs
   * under, from the configured remoteBasePath. Empty path → MySpace root.
   * Cached after the first resolution.
   */
  private async getBaseFolderId(): Promise<string> {
    if (this.remoteBaseFolderId) return this.remoteBaseFolderId;

    const basePath = (this.options.remoteBasePath || '').trim();
    if (!basePath) {
      this.remoteBaseFolderId = 'root';
      return 'root';
    }

    const cacheKey = `__base__:${basePath}`;
    const cached = this.syncDB.folders[cacheKey];
    if (cached) {
      this.remoteBaseFolderId = cached;
      return cached;
    }

    let parentId = 'root';
    for (const segment of basePath.split(/[\/\\]+/).filter(Boolean)) {
      parentId = await this.findOrCreateFolder(segment, parentId);
    }
    this.remoteBaseFolderId = parentId;
    this.syncDB.folders[cacheKey] = parentId;
    this.saveSyncDB();
    return parentId;
  }

  /** List parentId's children and return the id of the one named `name`. */
  private async findChildFolder(name: string, parentId: string): Promise<string | null> {
    try {
      const token = await this.authToken();
      const res = await fetch(
        `${this.options.serverUrl}/api/folders?parentId=${encodeURIComponent(parentId)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = (await res.json()) as { folders?: Array<{ id: string; name: string }> };
        const match = (data.folders || []).find((f) => f.name === name);
        if (match) return match.id;
      }
    } catch (err) {
      this.log(`Folder lookup failed for "${name}": ${err}`);
    }
    return null;
  }

  /**
   * Find a child folder by name under parentId, or create it. We look it up
   * FIRST because POST /api/folders returns 409 on a duplicate name rather
   * than the existing folder — without this, syncing into a folder Boty or
   * the web already made would 409 and the file would land in the parent.
   * Looking up first also lets the desktop MERGE into the shared tree.
   */
  private async findOrCreateFolder(name: string, parentId: string): Promise<string> {
    const existing = await this.findChildFolder(name, parentId);
    if (existing) return existing;

    try {
      const token = await this.authToken();
      const res = await fetch(`${this.options.serverUrl}/api/folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, parentId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; folderId?: string };
        const id = data.id || data.folderId;
        if (id) return id;
      } else if (res.status === 409) {
        // Raced with another writer between lookup and create — use theirs.
        const raced = await this.findChildFolder(name, parentId);
        if (raced) return raced;
      }
    } catch (err) {
      this.log(`Error creating remote folder "${name}": ${err}`);
    }
    return parentId; // last-resort: keep the file rather than drop it
  }

  /**
   * Ensure the remote folder for a file's directory exists (relative to the
   * configured base folder), creating each level as needed. Returns its id.
   */
  private async ensureRemoteFolder(relativeDir: string): Promise<string> {
    const baseId = await this.getBaseFolderId();
    if (!relativeDir || relativeDir === '.') return baseId;

    const basePrefix = (this.options.remoteBasePath || '').trim();
    const segments = relativeDir.split(/[\/\\]+/).filter(Boolean);
    let parentId = baseId;
    let walked = '';

    for (const segment of segments) {
      walked = walked ? `${walked}/${segment}` : segment;
      // Cache key is scoped to the base path so changing the base never
      // reuses a folder id resolved under the old root.
      const cacheKey = `${basePrefix}|${walked}`;
      let id = this.syncDB.folders[cacheKey];
      if (!id) {
        id = await this.findOrCreateFolder(segment, parentId);
        this.syncDB.folders[cacheKey] = id;
        this.saveSyncDB();
      }
      parentId = id;
    }
    return parentId;
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
      const token = await this.authToken();
      const urlRes = await fetch(`${this.options.serverUrl}/api/disk-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
        const err = await urlRes.json().catch(() => ({ error: '' })) as { error?: string };
        throw new Error(err.error || `Upload URL failed: ${urlRes.status}`);
      }

      const { uploadUrl, fileId, s3Key } = await urlRes.json() as { uploadUrl: string; fileId: string; s3Key: string };

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
      // Re-resolve the token in case the previous step took long enough
      // to need a refresh — cheap when nothing changed, lifesaver for
      // big uploads that cross the 1h boundary mid-flight.
      const confirmToken = await this.authToken();
      const confirmRes = await fetch(`${this.options.serverUrl}/api/disk-files`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${confirmToken}`,
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

      // Skip sync DB file, hidden files, and editor lock/temp files
      const basename = path.basename(filePath);
      if (basename === SYNC_DB_FILE || basename.startsWith('.') || isTempFile(filePath)) continue;

      const success = await this.uploadFile(filePath);
      if (!success) {
        // Schedule retry with exponential backoff
        const attempts = this.retryQueue.get(filePath) || 0;
        if (attempts < MAX_RETRIES) {
          this.retryQueue.set(filePath, attempts + 1);
          const delay = retryDelay(attempts);
          this.log(`Will retry "${path.basename(filePath)}" in ${delay / 1000}s (attempt ${attempts + 1}/${MAX_RETRIES})`);
          this.scheduleRetry(filePath, delay);
        } else {
          this.log(`✗ Gave up on "${path.basename(filePath)}" after ${MAX_RETRIES} attempts`);
          this.retryQueue.delete(filePath);
        }
      } else {
        // Clear retry count on success
        this.retryQueue.delete(filePath);
      }
    }

    this.stats.lastSync = Date.now();
    this.isProcessing = false;
    this.options.onStatus(this.retryQueue.size > 0 ? 'error' : 'idle');
  }

  private scheduleRetry(filePath: string, delay: number): void {
    setTimeout(() => {
      if (!this.watcher) return; // Stopped
      if (!fs.existsSync(filePath)) {
        this.retryQueue.delete(filePath);
        return;
      }
      this.uploadQueue.push(filePath);
      this.processQueue();
    }, delay);
  }

  // ---- Remote → local pull (Phase 1: bring Boty/web/mobile changes down) ----

  private startRemotePull(): void {
    void this.runRemotePull();
    if (!this.pullTimer) {
      this.pullTimer = setInterval(() => { void this.runRemotePull(); }, REMOTE_PULL_INTERVAL);
    }
  }

  private async runRemotePull(): Promise<void> {
    if (this.isPulling || !this.watcher) return;

    const baseId = await this.getBaseFolderId();
    // A base of 'root' would mirror the user's ENTIRE account into the local
    // folder — never do that. Pull only runs with an explicit base folder.
    if (baseId === 'root') {
      this.log('Remote pull skipped: no base folder set.');
      return;
    }

    this.isPulling = true;
    try {
      const remoteFiles = await this.listRemoteTree(baseId);
      let pulled = 0;
      for (const rf of remoteFiles) {
        if (!this.watcher) break; // stopped mid-pass
        if (await this.maybeDownload(rf)) pulled++;
      }
      if (pulled > 0) this.log(`Pulled ${pulled} file(s) from cloud.`);
    } catch (err: any) {
      this.log(`Remote pull error: ${err.message || err}`);
    } finally {
      this.isPulling = false;
    }
  }

  /** Recursively list every file under a cloud folder, paths relative to it. */
  private async listRemoteTree(baseId: string): Promise<RemoteFile[]> {
    const out: RemoteFile[] = [];
    const queue: Array<{ folderId: string; relDir: string }> = [{ folderId: baseId, relDir: '' }];

    while (queue.length > 0) {
      const { folderId, relDir } = queue.shift()!;
      const token = await this.authToken();
      const res = await fetch(
        `${this.options.serverUrl}/api/folders?parentId=${encodeURIComponent(folderId)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        folders?: Array<{ id: string; name: string }>;
        files?: Array<{ id: string; name: string; size?: number }>;
      };
      for (const f of data.folders || []) {
        queue.push({ folderId: f.id, relDir: relDir ? `${relDir}/${f.name}` : f.name });
      }
      for (const file of data.files || []) {
        out.push({
          id: file.id,
          name: file.name,
          size: file.size || 0,
          relPath: relDir ? `${relDir}/${file.name}` : file.name,
          folderId,
        });
      }
    }
    return out;
  }

  /**
   * Download a remote file to its local path when it's missing or the remote
   * changed. Never clobbers a local file that changed since the last sync
   * (logs it as a conflict and leaves the local copy — Phase 3 territory).
   */
  private async maybeDownload(rf: RemoteFile): Promise<boolean> {
    const localPath = path.join(this.options.syncFolder, ...rf.relPath.split('/'));
    const key = rf.relPath;

    if (fs.existsSync(localPath)) {
      if (fs.statSync(localPath).size === rf.size) return false; // same content
      const entry = this.syncDB.files[key];
      if (!entry) {
        this.log(`Skipped (untracked local differs): ${rf.relPath}`);
        return false;
      }
      const localHash = await this.fileHash(localPath);
      if (localHash !== entry.hash) {
        this.log(`Conflict (kept local): ${rf.relPath}`);
        return false;
      }
      // Local untouched since last sync, remote changed → safe to overwrite.
    }

    try {
      const token = await this.authToken();
      const metaRes = await fetch(
        `${this.options.serverUrl}/api/disk-files/download?fileId=${encodeURIComponent(rf.id)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!metaRes.ok) {
        this.log(`Download URL failed for ${rf.relPath} (${metaRes.status})`);
        return false;
      }
      const { downloadUrl } = (await metaRes.json()) as { downloadUrl: string };

      const fileRes = await fetch(downloadUrl);
      if (!fileRes.ok) {
        this.log(`S3 download failed for ${rf.relPath} (${fileRes.status})`);
        return false;
      }
      const buf = Buffer.from(await fileRes.arrayBuffer());

      // Suppress the watcher's re-upload of what we're about to write.
      this.recentlyDownloaded.add(localPath);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, buf);
      setTimeout(() => this.recentlyDownloaded.delete(localPath), 10000);

      // Record as synced so the watcher and future passes treat it as current.
      const hash = await this.fileHash(localPath);
      this.syncDB.files[key] = {
        hash,
        remoteFolderId: rf.folderId,
        remoteFileId: rf.id,
        syncedAt: Date.now(),
      };
      this.saveSyncDB();

      this.log(`Downloaded: ${rf.relPath}`);
      return true;
    } catch (err: any) {
      this.log(`Error downloading ${rf.relPath}: ${err.message || err}`);
      return false;
    }
  }

  /**
   * Start watching the sync folder for changes.
   */
  start(): void {
    if (this.watcher) return;

    this.log(`Starting sync for: ${this.options.syncFolder}`);
    this.options.onStatus('syncing');

    // Recount from scratch every start. The watcher re-emits 'add' for every
    // existing file on launch, so a restart (e.g. forceSync) would otherwise
    // ADD to the previous run's tally and double-count the same folder.
    this.stats.filesWatched = 0;

    this.watcher = chokidar.watch(this.options.syncFolder, {
      ignored: [
        /(^|[\/\\])\../, // Hidden files
        `**/${SYNC_DB_FILE}`,
        /[\/\\]~\$[^\/\\]*$/, // Office lock files (~$Doc.docx)
        /\.tmp$/i, // generic temp files
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
        if (this.recentlyDownloaded.has(filePath)) return; // we just wrote it
        this.stats.filesWatched++;
        this.uploadQueue.push(filePath);
        this.processQueue();
      })
      .on('change', (filePath) => {
        if (this.recentlyDownloaded.has(filePath)) return; // we just wrote it
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
        // Start pulling remote (Boty/web/mobile) changes down to the folder.
        this.startRemotePull();
      });
  }

  /**
   * Stop watching.
   */
  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.uploadQueue = [];
    this.retryQueue.clear();
    this.isProcessing = false;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.pullTimer) {
      clearInterval(this.pullTimer);
      this.pullTimer = null;
    }
    this.isPulling = false;
    this.log('Sync stopped');
  }

  /**
   * Force a re-scan of the sync folder. Re-walks every file and uploads
   * anything missing or changed (the per-file content-hash check skips
   * what's already synced). Does NOT wipe the sync DB — doing so made the
   * server mint a brand-new file for every already-synced item, leaving
   * duplicates in MySpace. To genuinely re-upload everything, clear the
   * DB explicitly elsewhere; the default "full sync" just reconciles.
   */
  forceSync(): void {
    this.log('Full sync: re-scanning all files...');
    this.stop();
    this.start();
  }

  getStats(): SyncStats {
    // filesSynced reflects what's actually recorded as synced, not a
    // session counter that drifts across restarts/retries.
    return { ...this.stats, filesSynced: Object.keys(this.syncDB.files).length };
  }
}
