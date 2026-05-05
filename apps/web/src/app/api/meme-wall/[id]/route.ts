import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl } from '@/lib/s3';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

// GET /api/meme-wall/[id] — get single meme (public, no auth)
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
    let imageUrl = '';
    if (data.s3Key) {
      try { imageUrl = await generateDownloadUrl(data.s3Key); } catch {}
    }

    // Increment view count
    await doc.ref.update({ views: FieldValue.increment(1) });

    return NextResponse.json({
      id: doc.id,
      caption: data.caption || '',
      topText: data.topText || '',
      bottomText: data.bottomText || '',
      imageUrl,
      authorName: data.authorName || 'Anonymous',
      likes: data.likes || 0,
      shares: data.shares || 0,
      views: (data.views || 0) + 1,
      template: data.template || 'classic',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error('Meme GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/meme-wall/[id]/like or /share
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.pathname.endsWith('/share') ? 'share' : 'like';

    const doc = await db.collection('memes').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    if (action === 'share') {
      await doc.ref.update({ shares: FieldValue.increment(1) });
    } else {
      await doc.ref.update({ likes: FieldValue.increment(1) });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meme action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
