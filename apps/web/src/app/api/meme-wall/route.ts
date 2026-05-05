import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateUploadUrl, generateDownloadUrl } from '@/lib/s3';
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
      // Collection might not exist yet or index not ready
      if (e.code === 9 || e.message?.includes('index')) {
        return NextResponse.json({ memes: [], hasMore: false, page });
      }
      // If collection doesn't exist, return empty
      return NextResponse.json({ memes: [], hasMore: false, page });
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

    // Get user info for author name
    const userDoc = await db.collection('users').doc(userId).get();
    const authorName = userDoc.data()?.displayName || 'Anonymous';

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

    // If meme has a source photo from MyPhoto
    if (fileId) {
      const fileDoc = await db.collection('files').doc(fileId).get();
      if (fileDoc.exists && fileDoc.data()?.userId === userId) {
        const fileData = fileDoc.data()!;
        memeData.s3Key = fileData.s3Key;
        memeData.sourceFileId = fileId;
      }
    }

    // If meme image is uploaded as base64
    if (imageData) {
      const s3Key = `memes/${userId}/${memeId}.jpg`;
      const { url } = await generateUploadUrl(s3Key, 'image/jpeg', 5 * 1024 * 1024);
      memeData.s3Key = s3Key;
      memeData.uploadUrl = url;
    }

    await db.collection('memes').doc(memeId).set(memeData);

    return NextResponse.json({
      id: memeId,
      shareUrl: `/meme/${memeId}`,
      uploadUrl: memeData.uploadUrl || null,
    });
  } catch (error) {
    console.error('MemeWall POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
