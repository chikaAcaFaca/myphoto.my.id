import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';
import { getObject } from '@/lib/s3';

type ThumbnailSize = 'small' | 'medium' | 'large';

const SIZE_KEYS: Record<ThumbnailSize, string> = {
  small: 'smallThumbKey',
  medium: 'thumbnailKey',
  large: 'largeThumbKey',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    // Check IP-based rate limit for public thumbnail endpoint
    const rateLimitResult = await checkIpRateLimit(request, 'download');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const { fileId } = params;

    // Parse size param (default: medium)
    const url = new URL(request.url);
    const sizeParam = url.searchParams.get('size') as ThumbnailSize | null;
    const size: ThumbnailSize = sizeParam && SIZE_KEYS[sizeParam] ? sizeParam : 'medium';

    // Get file document
    const fileDoc = await db.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // Pick the best available key for the requested size
    // Fallback chain: requested size → medium (thumbnailKey) → skip (don't serve original video!)
    const key =
      fileData[SIZE_KEYS[size]] ||
      fileData.thumbnailKey ||
      (size !== 'large' ? fileData.thumbnailKey : null);

    if (!key) {
      // No thumbnail available at all — return a 404 instead of serving the original file
      // (avoids serving full-size videos as "thumbnails")
      return NextResponse.json({ error: 'Thumbnail not available' }, { status: 404 });
    }

    // Proxy the object from S3
    const { body, contentType } = await getObject(key);

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
