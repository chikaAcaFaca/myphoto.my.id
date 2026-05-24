import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit, getOptionalUserId } from '@/lib/auth-utils';
import { generateUploadUrl, generateDownloadUrl } from '@/lib/s3';
import { generateFileId } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

// GET /api/meme-wall — public listing of memes, newest first (LIFO).
// Auth is optional: when a valid token is supplied we also return the
// caller's like/dislike state for each meme.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '30', 10), 100);
    const offset = (page - 1) * pageSize;

    let docs: FirebaseFirestore.QueryDocumentSnapshot[];
    try {
      const snapshot = await db.collection('memes')
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(pageSize + 1)
        .get();
      docs = snapshot.docs;
    } catch (e: any) {
      console.error('MemeWall query failed, using unordered fallback:', e.code, e.message);
      // Fallback when the composite index is missing: pull a wider slice and
      // sort/paginate in memory so the wall is still newest-first (LIFO).
      try {
        const snapshot = await db.collection('memes')
          .where('isPublic', '==', true)
          .limit(500)
          .get();
        const sorted = snapshot.docs.sort((a, b) => {
          const ta = a.data().createdAt?.toMillis?.() ?? 0;
          const tb = b.data().createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        docs = sorted.slice(offset, offset + pageSize + 1);
      } catch (e2: any) {
        console.error('MemeWall fallback query failed:', e2.message);
        return NextResponse.json({ memes: [], hasMore: false, page });
      }
    }

    const hasMore = docs.length > pageSize;
    const pageDocs = docs.slice(0, pageSize);

    // Optional auth — used only to surface the caller's reaction state.
    const viewerId = await getOptionalUserId(request);

    const memes = await Promise.all(
      pageDocs.map(async (doc) => {
        const data = doc.data();
        let imageUrl = data.imageUrl || '';
        if (data.s3Key && !imageUrl) {
          try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
        }

        let userReaction: 'like' | 'dislike' | null = null;
        let userFavorited = false;
        let userReposted = false;
        if (viewerId) {
          try {
            const [reactionDoc, favDoc, repostDoc] = await Promise.all([
              doc.ref.collection('reactions').doc(viewerId).get(),
              doc.ref.collection('favorites').doc(viewerId).get(),
              doc.ref.collection('reposts').doc(viewerId).get(),
            ]);
            if (reactionDoc.exists) userReaction = reactionDoc.data()!.type;
            userFavorited = favDoc.exists;
            userReposted = repostDoc.exists;
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
          favorites: data.favorites || 0,
          reposts: data.reposts || 0,
          views: data.views || 0,
          commentCount: data.commentCount || 0,
          template: data.template || 'classic',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          userReaction,
          userFavorited,
          userReposted,
        };
      })
    );

    return NextResponse.json({ memes, hasMore, page });
  } catch (error) {
    console.error('MemeWall GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall — publish a meme (auth required).
// The meme image (with top/bottom text already baked in) is rendered on the
// client — web via <canvas>, mobile via react-native-view-shot — and PUT to
// the returned uploadUrl. The server never renders the image.
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { caption, topText, bottomText, template, fontSize, mediaType, fileId, imageData } = body;

    if (!caption && !topText && !bottomText) {
      return NextResponse.json({ error: 'Meme must have text' }, { status: 400 });
    }

    // Get user info and check meme limits
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const authorName = userData?.displayName || 'Anonymous';
    const storageLimit = userData?.storageLimit || 0;
    const isFreeUser = storageLimit <= 1.5 * 1024 * 1024 * 1024; // ~1.5GB = free tier

    // Free users: max 20 memes per month
    if (isFreeUser) {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthlyMemes = await db.collection('memes')
          .where('authorId', '==', userId)
          .where('createdAt', '>=', monthStart)
          .count()
          .get();

        const count = monthlyMemes.data().count;
        if (count >= 20) {
          return NextResponse.json({
            error: 'Dostigli ste mesečni limit od 20 besplatnih memova. Nadogradite plan za neograničeno memova!',
          }, { status: 403 });
        }
      } catch (e: any) {
        // Index might not be ready yet — allow the request through
        console.warn('Meme count query failed (allowing):', e.message);
      }
    }

    const now = new Date();
    const memeId = generateFileId();

    const memeData: Record<string, any> = {
      authorId: userId,
      authorName,
      caption: caption || [topText, bottomText].filter(Boolean).join(' '),
      topText: topText || '',
      bottomText: bottomText || '',
      template: template || 'classic',
      fontSize: fontSize || 32,
      mediaType: mediaType || 'image',
      isPublic: true,
      likes: 0,
      dislikes: 0,
      shares: 0,
      views: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Keep a link back to the source MyPhoto file for attribution, if any.
    if (fileId) {
      const fileDoc = await db.collection('files').doc(fileId).get();
      if (fileDoc.exists && fileDoc.data()?.userId === userId) {
        memeData.sourceFileId = fileId;
      }
    }

    // The client uploads the rendered media here. Image memes are baked to JPG;
    // video/gif memes upload the original media (text is overlaid at display
    // time since we can't composite it into a video on-device).
    let uploadUrl: string | null = null;
    if (imageData) {
      const ext = mediaType === 'video' ? 'mp4' : mediaType === 'gif' ? 'gif' : 'jpg';
      const contentType =
        mediaType === 'video' ? 'video/mp4' : mediaType === 'gif' ? 'image/gif' : 'image/jpeg';
      const memeKey = `memes/${userId}/${memeId}.${ext}`;
      const { url } = await generateUploadUrl(memeKey, contentType);
      memeData.s3Key = memeKey;
      uploadUrl = url;
    }

    await db.collection('memes').doc(memeId).set(memeData);

    return NextResponse.json({
      id: memeId,
      shareUrl: `/meme/${memeId}`,
      uploadUrl,
    });
  } catch (error) {
    console.error('MemeWall POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
