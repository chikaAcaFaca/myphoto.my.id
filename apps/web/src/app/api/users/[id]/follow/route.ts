import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/users/[id]/follow — toggle follow state for the current user.
// Maintains both sides (following / followers subcollections) plus the
// followerCount / followingCount counters, all inside one transaction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { id: targetId } = await params;
    if (targetId === userId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const targetRef = db.collection('users').doc(targetId);
    const followerRef = db.collection('users').doc(userId);
    const followingEdge = followerRef.collection('following').doc(targetId);
    const followerEdge = targetRef.collection('followers').doc(userId);

    const result = await db.runTransaction(async (tx) => {
      const targetSnap = await tx.get(targetRef);
      if (!targetSnap.exists) return null;

      const edgeSnap = await tx.get(followingEdge);
      const now = new Date();

      if (edgeSnap.exists) {
        // Unfollow
        tx.delete(followingEdge);
        tx.delete(followerEdge);
        tx.update(targetRef, { followerCount: FieldValue.increment(-1) });
        tx.update(followerRef, { followingCount: FieldValue.increment(-1) });
        return { isFollowing: false };
      } else {
        // Follow
        tx.set(followingEdge, { createdAt: now });
        tx.set(followerEdge, { createdAt: now });
        tx.set(targetRef, { followerCount: FieldValue.increment(1) }, { merge: true });
        tx.set(followerRef, { followingCount: FieldValue.increment(1) }, { merge: true });
        return { isFollowing: true };
      }
    });

    if (!result) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Follow toggle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
