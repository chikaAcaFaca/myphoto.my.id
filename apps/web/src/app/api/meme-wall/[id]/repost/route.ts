import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// POST /api/meme-wall/[id]/repost — toggle "repost to my profile" for the
// current user. Membership lives in the meme's reposts subcollection + the
// user's reposts subcollection (so their profile can surface reposted memes),
// with a `reposts` counter on the meme doc, all in one transaction.
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
    const repostRef = memeRef.collection('reposts').doc(userId);
    const userRepostRef = db.collection('users').doc(userId).collection('reposts').doc(id);

    const result = await db.runTransaction(async (tx) => {
      const memeSnap = await tx.get(memeRef);
      if (!memeSnap.exists) return null;
      const existing = await tx.get(repostRef);
      const now = new Date();

      if (existing.exists) {
        tx.delete(repostRef);
        tx.delete(userRepostRef);
        tx.update(memeRef, { reposts: FieldValue.increment(-1) });
        return { reposted: false, reposts: Math.max(0, (memeSnap.data()!.reposts || 0) - 1) };
      } else {
        tx.set(repostRef, { createdAt: now });
        tx.set(userRepostRef, { memeId: id, authorId: memeSnap.data()!.authorId || null, createdAt: now });
        tx.set(memeRef, { reposts: FieldValue.increment(1) }, { merge: true });
        return { reposted: true, reposts: (memeSnap.data()!.reposts || 0) + 1 };
      }
    });

    if (!result) return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Meme repost error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
