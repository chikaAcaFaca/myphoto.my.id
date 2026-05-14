import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/meme-wall/[id]/react — toggle like/dislike for the current user.
// Body: { type: 'like' | 'dislike' }
// Posting the same type again clears the reaction; posting the other type
// switches it. Counters on the meme doc are kept in sync inside a transaction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const type = body?.type;
    if (type !== 'like' && type !== 'dislike') {
      return NextResponse.json({ error: "type must be 'like' or 'dislike'" }, { status: 400 });
    }

    const memeRef = db.collection('memes').doc(id);
    const reactionRef = memeRef.collection('reactions').doc(userId);

    const result = await db.runTransaction(async (tx) => {
      const memeSnap = await tx.get(memeRef);
      if (!memeSnap.exists) return null;

      const existing = await tx.get(reactionRef);
      const prev: 'like' | 'dislike' | null = existing.exists ? existing.data()!.type : null;

      let likeDelta = 0;
      let dislikeDelta = 0;
      let next: 'like' | 'dislike' | null;

      if (prev === type) {
        // Toggle off
        next = null;
        if (type === 'like') likeDelta = -1; else dislikeDelta = -1;
        tx.delete(reactionRef);
      } else {
        next = type;
        if (prev === 'like') likeDelta -= 1;
        if (prev === 'dislike') dislikeDelta -= 1;
        if (type === 'like') likeDelta += 1; else dislikeDelta += 1;
        tx.set(reactionRef, { type, createdAt: new Date() });
      }

      const updates: Record<string, any> = {};
      if (likeDelta) updates.likes = FieldValue.increment(likeDelta);
      if (dislikeDelta) updates.dislikes = FieldValue.increment(dislikeDelta);
      if (Object.keys(updates).length) tx.update(memeRef, updates);

      const data = memeSnap.data()!;
      return {
        userReaction: next,
        likes: Math.max(0, (data.likes || 0) + likeDelta),
        dislikes: Math.max(0, (data.dislikes || 0) + dislikeDelta),
      };
    });

    if (!result) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Meme react error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
