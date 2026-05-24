import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/meme-wall/[id]/favorite — toggle "save to favorites" for the
// current user. Mirrors the react/follow pattern: membership lives in two
// places (the meme's favorites subcollection + the user's savedMemes, so a
// "Saved" view can list them later) and a `favorites` counter on the meme doc
// stays in sync, all in one transaction.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { id } = await params;
    const memeRef = db.collection('memes').doc(id);
    const favRef = memeRef.collection('favorites').doc(userId);
    const userFavRef = db.collection('users').doc(userId).collection('savedMemes').doc(id);

    const result = await db.runTransaction(async (tx) => {
      const memeSnap = await tx.get(memeRef);
      if (!memeSnap.exists) return null;
      const existing = await tx.get(favRef);
      const now = new Date();

      if (existing.exists) {
        tx.delete(favRef);
        tx.delete(userFavRef);
        tx.update(memeRef, { favorites: FieldValue.increment(-1) });
        return { favorited: false, favorites: Math.max(0, (memeSnap.data()!.favorites || 0) - 1) };
      } else {
        tx.set(favRef, { createdAt: now });
        tx.set(userFavRef, { memeId: id, authorId: memeSnap.data()!.authorId || null, createdAt: now });
        tx.set(memeRef, { favorites: FieldValue.increment(1) }, { merge: true });
        return { favorited: true, favorites: (memeSnap.data()!.favorites || 0) + 1 };
      }
    });

    if (!result) return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Meme favorite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
