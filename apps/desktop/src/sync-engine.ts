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
  /** Remove a local file the cloud deleted. The host passes the OS recycle
   *  bin (Electron shell.trashItem) so a wrong delete is always recoverable;
   *  falls back to a hard unlink. */
  trashLocal?: (absPath: string) => Promise<void>;
  /** A deletion big enough to need the user's OK is waiting (null = none). */
  onPendingDeletes?: (pending: PendingDeletes | null) => void;
}

export interface PendingDeletes {
  /** 'local' = files vanished from the computer, about to be trashed in the
   *  cloud; 'cloud' = files vanished from the cloud, about to be trashed here. */
  side: 'local' | 'cloud';
  count: number;
  sample: string[];
}

interface SyncStats {
  filesWatched: number;
  filesSynced: number;
  lastSync: number | null;
  errors: string[];
  pendingDeletes?: PendingDeletes | null;
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

// Deletions are batched (a folder delete fires one event per file) and a
// batch this big is held for the user's confirmation instead of propagating:
// an unplugged drive, a wiped folder or a broken cloud listing must never
// silently empty the other side.
const DELETE_DEBOUNCE = 3000;
const MASS_DELETE_MIN = 20;
const MASS_DELETE_RATIO = 0.3;

/** "Ponuda.docx" → "Ponuda (konflikt 2026-10-16).docx" */
function conflictName(relPath: string): string {
  const dir = path.posix.dirname(relPath);
  const ext = path.posix.extname(relPath);
  const stem = path.posix.basename(relPath, ext);
  const name = `${stem} (konflikt ${new Date().toISOString().slice(0, 10)})${ext}`;
  return dir === '.' ? name : `${dir}/${name}`;
}

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
  // Relative paths being uploaded right now — a pull pass must not mistake
  // their momentarily-missing cloud copy for a cloud-side delete.
  private inFlight = new Set<string>();
  private localDeletes = new Set<string>();    // rel file paths gone locally
  private localDirDeletes = new Set<string>(); // rel dir paths gone locally
  private deleteTimer: NodeJS.Timeout | null = null;
  private pending: { side: 'local' | 'cloud'; files: string[]; dirs: string[] } | null = null;

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
        // Migrate legacy backslash keys (written by older builds on Windows) to
        // forward-slash so they match the unified key convention — otherwise the
        // first scan after upgrading would re-upload everything once.
        const norm = (obj: Record<string, any>) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(obj || {})) out[k.split('\\').join('/')] = v;
          return out;
        };
        this.syncDB = { files: norm(this.syncDB.files), folders: norm(this.syncDB.folders) };
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
    const relNative = path.relative(this.options.syncFolder, filePath);
    const relativeDir = path.dirname(relNative);
    // The sync-DB key is ALWAYS forward-slash so it matches the keys the pull
    // side writes (cloud paths are '/'-separated). Previously this used the
    // native separator ('\' on Windows), so a downloaded file ("a/b.pdf" key)
    // never matched on the next scan ("a\b.pdf" key) → it re-uploaded → the
    // server auto-renamed it to "b (1).pdf" → pull → re-upload … an infinite
    // duplication loop that ballooned the folder and burned storage/requests.
    const relativePath = relNative.split(path.sep).join('/');
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

      // Edited since the last sync: retire the old cloud copy first. Uploading
      // next to it made the server auto-rename the new one to "name (1).ext",
      // which the pull then brought down as a second local file.
      if (existing) {
        await this.trashRemoteFile(existing.remoteFileId);
        delete this.syncDB.files[relativePath];
        this.saveSyncDB();
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

      const rel = this.relOf(filePath);
      this.inFlight.add(rel);
      const success = await this.uploadFile(filePath);
      this.inFlight.delete(rel);
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

  // ---- Remote → local pull (bring Boty/web/mobile changes down) ----

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
      // If the base folder itself was trashed in the cloud, listing it would
      // look like "everything deleted". Re-resolve it instead.
      if (!(await this.baseFolderAlive(baseId))) {
        this.log('Cloud base folder is gone — re-creating it on the next pass.');
        this.remoteBaseFolderId = null;
        delete this.syncDB.folders[`__base__:${(this.options.remoteBasePath || '').trim()}`];
        this.saveSyncDB();
        return;
      }

      const listedAt = Date.now();
      const { files: remoteFiles, folders: remoteFolders } = await this.listRemoteTree(baseId);
      this.refreshFolderCache(remoteFolders);

      let pulled = 0;
      for (const rf of remoteFiles) {
        if (!this.watcher) return; // stopped mid-pass
        if (this.inFlight.has(rf.relPath)) continue;
        if (await this.maybeDownload(rf)) pulled++;
      }
      if (pulled > 0) this.log(`Pulled ${pulled} file(s) from cloud.`);

      // Tracked files missing from a COMPLETE cloud listing were deleted
      // (or moved/renamed) in the cloud.
      if (!this.pending) {
        const remotePaths = new Set(remoteFiles.map((f) => f.relPath));
        const gone: string[] = [];
        for (const rel of Object.keys(this.syncDB.files)) {
          if (remotePaths.has(rel) || this.inFlight.has(rel) || this.localDeletes.has(rel)) continue;
          // Synced after the listing was taken — the listing just can't know it.
          if (this.syncDB.files[rel].syncedAt >= listedAt) continue;
          if (fs.existsSync(this.absOf(rel))) {
            gone.push(rel);
          } else {
            delete this.syncDB.files[rel]; // gone on both sides
          }
        }
        this.saveSyncDB();
        if (gone.length > 0) {
          if (this.isMassDelete(gone.length)) this.holdDeletes('cloud', gone, []);
          else await this.applyCloudDeletes(gone, new Set(remoteFolders.keys()));
        }
      }
    } catch (err: any) {
      this.log(`Remote pull error: ${err.message || err}`);
    } finally {
      this.isPulling = false;
    }
  }

  private async listChildren(folderId: string): Promise<{
    folders: Array<{ id: string; name: string }>;
    files: Array<{ id: string; name: string; size?: number }>;
  }> {
    const token = await this.authToken();
    const res = await fetch(
      `${this.options.serverUrl}/api/folders?parentId=${encodeURIComponent(folderId)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    // Throw rather than skip: a partial listing would read as mass deletion.
    if (!res.ok) throw new Error(`Listing failed (${res.status})`);
    const data = (await res.json()) as { folders?: any[]; files?: any[] };
    return { folders: data.folders || [], files: data.files || [] };
  }

  private async baseFolderAlive(baseId: string): Promise<boolean> {
    let parentId = 'root';
    for (const segment of (this.options.remoteBasePath || '').split(/[\/\\]+/).filter(Boolean)) {
      const { folders } = await this.listChildren(parentId);
      const match = folders.find((f) => f.name === segment);
      if (!match) return false;
      parentId = match.id;
    }
    return parentId === baseId;
  }

  /** Recursively list every file and folder under a cloud folder, paths
   *  relative to it. Throws if any level can't be listed. */
  private async listRemoteTree(baseId: string): Promise<{ files: RemoteFile[]; folders: Map<string, string> }> {
    const files: RemoteFile[] = [];
    const folders = new Map<string, string>(); // rel dir → folder id
    const queue: Array<{ folderId: string; relDir: string }> = [{ folderId: baseId, relDir: '' }];

    while (queue.length > 0) {
      const { folderId, relDir } = queue.shift()!;
      const data = await this.listChildren(folderId);
      for (const f of data.folders) {
        const rel = relDir ? `${relDir}/${f.name}` : f.name;
        folders.set(rel, f.id);
        queue.push({ folderId: f.id, relDir: rel });
      }
      for (const file of data.files) {
        files.push({
          id: file.id,
          name: file.name,
          size: file.size || 0,
          relPath: relDir ? `${relDir}/${file.name}` : file.name,
          folderId,
        });
      }
    }
    return { files, folders };
  }

  /** Make the folder-id cache match the live cloud tree: drop ids of folders
   *  that were trashed (uploads into them would vanish) and learn folders
   *  created elsewhere (so deleting them locally can propagate). */
  private refreshFolderCache(live: Map<string, string>): void {
    const prefix = `${(this.options.remoteBasePath || '').trim()}|`;
    for (const key of Object.keys(this.syncDB.folders)) {
      if (key.startsWith(prefix) && live.get(key.slice(prefix.length)) !== this.syncDB.folders[key]) {
        delete this.syncDB.folders[key];
      }
    }
    for (const [rel, id] of live) this.syncDB.folders[prefix + rel] = id;
    this.saveSyncDB();
  }

  /**
   * Bring one cloud file down when it's new or changed in the cloud. A file
   * changed on BOTH sides keeps the local version and saves the cloud one
   * next to it as "name (konflikt DATE).ext" — nothing is overwritten.
   */
  private async maybeDownload(rf: RemoteFile): Promise<boolean> {
    const localPath = this.absOf(rf.relPath);
    const entry = this.syncDB.files[rf.relPath];

    if (!fs.existsSync(localPath)) {
      // Tracked but missing locally = deleted here; the delete path owns it.
      if (entry) return false;
      return this.download(rf, rf.relPath);
    }

    if (entry && entry.remoteFileId === rf.id) return false; // cloud unchanged

    if (!entry) {
      // Same name on both sides but never linked (e.g. first sync of a folder
      // that already existed in the cloud). Same size → adopt as synced.
      if (fs.statSync(localPath).size === rf.size) {
        this.syncDB.files[rf.relPath] = {
          hash: await this.fileHash(localPath),
          remoteFolderId: rf.folderId,
          remoteFileId: rf.id,
          syncedAt: Date.now(),
        };
        this.saveSyncDB();
        return false;
      }
      this.log(`Skipped (untracked local differs): ${rf.relPath}`);
      return false;
    }

    // The cloud has a newer version (a different file id at this path).
    const localHash = await this.fileHash(localPath);
    if (localHash === entry.hash) return this.download(rf, rf.relPath);

    const copy = conflictName(rf.relPath);
    this.log(`Conflict: ${rf.relPath} changed on both sides — cloud version saved as ${copy}`);
    // The local edit is the version the user is looking at; let it upload as
    // the new cloud copy. The cloud's version survives as the conflict file.
    // Point the entry at the cloud version and blank its hash: the upload
    // then sees "changed", retires that version and takes its place.
    this.syncDB.files[rf.relPath] = { ...entry, remoteFileId: rf.id, hash: '' };
    this.saveSyncDB();
    const ok = await this.download(rf, copy, /* track */ false);
    this.uploadQueue.push(localPath);
    void this.processQueue();
    return ok;
  }

  private async download(rf: RemoteFile, relTarget: string, track = true): Promise<boolean> {
    const localPath = this.absOf(relTarget);
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
      if (track) this.recentlyDownloaded.add(localPath);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFileSync(localPath, buf);
      if (track) setTimeout(() => this.recentlyDownloaded.delete(localPath), 10000);

      if (track) {
        // Record as synced so the watcher and future passes treat it as current.
        this.syncDB.files[relTarget] = {
          hash: await this.fileHash(localPath),
          remoteFolderId: rf.folderId,
          remoteFileId: rf.id,
          syncedAt: Date.now(),
        };
        this.saveSyncDB();
      }

      this.log(`Downloaded: ${relTarget}`);
      return true;
    } catch (err: any) {
      this.log(`Error downloading ${rf.relPath}: ${err.message || err}`);
      return false;
    }
  }

  // ---- Deletions (both directions) ----

  private relOf(absPath: string): string {
    return path.relative(this.options.syncFolder, absPath).split(path.sep).join('/');
  }

  private absOf(rel: string): string {
    return path.join(this.options.syncFolder, ...rel.split('/'));
  }

  private isMassDelete(count: number): boolean {
    const tracked = Object.keys(this.syncDB.files).length;
    return count >= MASS_DELETE_MIN && count > tracked * MASS_DELETE_RATIO;
  }

  private holdDeletes(side: 'local' | 'cloud', files: string[], dirs: string[]): void {
    this.pending = { side, files, dirs };
    const info = this.getPendingDeletes();
    this.log(`⚠ ${files.length} fajlova obrisano ${side === 'local' ? 'na računaru' : 'na cloud-u'} — čekam potvrdu pre nego što obrišem i na drugoj strani.`);
    this.options.onPendingDeletes?.(info);
    this.options.onNotification(
      'Potrebna potvrda',
      `${files.length} fajlova je obrisano ${side === 'local' ? 'na računaru' : 'na cloud-u'}. Otvori MyPhoto Sync da potvrdiš.`
    );
  }

  getPendingDeletes(): PendingDeletes | null {
    if (!this.pending) return null;
    return { side: this.pending.side, count: this.pending.files.length, sample: this.pending.files.slice(0, 5) };
  }

  /**
   * The user's answer to a held mass deletion. approve → delete on the other
   * side too. Reject → restore: bring the files back from the side that
   * still has them.
   */
  async resolvePendingDeletes(approve: boolean): Promise<void> {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.options.onPendingDeletes?.(null);

    if (p.side === 'local') {
      if (approve) {
        await this.applyLocalDeletes(p.files, p.dirs);
      } else {
        // Forget them so the next pull downloads them again.
        for (const rel of p.files) delete this.syncDB.files[rel];
        this.saveSyncDB();
        this.log(`Vraćam ${p.files.length} fajlova sa cloud-a…`);
        void this.runRemotePull();
      }
    } else if (approve) {
      await this.applyCloudDeletes(p.files, null);
    } else {
      // Re-upload the local copies to restore them in the cloud.
      for (const rel of p.files) {
        delete this.syncDB.files[rel];
        this.uploadQueue.push(this.absOf(rel));
      }
      this.saveSyncDB();
      this.log(`Vraćam ${p.files.length} fajlova na cloud…`);
      void this.processQueue();
    }
  }

  private scheduleLocalDeletes(): void {
    if (this.deleteTimer) clearTimeout(this.deleteTimer);
    this.deleteTimer = setTimeout(() => {
      this.deleteTimer = null;
      void this.flushLocalDeletes();
    }, DELETE_DEBOUNCE);
  }

  private async flushLocalDeletes(): Promise<void> {
    const files = [...this.localDeletes];
    const dirs = [...this.localDirDeletes];
    this.localDeletes.clear();
    this.localDirDeletes.clear();

    // The whole sync folder vanishing (drive unplugged, folder moved) is not
    // a request to empty the cloud.
    if (!fs.existsSync(this.options.syncFolder)) {
      this.log('Sync folder is missing — ignoring local deletions.');
      return;
    }
    // Re-check: editors often save by delete + rename, so the file is back.
    const goneFiles = files.filter((rel) => this.syncDB.files[rel] && !fs.existsSync(this.absOf(rel)));
    const goneDirs = dirs.filter((rel) => !fs.existsSync(this.absOf(rel)));
    if (goneFiles.length === 0 && goneDirs.length === 0) return;

    if (this.pending || this.isMassDelete(goneFiles.length)) {
      if (this.pending && this.pending.side === 'local') {
        this.pending.files.push(...goneFiles);
        this.pending.dirs.push(...goneDirs);
        this.options.onPendingDeletes?.(this.getPendingDeletes());
      } else if (!this.pending) {
        this.holdDeletes('local', goneFiles, goneDirs);
      }
      return;
    }
    await this.applyLocalDeletes(goneFiles, goneDirs);
  }

  private async trashRemoteFile(fileId: string): Promise<boolean> {
    const token = await this.authToken();
    const res = await fetch(
      `${this.options.serverUrl}/api/disk-files?fileId=${encodeURIComponent(fileId)}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
    );
    return res.ok || res.status === 404; // 404 = already gone
  }

  /** Files/folders deleted on this computer → move them to the cloud Trash. */
  private async applyLocalDeletes(files: string[], dirs: string[]): Promise<void> {
    for (const rel of files) {
      const entry = this.syncDB.files[rel];
      if (!entry) continue;
      try {
        if (await this.trashRemoteFile(entry.remoteFileId)) {
          delete this.syncDB.files[rel];
          this.log(`Deleted in cloud: ${rel}`);
        } else {
          this.log(`✗ Could not delete in cloud: ${rel}`);
        }
      } catch (err: any) {
        this.log(`✗ Could not delete in cloud: ${rel} (${err.message || err})`);
      }
    }

    const prefix = `${(this.options.remoteBasePath || '').trim()}|`;
    // Deepest first, so a parent's delete doesn't 404 its children.
    for (const rel of [...dirs].sort((a, b) => b.length - a.length)) {
      const folderId = this.syncDB.folders[prefix + rel];
      if (!folderId) continue;
      try {
        const token = await this.authToken();
        const res = await fetch(
          `${this.options.serverUrl}/api/folders?folderId=${encodeURIComponent(folderId)}`,
          { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (res.ok || res.status === 404) {
          for (const key of Object.keys(this.syncDB.folders)) {
            if (key === prefix + rel || key.startsWith(`${prefix}${rel}/`)) delete this.syncDB.folders[key];
          }
          this.log(`Deleted folder in cloud: ${rel}`);
        }
      } catch (err: any) {
        this.log(`✗ Could not delete folder in cloud: ${rel} (${err.message || err})`);
      }
    }
    this.saveSyncDB();
  }

  /** Files deleted in the cloud → move the local copies to the Recycle Bin.
   *  A local copy edited since the last sync is kept and re-uploaded instead. */
  private async applyCloudDeletes(files: string[], liveDirs: Set<string> | null): Promise<void> {
    const touchedDirs = new Set<string>();
    for (const rel of files) {
      const entry = this.syncDB.files[rel];
      const abs = this.absOf(rel);
      delete this.syncDB.files[rel];
      this.saveSyncDB();
      if (!entry || !fs.existsSync(abs)) continue;

      if ((await this.fileHash(abs)) !== entry.hash) {
        this.log(`Kept (edited here, deleted in cloud) — uploading again: ${rel}`);
        this.uploadQueue.push(abs);
        continue;
      }
      try {
        if (this.options.trashLocal) await this.options.trashLocal(abs);
        else fs.unlinkSync(abs);
        this.log(`Deleted locally (removed in cloud): ${rel}`);
        touchedDirs.add(path.posix.dirname(rel));
      } catch (err: any) {
        this.log(`✗ Could not delete ${rel}: ${err.message || err}`);
      }
    }
    void this.processQueue();

    // Remove folders the cloud no longer has, once they're empty.
    if (liveDirs) {
      for (let dir of touchedDirs) {
        while (dir && dir !== '.' && !liveDirs.has(dir)) {
          const abs = this.absOf(dir);
          try {
            if (fs.readdirSync(abs).length > 0) break;
            fs.rmdirSync(abs);
          } catch {
            break;
          }
          dir = path.posix.dirname(dir);
        }
      }
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
      .on('unlink', (filePath) => {
        const rel = this.relOf(filePath);
        if (!this.syncDB.files[rel]) return; // never synced, or removed by a cloud delete
        this.localDeletes.add(rel);
        this.scheduleLocalDeletes();
      })
      .on('unlinkDir', (dirPath) => {
        this.localDirDeletes.add(this.relOf(dirPath));
        this.scheduleLocalDeletes();
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
        // Files synced earlier but missing now were deleted while the app
        // wasn't running — the watcher has no 'unlink' for those.
        for (const rel of Object.keys(this.syncDB.files)) {
          if (!fs.existsSync(this.absOf(rel))) this.localDeletes.add(rel);
        }
        if (this.localDeletes.size > 0) this.scheduleLocalDeletes();
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
    // Queued local deletes are re-detected on the next start (their sync-DB
    // entries are still there), so dropping them here loses nothing.
    if (this.deleteTimer) {
      clearTimeout(this.deleteTimer);
      this.deleteTimer = null;
    }
    this.localDeletes.clear();
    this.localDirDeletes.clear();
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
    return {
      ...this.stats,
      filesSynced: Object.keys(this.syncDB.files).length,
      pendingDeletes: this.getPendingDeletes(),
    };
  }
}
