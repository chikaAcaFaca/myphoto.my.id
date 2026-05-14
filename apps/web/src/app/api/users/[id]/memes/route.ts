import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { getOptionalUserId } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET /api/users/[id]/memes — public list of a user's memes, newest first.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '30', 10), 100);

    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snap = await db.collection('memes')
        .where('authorId', '==', id)
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .get();
      docs = snap.docs;
    } catch {
      // Fallback without the composite index. Strict isPublic === true so a
      // missing/false flag never leaks a meme into the public profile.
      const snap = await db.collection('memes')
        .where('authorId', '==', id)
        .limit(200)
        .get();
      docs = snap.docs
        .filter((d) => d.data().isPublic === true)
        .sort((a, b) => {
          const ta = a.data().createdAt?.toMillis?.() ?? 0;
          const tb = b.data().createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        })
        .slice(0, pageSize);
    }

    const viewerId = await getOptionalUserId(request);

    const memes = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        let imageUrl = data.imageUrl || '';
        if (data.s3Key && !imageUrl) {
          try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
        }
        let userReaction: 'like' | 'dislike' | null = null;
        if (viewerId) {
          try {
            const r = await doc.ref.collection('reactions').doc(viewerId).get();
            if (r.exists) userReaction = r.data()!.type;
          } catch {}
        }
        return {
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
          views: data.views || 0,
          commentCount: data.commentCount || 0,
          template: data.template || 'classic',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          userReaction,
        };
      })
    );

    return NextResponse.json({ memes });
  } catch (error) {
    console.error('User memes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
