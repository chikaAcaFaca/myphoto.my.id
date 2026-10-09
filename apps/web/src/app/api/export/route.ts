import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/export → { items: [{ path, size, url }] }
 *
 * Everything the user stores, de-duplicated by S3 object (a MySpace backup
 * of a photo has both a files and a diskFiles doc), with presigned download
 * URLs valid for 6 hours. The /keep-files page downloads them straight from
 * storage — into a chosen folder, or as ZIP parts — so nothing large passes
 * through a serverless function.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'download');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  const [diskSnap, filesSnap] = await Promise.all([
    db.collection('diskFiles').where('userId', '==', userId).where('isTrashed', '==', false).get(),
    db.collection('files').where('userId', '==', userId).where('isTrashed', '==', false).get(),
  ]);

  const seen = new Set<string>();
  const used = new Set<string>();
  const entries: { path: string; size: number; s3Key: string }[] = [];
  const uniquePath = (path: string) => {
    let candidate = path;
    for (let i = 1; used.has(candidate.toLowerCase()); i++) {
      const dot = path.lastIndexOf('.');
      candidate = dot > path.lastIndexOf('/') ? `${path.slice(0, dot)} (${i})${path.slice(dot)}` : `${path} (${i})`;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  };
  const safe = (name: string) => (name || 'file').replace(/[\\/:*?"<>|]/g, '_');

  for (const doc of diskSnap.docs) {
    const d = doc.data();
    if (!d.s3Key || seen.has(d.s3Key)) continue;
    seen.add(d.s3Key);
    entries.push({ path: uniquePath(`MySpace/${safe(d.name)}`), size: d.size || 0, s3Key: d.s3Key });
  }
  for (const doc of filesSnap.docs) {
    const f = doc.data();
    if (!f.s3Key || seen.has(f.s3Key)) continue;
    seen.add(f.s3Key);
    const when: Date | null = f.takenAt?.toDate?.() ?? f.createdAt?.toDate?.() ?? null;
    const folder = when ? `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}` : 'unknown-date';
    entries.push({ path: uniquePath(`Photos/${folder}/${safe(f.name)}`), size: f.size || 0, s3Key: f.s3Key });
  }

  const items = await Promise.all(
    entries.map(async (e) => ({
      path: e.path,
      size: e.size,
      url: await generateDownloadUrl(e.s3Key, { expiresIn: 6 * 3600 }),
    }))
  );
  return NextResponse.json({ items });
}
