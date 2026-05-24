import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { deleteObject } from '@/lib/s3';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/files/[id]/permanent-delete — wipe a single file from S3 +
// Firestore and decrement the owner's storageUsed. Same semantics as the
// bulk /api/files/delete but for a single ID, exposed so the mobile trash
// screen can route its "delete forever" button to a stable URL.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { id } = await params;
  const ref = db.collection('files').doc(id);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const data = doc.data()!;
  if (data.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Best-effort: keep going even if S3 dies — we still want the Firestore
  // record gone so it stops showing up in the trash list.
  const keys = [data.s3Key, data.thumbnailKey, data.smallThumbKey, data.largeThumbKey].filter(Boolean);
  await Promise.all(
    keys.map((key: string) => deleteObject(key).catch((err) => {
      console.error(`Failed to delete S3 key ${key}:`, err);
    }))
  );

  await ref.delete();

  const sizeFreed = data.size || 0;
  if (sizeFreed > 0) {
    await db.collection('users').doc(auth.userId).update({
      storageUsed: FieldValue.increment(-sizeFreed),
    });
  }

  return NextResponse.json({ success: true, id, freed: sizeFreed });
}
