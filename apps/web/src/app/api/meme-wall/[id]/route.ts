import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl } from '@/lib/s3';
import { getOptionalUserId } from '@/lib/auth-utils';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET /api/meme-wall/[id] — single meme (public). Increments the view count.
// When the caller is authenticated, also returns their like/dislike state.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection('memes').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    const data = doc.data()!;
    let imageUrl = data.imageUrl || '';
    if (data.s3Key && !imageUrl) {
      try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
    }

    const viewerId = await getOptionalUserId(request);
    let userReaction: 'like' | 'dislike' | null = null;
    if (viewerId) {
      try {
        const r = await doc.ref.collection('reactions').doc(viewerId).get();
        if (r.exists) userReaction = r.data()!.type;
      } catch {}
    }

    // Increment view count (best-effort).
    try { await doc.ref.update({ views: FieldValue.increment(1) }); } catch {}

    return NextResponse.json({
      id: doc.id,
      caption: data.caption || '',
      topText: data.topText || '',
      bottomText: data.bottomText || '',
      imageUrl,
      mediaType: data.mediaType || 'image',
      authorName: data.authorName || 'Anonymous',
      authorId: data.authorId,
      likes: data.likes || 0,
      dislikes: data.dislikes || 0,
      shares: data.shares || 0,
      views: (data.views || 0) + 1,
      commentCount: data.commentCount || 0,
      template: data.template || 'classic',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      userReaction,
    });
  } catch (error) {
    console.error('Meme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall/[id] — register a share (increments the share counter).
// Like/dislike now live at /api/meme-wall/[id]/react.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = await db.collection('memes').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }
    await doc.ref.update({ shares: FieldValue.increment(1) });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meme share error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
