import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { db } from '@/lib/firebase-admin';
import { after } from 'next/server';
import { generateDownloadUrl, getObjectBuffer, putObjectBuffer } from '@/lib/s3';

/**
 * Video memes are uploaded as the phone's original file (often 5–20 MB, 1080p
 * or 4K). The Meme Wall streams them on mobile data, so swiping stalled and
 * every visit re-downloaded tens of MB. Each video meme gets a 720p H.264 copy
 * (usually 1–3 MB, moov atom first so it starts playing at once) plus a poster
 * frame. The original stays for remix and download.
 *
 * Runs lazily: the feed schedules one unoptimised video per request after the
 * response is sent, so new and old memes are converted within minutes of
 * being viewed, with no cron and no app update.
 */

const LOCK_MS = 10 * 60 * 1000; // another run may retry after this
const MAX_ATTEMPTS = 3;

export function needsOptimization(data: FirebaseFirestore.DocumentData): boolean {
  return (
    data.mediaType === 'video' &&
    !!data.s3Key &&
    !data.optimizedKey &&
    (data.optimizeAttempts || 0) < MAX_ATTEMPTS &&
    !(data.optimizeStartedAt && Date.now() - data.optimizeStartedAt < LOCK_MS)
  );
}

function ffmpegPath(): string {
  // Loaded lazily so routes that never transcode don't resolve the binary.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@ffmpeg-installer/ffmpeg').path;
}

function run(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { timeout: 240_000, maxBuffer: 8 * 1024 * 1024 }, (err, _out, stderr) => {
      if (err) reject(new Error(`${err.message}\n${String(stderr).slice(-800)}`));
      else resolve();
    });
  });
}

/** Claim the meme (transaction), so concurrent feed requests convert it once. */
async function claim(memeId: string): Promise<FirebaseFirestore.DocumentData | null> {
  const ref = db.collection('memes').doc(memeId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data()!;
    if (!needsOptimization(data)) return null;
    tx.update(ref, {
      optimizeStartedAt: Date.now(),
      optimizeAttempts: (data.optimizeAttempts || 0) + 1,
    });
    return data;
  });
}

export async function optimizeMemeVideo(memeId: string): Promise<boolean> {
  const data = await claim(memeId);
  if (!data) return false;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'meme-'));
  const src = path.join(dir, 'in.mp4');
  const out = path.join(dir, 'out.mp4');
  const poster = path.join(dir, 'poster.jpg');
  try {
    await fs.writeFile(src, await getObjectBuffer(data.s3Key));
    const bin = ffmpegPath();
    await run(bin, [
      '-y', '-i', src,
      '-vf', "scale='min(720,iw)':-2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30',
      '-maxrate', '1200k', '-bufsize', '2400k', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
      '-movflags', '+faststart',
      out,
    ]);
    await run(bin, ['-y', '-ss', '0.3', '-i', out, '-frames:v', '1', '-vf', "scale='min(720,iw)':-2", '-q:v', '5', poster]);

    const [video, frame, original] = await Promise.all([
      fs.readFile(out),
      fs.readFile(poster).catch(() => null),
      fs.stat(src),
    ]);
    const base = data.s3Key.replace(/\.[^./]+$/, '');
    // Keep the original when the "optimised" copy isn't actually smaller.
    const useCopy = video.length < original.size;
    const optimizedKey = useCopy ? `${base}.720.mp4` : data.s3Key;
    if (useCopy) await putObjectBuffer(optimizedKey, video, 'video/mp4');
    const posterKey = frame ? `${base}.poster.jpg` : null;
    if (frame && posterKey) await putObjectBuffer(posterKey, frame, 'image/jpeg');

    await db.collection('memes').doc(memeId).update({
      optimizedKey,
      ...(posterKey ? { posterKey } : {}),
      optimizedSize: useCopy ? video.length : original.size,
      optimizeStartedAt: null,
    });
    return true;
  } catch (e: any) {
    console.error('Meme video optimise failed', memeId, e?.message || e);
    return false;
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Media URLs for a meme doc: the 720p copy when it exists, and a URL that
 * stays the same all day so phones and browsers can cache the file.
 */
export async function memeMediaUrls(
  data: FirebaseFirestore.DocumentData
): Promise<{ imageUrl: string; posterUrl: string | null }> {
  let imageUrl: string = data.imageUrl || '';
  const key = data.optimizedKey || data.s3Key;
  if (!imageUrl && key) {
    try { imageUrl = await generateDownloadUrl(key, { stable: true }); } catch {}
  }
  let posterUrl: string | null = null;
  if (data.posterKey) {
    try { posterUrl = await generateDownloadUrl(data.posterKey, { stable: true }); } catch {}
  }
  return { imageUrl, posterUrl };
}

/** After the response is sent, convert one not-yet-optimised video from this page. */
export function scheduleOptimization(docs: Array<{ id: string; data: () => FirebaseFirestore.DocumentData | undefined }>) {
  const doc = docs.find((d) => {
    const data = d.data();
    return !!data && needsOptimization(data);
  });
  if (!doc) return;
  try {
    after(() => optimizeMemeVideo(doc.id).then(() => undefined));
  } catch {
    // Outside a request scope (scripts): skip.
  }
}
