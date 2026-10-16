import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { Readable } from 'stream';
import * as yauzl from 'yauzl';

/**
 * Google Takeout → MyPhoto importer.
 *
 * Google Photos has no API for bulk export any more (the Library API only
 * sees media the calling app uploaded itself, since 2025-03-31), so users
 * export through takeout.google.com and hand us the ZIPs. This reads them in
 * place — no extraction to disk — and uploads every photo/video once into
 * MySpace under "Google Photos/<year>", using the capture date from Google's
 * JSON sidecars so the gallery sorts by when the photo was taken, not by
 * when it was imported.
 *
 * Takeout quirks handled here:
 *  - Metadata lives in sidecar JSON next to the media ("IMG.jpg.json", newer
 *    exports "IMG.jpg.supplemental-metadata.json"), whose filename Google
 *    truncates for long names. We match on the JSON's `title` (the original
 *    filename) instead of guessing the sidecar's name.
 *  - A split export puts a photo and its JSON in DIFFERENT ZIP parts, so all
 *    sources are scanned before anything uploads.
 *  - Album folders hold copies of photos that also sit in the year folders
 *    ("Photos from 2019"). Each photo is uploaded once (dedupe key = size +
 *    capture time + original name); album membership is only recorded.
 *  - "IMG(1).jpg" duplicates and "IMG-edited.jpg" variants share the original's
 *    JSON.
 *
 * Progress is persisted, so an interrupted import resumes where it stopped.
 */

const MEDIA_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.heic': 'image/heic', '.heif': 'image/heif', '.tif': 'image/tiff',
  '.tiff': 'image/tiff', '.dng': 'image/x-adobe-dng',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime',
  '.3gp': 'video/3gpp', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.webm': 'video/webm', '.mts': 'video/mp2t', '.m2ts': 'video/mp2t',
  '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.wmv': 'video/x-ms-wmv',
};

// Mirrors the server's MAX_UPLOAD_SIZE (packages/shared constants).
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024;
const MAX_JSON_SIZE = 2 * 1024 * 1024;
const CONCURRENCY = 3;
const MAX_ATTEMPTS = 4;
const ROOT_FOLDER_NAME = 'Google Photos';
const NO_DATE_FOLDER_NAME = 'Bez datuma';
// Localized names of the Google Photos product folder inside "Takeout/".
// Other products (Drive, Mail, …) in the same export are ignored.
const PHOTOS_PRODUCT_RE = /photo|foto|фото|slike|слике/i;
// Suffix Google appends to an edited copy's name, by export language.
const EDITED_SUFFIX_RE = /-(edited|izmenjeno|измењено|bearbeitet|modifié|modificato|editado|bewerkt)$/i;

export interface TakeoutScanSummary {
  photos: number;
  videos: number;
  totalBytes: number;
  /** Unique items not yet imported (what an import will upload). */
  pendingFiles: number;
  pendingBytes: number;
  alreadyImported: number;
  duplicatesSkipped: number;
  withoutDate: number;
  tooLarge: number;
  albums: string[];
  storageUsed: number | null;
  storageLimit: number | null;
}

export interface TakeoutProgress {
  phase: 'idle' | 'scanning' | 'uploading' | 'done' | 'stopped' | 'error';
  totalFiles: number;
  totalBytes: number;
  doneFiles: number;
  doneBytes: number;
  failedFiles: number;
  currentFile?: string;
  message?: string;
}

interface TakeoutImporterOptions {
  serverUrl: string;
  getToken: () => Promise<string>;
  /** JSON file where import progress is persisted (for resume). */
  statePath: string;
  onProgress: (p: TakeoutProgress) => void;
  onLog: (msg: string) => void;
}

interface SourceEntry {
  source: Source;
  /** '/'-separated path inside the source. */
  path: string;
  size: number;
  zipEntry?: yauzl.Entry;
}

interface Source {
  kind: 'zip' | 'dir';
  location: string;
  zip?: yauzl.ZipFile;
}

interface MediaItem {
  entry: SourceEntry;
  name: string;
  mimeType: string;
  takenMs: number | null;
  key: string;
}

interface ImportState {
  uploaded: Record<string, { fileId: string; at: number }>;
  /** Album name → dedupe keys of its items; kept so albums can be recreated
   *  once the server has an add-to-album endpoint. */
  albums: Record<string, string[]>;
}

class QuotaExceededError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function dirOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

function baseOf(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1);
}

function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf('.');
  return i <= 0 ? [name, ''] : [name.slice(0, i), name.slice(i)];
}

/** Best guess of the original filename Google's JSON `title` would carry. */
function originalTitle(name: string): string {
  let [stem, ext] = splitExt(name);
  stem = stem.replace(/\(\d+\)$/, '').replace(EDITED_SUFFIX_RE, '');
  return (stem + ext).toLowerCase();
}

/** Capture date encoded in common camera/app filenames, e.g.
 *  IMG_20190405_123456.jpg, PXL_20210102_..., Screenshot_2019-04-05-12-34-56,
 *  VID-20190405-WA0001.mp4. Local time, like the camera wrote it. */
function dateFromFilename(name: string): number | null {
  const m = name.match(/((?:19|20)\d{2})[-_.]?(\d{2})[-_.]?(\d{2})(?:[-_ T.]?(\d{2})[-_.:]?(\d{2})[-_.:]?(\d{2}))?/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d, Number(m[4] || 12), Number(m[5] || 0), Number(m[6] || 0));
  const ms = date.getTime();
  return Number.isFinite(ms) && ms <= Date.now() + 86400000 ? ms : null;
}

function tsToMs(v: any): number | null {
  const s = Number(v?.timestamp);
  return Number.isFinite(s) && s > 0 ? s * 1000 : null;
}

export class TakeoutImporter {
  private options: TakeoutImporterOptions;
  private sources: Source[] = [];
  private items: MediaItem[] = [];
  private state: ImportState = { uploaded: {}, albums: {} };
  private folderIds = new Map<string, Promise<string>>();
  private running = false;
  private stopRequested = false;
  private progress: TakeoutProgress = {
    phase: 'idle', totalFiles: 0, totalBytes: 0, doneFiles: 0, doneBytes: 0, failedFiles: 0,
  };

  constructor(options: TakeoutImporterOptions) {
    this.options = options;
    this.loadState();
  }

  isRunning(): boolean {
    return this.running;
  }

  getProgress(): TakeoutProgress {
    return { ...this.progress };
  }

  private log(msg: string): void {
    this.options.onLog(`[${new Date().toLocaleTimeString()}] [Google Photos] ${msg}`);
  }

  private emit(patch: Partial<TakeoutProgress>): void {
    this.progress = { ...this.progress, ...patch };
    this.options.onProgress({ ...this.progress });
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.options.statePath)) {
        const data = JSON.parse(fs.readFileSync(this.options.statePath, 'utf-8'));
        this.state = { uploaded: data.uploaded || {}, albums: data.albums || {} };
      }
    } catch {
      this.state = { uploaded: {}, albums: {} };
    }
  }

  private saveState(): void {
    try {
      fs.writeFileSync(this.options.statePath, JSON.stringify(this.state));
    } catch (err) {
      this.log(`Ne mogu da sačuvam napredak: ${err}`);
    }
  }

  // ---- Sources ---------------------------------------------------------

  private closeSources(): void {
    for (const s of this.sources) s.zip?.close();
    this.sources = [];
  }

  private openZip(location: string): Promise<{ source: Source; entries: SourceEntry[] }> {
    return new Promise((resolve, reject) => {
      yauzl.open(location, { lazyEntries: true, autoClose: false }, (err, zip) => {
        if (err || !zip) return reject(err || new Error('Cannot open ZIP'));
        const source: Source = { kind: 'zip', location, zip };
        const entries: SourceEntry[] = [];
        zip.on('entry', (e: yauzl.Entry) => {
          if (!e.fileName.endsWith('/')) {
            entries.push({ source, path: e.fileName.replace(/\\/g, '/'), size: e.uncompressedSize, zipEntry: e });
          }
          zip.readEntry();
        });
        zip.once('end', () => resolve({ source, entries }));
        zip.once('error', reject);
        zip.readEntry();
      });
    });
  }

  private listDir(location: string): { source: Source; entries: SourceEntry[] } {
    const source: Source = { kind: 'dir', location };
    const entries: SourceEntry[] = [];
    const walk = (abs: string, rel: string) => {
      for (const d of fs.readdirSync(abs, { withFileTypes: true })) {
        const childAbs = path.join(abs, d.name);
        const childRel = rel ? `${rel}/${d.name}` : d.name;
        if (d.isDirectory()) walk(childAbs, childRel);
        else if (d.isFile()) entries.push({ source, path: childRel, size: fs.statSync(childAbs).size });
      }
    };
    // Prefix with the picked folder's own name so "Takeout" / album names in
    // it stay visible to the path rules below, same as inside a ZIP.
    walk(location, path.basename(location));
    return { source, entries };
  }

  private openStream(entry: SourceEntry): Promise<Readable> {
    if (entry.source.kind === 'dir') {
      const rel = entry.path.split('/').slice(1); // drop the folder-name prefix
      return Promise.resolve(fs.createReadStream(path.join(entry.source.location, ...rel)));
    }
    return new Promise((resolve, reject) => {
      entry.source.zip!.openReadStream(entry.zipEntry!, (err, stream) => {
        if (err || !stream) reject(err || new Error('Cannot read ZIP entry'));
        else resolve(stream);
      });
    });
  }

  private async readJson(entry: SourceEntry): Promise<any | null> {
    try {
      const stream = await this.openStream(entry);
      // Plain listeners, not `for await`: async-iterating a yauzl entry
      // stream stalls and never ends.
      const text = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (c: Buffer) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error', reject);
      });
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /** Keep only entries of the Google Photos product when the export holds
   *  several products ("Takeout/Drive/…", "Takeout/Mail/…"). */
  private isPhotosEntry(p: string): boolean {
    const segs = p.split('/');
    const t = segs.findIndex((s) => s.toLowerCase() === 'takeout');
    if (t === -1 || t + 1 >= segs.length - 1) return true; // no product level visible
    return PHOTOS_PRODUCT_RE.test(segs[t + 1]);
  }

  // ---- Scan ------------------------------------------------------------

  async scan(locations: string[]): Promise<TakeoutScanSummary> {
    if (this.running) throw new Error('Uvoz je već u toku');
    this.closeSources();
    this.items = [];
    this.emit({ phase: 'scanning', message: 'Čitam arhive…', doneFiles: 0, doneBytes: 0, failedFiles: 0 });

    const all: SourceEntry[] = [];
    for (const loc of locations) {
      const isDir = fs.statSync(loc).isDirectory();
      const { source, entries } = isDir ? this.listDir(loc) : await this.openZip(loc);
      this.sources.push(source);
      all.push(...entries.filter((e) => this.isPhotosEntry(e.path)));
      this.log(`Pročitano: ${path.basename(loc)} (${entries.length} stavki)`);
    }

    // Index every sidecar first — a photo's JSON may sit in another ZIP part.
    const byDirTitle = new Map<string, number | null>(); // "dir|title" → takenMs
    const byTitle = new Map<string, number | null>();    // "title" → takenMs (cross-part fallback)
    const titlesByDir = new Map<string, string[]>();     // for truncated-name prefix matching
    const albumNames = new Map<string, string>();        // dir → album title
    for (const e of all) {
      if (!e.path.toLowerCase().endsWith('.json') || e.size > MAX_JSON_SIZE) continue;
      const json = await this.readJson(e);
      if (!json || typeof json.title !== 'string') continue;
      const dir = dirOf(e.path);
      if (!json.photoTakenTime && /^metad/i.test(baseOf(e.path))) {
        albumNames.set(dir, json.title); // album folder's metadata.json
        continue;
      }
      const taken = tsToMs(json.photoTakenTime) ?? null;
      const created = tsToMs(json.creationTime);
      const title = json.title.toLowerCase();
      const value = taken ?? dateFromFilename(json.title) ?? created;
      byDirTitle.set(`${dir}|${title}`, value);
      if (!byTitle.has(title)) byTitle.set(title, value);
      const list = titlesByDir.get(dir) || [];
      list.push(title);
      titlesByDir.set(dir, list);
    }

    const lookupDate = (dir: string, name: string): number | null | undefined => {
      const title = originalTitle(name);
      const exact = byDirTitle.get(`${dir}|${title}`) ?? byDirTitle.get(`${dir}|${name.toLowerCase()}`);
      if (exact !== undefined) return exact;
      // Google truncates long names on disk but keeps the full title in JSON.
      const [stem] = splitExt(title);
      if (stem.length >= 30) {
        const hit = (titlesByDir.get(dir) || []).find((t) => t.startsWith(stem));
        if (hit) return byDirTitle.get(`${dir}|${hit}`);
      }
      return byTitle.get(title);
    };

    const seen = new Set<string>();
    const albums: Record<string, Set<string>> = {};
    let photos = 0, videos = 0, totalBytes = 0, duplicates = 0, withoutDate = 0, tooLarge = 0;

    for (const e of all) {
      const name = baseOf(e.path);
      const mimeType = MEDIA_MIME[splitExt(name)[1].toLowerCase()];
      if (!mimeType) continue;
      const dir = dirOf(e.path);
      const fromJson = lookupDate(dir, name);
      const takenMs = fromJson ?? dateFromFilename(name);
      const key = `${e.size}|${takenMs ?? ''}|${originalTitle(name)}`;

      const album = albumNames.get(dir);
      if (album) (albums[album] ||= new Set()).add(key);

      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      if (e.size > MAX_UPLOAD_SIZE) {
        tooLarge++;
        this.log(`Preskačem (veće od 10 GB): ${name}`);
        continue;
      }
      if (mimeType.startsWith('video/')) videos++;
      else photos++;
      if (!takenMs) withoutDate++;
      totalBytes += e.size;
      this.items.push({ entry: e, name, mimeType, takenMs, key });
    }

    for (const [name, keys] of Object.entries(albums)) {
      const merged = new Set([...(this.state.albums[name] || []), ...keys]);
      this.state.albums[name] = [...merged];
    }
    this.saveState();

    const pending = this.items.filter((i) => !this.state.uploaded[i.key]);
    const quota = await this.fetchQuota();
    const summary: TakeoutScanSummary = {
      photos,
      videos,
      totalBytes,
      pendingFiles: pending.length,
      pendingBytes: pending.reduce((s, i) => s + i.entry.size, 0),
      alreadyImported: this.items.length - pending.length,
      duplicatesSkipped: duplicates,
      withoutDate,
      tooLarge,
      albums: Object.keys(albums).sort(),
      storageUsed: quota?.storageUsed ?? null,
      storageLimit: quota?.storageLimit ?? null,
    };
    this.log(`Pronađeno ${photos} slika i ${videos} videa; za uvoz ${summary.pendingFiles}.`);
    this.emit({ phase: 'idle', message: undefined, totalFiles: summary.pendingFiles, totalBytes: summary.pendingBytes });
    return summary;
  }

  private async fetchQuota(): Promise<{ storageUsed: number; storageLimit: number } | null> {
    try {
      const token = await this.options.getToken();
      const res = await fetch(`${this.options.serverUrl}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const d = (await res.json()) as { storageUsed?: number; storageLimit?: number };
      return { storageUsed: d.storageUsed || 0, storageLimit: d.storageLimit || 0 };
    } catch {
      return null;
    }
  }

  // ---- Upload ----------------------------------------------------------

  async start(): Promise<void> {
    if (this.running) return;
    const queue = this.items.filter((i) => !this.state.uploaded[i.key]);
    if (queue.length === 0) {
      this.emit({ phase: 'done', message: 'Sve je već uvezeno.' });
      return;
    }

    this.running = true;
    this.stopRequested = false;
    const totalBytes = queue.reduce((s, i) => s + i.entry.size, 0);
    this.emit({
      phase: 'uploading', totalFiles: queue.length, totalBytes,
      doneFiles: 0, doneBytes: 0, failedFiles: 0, message: undefined,
    });
    this.log(`Počinjem uvoz ${queue.length} fajlova.`);

    let fatal: Error | null = null;
    let sinceSave = 0;
    const worker = async () => {
      while (!this.stopRequested && !fatal) {
        const item = queue.shift();
        if (!item) return;
        this.emit({ currentFile: item.name });
        try {
          const fileId = await this.uploadWithRetry(item);
          this.state.uploaded[item.key] = { fileId, at: Date.now() };
          if (++sinceSave >= 10) {
            this.saveState();
            sinceSave = 0;
          }
          this.emit({ doneFiles: this.progress.doneFiles + 1 });
        } catch (err: any) {
          if (err instanceof QuotaExceededError) {
            fatal = err;
            return;
          }
          this.log(`✗ ${item.name}: ${err.message || err}`);
          this.emit({ failedFiles: this.progress.failedFiles + 1 });
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    } finally {
      this.saveState();
      this.running = false;
    }

    if (fatal) {
      this.emit({ phase: 'error', currentFile: undefined, message: 'Nema više mesta na nalogu. Nadogradi plan pa nastavi — uvezeno ostaje sačuvano.' });
      this.log('✗ Uvoz zaustavljen: kvota je popunjena.');
    } else if (this.stopRequested) {
      this.emit({ phase: 'stopped', currentFile: undefined, message: 'Uvoz pauziran. Možeš da nastaviš kasnije.' });
      this.log('Uvoz pauziran.');
    } else {
      const failed = this.progress.failedFiles;
      this.emit({
        phase: 'done', currentFile: undefined,
        message: failed > 0 ? `Gotovo, ali ${failed} fajlova nije uspelo — pokreni uvoz ponovo da ih pokušaš opet.` : 'Gotovo! Sve slike su na MyPhoto.',
      });
      this.log(`✓ Uvoz završen (${this.progress.doneFiles} uspešno, ${failed} neuspešno).`);
    }
  }

  stop(): void {
    this.stopRequested = true;
  }

  private async uploadWithRetry(item: MediaItem): Promise<string> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      let counted = 0;
      try {
        return await this.uploadOne(item, (n) => {
          counted += n;
          this.emit({ doneBytes: this.progress.doneBytes + n });
        });
      } catch (err) {
        // Roll back this attempt's bytes so the progress bar stays honest.
        this.emit({ doneBytes: this.progress.doneBytes - counted });
        if (err instanceof QuotaExceededError) throw err;
        lastErr = err;
        if (this.stopRequested) break;
        await sleep(Math.min(2000 * 2 ** attempt, 30000));
      }
    }
    throw lastErr;
  }

  private async api(method: string, pathname: string, body?: unknown): Promise<Response> {
    for (;;) {
      const token = await this.options.getToken();
      const res = await fetch(`${this.options.serverUrl}${pathname}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      // The upload endpoint is rate-limited (100/min); wait the window out.
      if (res.status === 429) {
        await sleep(20000);
        continue;
      }
      return res;
    }
  }

  private folderFor(item: MediaItem): Promise<string> {
    const sub = item.takenMs ? String(new Date(item.takenMs).getFullYear()) : NO_DATE_FOLDER_NAME;
    return this.ensureFolder([ROOT_FOLDER_NAME, sub]);
  }

  /** Resolve a folder path from the MySpace root, creating missing levels.
   *  Memoized per level, so parallel workers that need "Google Photos/2019"
   *  and "Google Photos/2020" at the same time share ONE "Google Photos". */
  private ensureFolder(segments: string[]): Promise<string> {
    const key = segments.join('/');
    const cached = this.folderIds.get(key);
    if (cached) return cached;
    const p = (async () => {
      const parentId = segments.length > 1 ? await this.ensureFolder(segments.slice(0, -1)) : 'root';
      const name = segments[segments.length - 1];
      const existing = await this.findFolder(name, parentId);
      if (existing) return existing;
      const res = await this.api('POST', '/api/folders', { name, parentId });
      if (res.status === 409) {
        // Created by another client between our lookup and create.
        const raced = await this.findFolder(name, parentId);
        if (raced) return raced;
      }
      if (!res.ok) throw new Error(`Folder create failed: ${res.status}`);
      const created = (await res.json()) as { id?: string; folderId?: string };
      const id = created.id || created.folderId;
      if (!id) throw new Error('Folder create returned no id');
      return id;
    })();
    // Don't cache a failure — the next item should try again.
    p.catch(() => this.folderIds.delete(key));
    this.folderIds.set(key, p);
    return p;
  }

  private async findFolder(name: string, parentId: string): Promise<string | null> {
    const res = await this.api('GET', `/api/folders?parentId=${encodeURIComponent(parentId)}`);
    if (!res.ok) throw new Error(`Folder lookup failed: ${res.status}`);
    const data = (await res.json()) as { folders?: Array<{ id: string; name: string }> };
    return (data.folders || []).find((f) => f.name === name)?.id || null;
  }

  private async uploadOne(item: MediaItem, onBytes: (n: number) => void): Promise<string> {
    const folderId = await this.folderFor(item);
    const size = item.entry.size;

    const urlRes = await this.api('POST', '/api/disk-files', {
      filename: item.name, mimeType: item.mimeType, size, folderId,
    });
    if (urlRes.status === 403) {
      const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
      if (/quota/i.test(err.error || '')) throw new QuotaExceededError();
      throw new Error(err.error || 'Forbidden');
    }
    if (!urlRes.ok) {
      const err = (await urlRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `Upload URL failed: ${urlRes.status}`);
    }
    const { uploadUrl, fileId, s3Key } = (await urlRes.json()) as { uploadUrl: string; fileId: string; s3Key: string };

    const stream = await this.openStream(item.entry);
    stream.on('data', (chunk: Buffer) => onBytes(chunk.length));
    await putStream(uploadUrl, stream, size, item.mimeType);

    const confirm = await this.api('PATCH', '/api/disk-files', {
      fileId, s3Key, filename: item.name, mimeType: item.mimeType, size, folderId,
      ...(item.takenMs ? { takenAt: item.takenMs } : {}),
    });
    if (!confirm.ok) throw new Error(`Confirm failed: ${confirm.status}`);
    return fileId;
  }

  dispose(): void {
    this.stop();
    this.closeSources();
  }
}

/** Stream a body to a presigned S3 PUT URL. fetch() can't send a stream with
 *  a fixed Content-Length (S3 rejects chunked uploads), and buffering a
 *  multi-GB video in memory isn't an option either. */
function putStream(url: string, stream: Readable, size: number, contentType: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const client = u.protocol === 'http:' ? http : https; // http only for local tests
    const req = client.request(
      {
        method: 'PUT',
        hostname: u.hostname,
        port: u.port || undefined,
        path: u.pathname + u.search,
        headers: { 'Content-Type': contentType, 'Content-Length': size },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { if (body.length < 500) body += c; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode < 300) resolve();
          else reject(new Error(`S3 upload failed: ${res.statusCode} ${body.slice(0, 200)}`));
        });
      }
    );
    req.on('error', reject);
    stream.on('error', (err) => {
      req.destroy(err);
      reject(err);
    });
    stream.pipe(req);
  });
}
