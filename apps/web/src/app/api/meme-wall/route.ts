import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateUploadUrl, generateDownloadUrl, getObjectBuffer, putObjectBuffer } from '@/lib/s3';
import { renderMeme } from '@/lib/meme-render';
import { generateFileId } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

// GET /api/meme-wall — public listing of memes (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '30', 10), 100);
    const offset = (page - 1) * pageSize;

    let snapshot;
    try {
      snapshot = await db.collection('memes')
        .where('isPublic', '==', true)
        .orderBy('createdAt', 'desc')
        .offset(offset)
        .limit(pageSize + 1)
        .get();
    } catch (e: any) {
      console.error('MemeWall query failed:', e.code, e.message);
      // Fallback: try without ordering (no composite index needed)
      try {
        snapshot = await db.collection('memes')
          .where('isPublic', '==', true)
          .limit(pageSize + 1)
          .get();
      } catch (e2: any) {
        console.error('MemeWall fallback query failed:', e2.message);
        return NextResponse.json({ memes: [], hasMore: false, page });
      }
    }

    const hasMore = snapshot.docs.length > pageSize;
    const memes = await Promise.all(
      snapshot.docs.slice(0, pageSize).map(async (doc) => {
        const data = doc.data();
        let imageUrl = data.imageUrl || '';
        if (data.s3Key && !imageUrl) {
          try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
        }
        return {
          id: doc.id,
          caption: data.caption || '',
          topText: data.topText || '',
          bottomText: data.bottomText || '',
          imageUrl,
          authorName: data.authorName || 'Anonymous',
          authorId: data.authorId,
          likes: data.likes || 0,
          shares: data.shares || 0,
          views: data.views || 0,
          template: data.template || 'classic',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        };
      })
    );

    return NextResponse.json({ memes, hasMore, page });
  } catch (error) {
    console.error('MemeWall GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall — publish a meme (auth required)
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
      shares: 0,
      views: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Resolve source photo (if user is making a meme from an existing MyPhoto
    // file). We need its s3Key both for attribution and for server-side
    // rendering — for clients that can't bake the text into the image (mobile).
    let sourceS3Key: string | null = null;
    if (fileId) {
      const fileDoc = await db.collection('files').doc(fileId).get();
      if (fileDoc.exists && fileDoc.data()?.userId === userId) {
        memeData.sourceFileId = fileId;
        sourceS3Key = fileDoc.data()!.s3Key || null;
      }
    }

    let uploadUrl: string | null = null;
    const memeKey = `memes/${userId}/${memeId}.jpg`;

    if (sourceS3Key && (topText || bottomText)) {
      // Server-side render: fetch the source photo, bake the meme text in, and
      // upload the result. Mobile relies on this because it can't render text
      // into the image client-side.
      try {
        const source = await getObjectBuffer(sourceS3Key);
        const rendered = await renderMeme(source, topText || '', bottomText || '');
        await putObjectBuffer(memeKey, rendered, 'image/jpeg');
        memeData.s3Key = memeKey;
      } catch (e: any) {
        console.error('Server-side meme render failed:', e?.message || e);
        // Fall through to the upload-URL flow so the client can still upload
        // the rendered version (e.g. web canvas-rendered).
        if (imageData) {
          const { url } = await generateUploadUrl(memeKey, 'image/jpeg');
          memeData.s3Key = memeKey;
          uploadUrl = url;
        }
      }
    } else if (imageData) {
      // No source photo on S3 — generate an upload URL and let the client PUT
      // the rendered meme (the web canvas path).
      const { url } = await generateUploadUrl(memeKey, 'image/jpeg');
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
