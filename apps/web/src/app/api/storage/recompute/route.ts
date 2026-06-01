/**
 * POST /api/storage/recompute
 *
 * Recompute the authenticated user's `storageUsed` from the source of truth —
 * the sum of every non-trashed `files` (photos / videos / etc.) record plus
 * every non-trashed `diskFiles` record. The counter has drifted upward in
 * practice because soft-delete (PATCH isTrashed=true / DELETE on disk files)
 * was not decrementing it, leaving users stuck under the quota warning even
 * after they emptied a folder of APKs. This endpoint reconciles the drift in
 * one call so the user isn't stuck waiting on a Trash purge to free space they
 * already deleted.
 *
 * Safe to call any time — it's an idempotent recalculation; it never deletes
 * anything. We compute file/disk totals, sum, and write the corrected counter
 * back to the user doc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

async function sumNonTrashed(collection: 'files' | 'diskFiles', userId: string): Promise<number> {
  // Firestore doesn't support a server-side SUM aggregation on filtered docs
  // for arbitrary fields prior to a recent SDK; we scan + sum. Bounded by the
  // user's file count, which is at most a few thousand for the foreseeable
  // future — acceptable for an admin/reconcile endpoint.
  let total = 0;
  const snap = await db.collection(collection)
    .where('userId', '==', userId)
    .where('isTrashed', '==', false)
    .get();
  for (const doc of snap.docs) {
    const size = doc.data().size;
    if (typeof size === 'number' && size > 0) total += size;
  }
  return total;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const [filesBytes, diskBytes] = await Promise.all([
      sumNonTrashed('files', userId),
      sumNonTrashed('diskFiles', userId),
    ]);
    const recomputed = filesBytes + diskBytes;

    const userRef = db.collection('users').doc(userId);
    const before = (await userRef.get()).data()?.storageUsed || 0;
    await userRef.update({ storageUsed: recomputed });

    return NextResponse.json({
      success: true,
      before,
      after: recomputed,
      freedBytes: Math.max(0, before - recomputed),
      filesBytes,
      diskBytes,
    });
  } catch (error) {
    console.error('Storage recompute error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
