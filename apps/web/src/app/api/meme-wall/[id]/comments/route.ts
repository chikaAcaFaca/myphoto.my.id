import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { generateFileId } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

const MAX_COMMENT_LENGTH = 500;

// GET /api/meme-wall/[id]/comments — public list of comments, newest first.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const memeRef = db.collection('memes').doc(id);
    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snap = await memeRef.collection('comments')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      docs = snap.docs;
    } catch {
      // Fallback if the index is unavailable: sort in memory.
      const snap = await memeRef.collection('comments').limit(200).get();
      docs = snap.docs.sort((a, b) => {
        const ta = a.data().createdAt?.toMillis?.() ?? 0;
        const tb = b.data().createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      }).slice(0, limit);
    }

    const comments = docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        authorId: d.authorId,
        authorName: d.authorName || 'Anonymous',
        text: d.text || '',
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall/[id]/comments — add a comment (auth required).
// Body: { text: string }
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
    const text = (body?.text || '').toString().trim();
    if (!text) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json({ error: `Comment too long (max ${MAX_COMMENT_LENGTH})` }, { status: 400 });
    }

    const memeRef = db.collection('memes').doc(id);
    const memeSnap = await memeRef.get();
    if (!memeSnap.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const authorName = userDoc.data()?.displayName || 'Anonymous';

    const commentId = generateFileId();
    const now = new Date();
    const commentRef = memeRef.collection('comments').doc(commentId);

    const batch = db.batch();
    batch.set(commentRef, { authorId: userId, authorName, text, createdAt: now });
    batch.update(memeRef, { commentCount: FieldValue.increment(1) });
    await batch.commit();

    return NextResponse.json({
      comment: {
        id: commentId,
        authorId: userId,
        authorName,
        text,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
