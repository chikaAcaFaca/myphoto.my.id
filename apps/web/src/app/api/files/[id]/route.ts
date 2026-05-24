import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET /api/files/[id] — return a single file's metadata. Used by the mobile
// "Info" sheet and any deep-link that lands on a specific file. Generates
// presigned thumbnail URLs so the client can render previews without a
// second round-trip.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { id } = await params;
  const fileDoc = await db.collection('files').doc(id).get();
  if (!fileDoc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const data = fileDoc.data()!;
  if (data.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const file: Record<string, unknown> = {
    id: fileDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
    takenAt: data.takenAt?.toDate?.()?.toISOString() || data.takenAt || null,
    trashedAt: data.trashedAt?.toDate?.()?.toISOString() || data.trashedAt || null,
  };

  if (data.smallThumbKey) {
    try { file.smallThumbUrl = await generateDownloadUrl(data.smallThumbKey); } catch {}
  }
  if (data.thumbnailKey) {
    try { file.thumbnailUrl = await generateDownloadUrl(data.thumbnailKey); } catch {}
  }

  return NextResponse.json({ file });
}

// PATCH /api/files/[id] — toggle isFavorite / isArchived / isTrashed and
// other writable scalar fields. Mobile's heart, archive, and soft-delete
// actions all funnel through here. We only allow a small whitelist of
// keys so callers can't overwrite arbitrary metadata.
const WRITABLE_FIELDS = new Set([
  'isFavorite',
  'isArchived',
  'isTrashed',
  'name',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (WRITABLE_FIELDS.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No writable fields in body' }, { status: 400 });
  }

  const { id } = await params;
  const fileRef = db.collection('files').doc(id);
  const fileDoc = await fileRef.get();
  if (!fileDoc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  if (fileDoc.data()?.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Soft-delete bookkeeping: when isTrashed flips to true, stamp trashedAt;
  // when it flips back to false, clear it. The trash list / 30-day purge
  // job both rely on this field, so the soft-delete path must keep it
  // honest even when callers only PATCH {isTrashed: true}.
  const now = new Date();
  if (update.isTrashed === true) update.trashedAt = now;
  if (update.isTrashed === false) update.trashedAt = null;
  update.updatedAt = now;

  await fileRef.update(update);
  return NextResponse.json({ success: true, id });
}
