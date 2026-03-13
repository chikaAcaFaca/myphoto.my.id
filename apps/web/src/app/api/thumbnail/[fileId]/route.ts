import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';
import { getObject, objectExists } from '@/lib/s3';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

type ThumbnailSize = 'small' | 'medium' | 'large';

const SIZE_KEYS: Record<ThumbnailSize, string> = {
  small: 'smallThumbKey',
  medium: 'thumbnailKey',
  large: 'largeThumbKey',
};

/**
 * Verify access to a file via session cookie or share token.
 */
async function verifyAccess(
  request: NextRequest,
  fileId: string,
  fileData: Record<string, unknown>
): Promise<{ authorized: true } | { authorized: false; response: NextResponse }> {
  // Path 1: Session cookie (logged-in user viewing their own files)
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionCookie) {
    const userId = verifySessionToken(sessionCookie);
    if (userId && fileData.userId === userId) {
      return { authorized: true };
    }
  }

  // Path 2: Share token (public shared links)
  const url = new URL(request.url);
  const shareToken = url.searchParams.get('share');
  if (shareToken) {
    const sharedDoc = await db.collection('shared').doc(shareToken).get();
    if (sharedDoc.exists) {
      const sharedData = sharedDoc.data()!;
      if (sharedData.isActive) {
        if (sharedData.type === 'album') {
          const albumFileIds: string[] = sharedData.albumFileIds || [];
          if (albumFileIds.includes(fileId)) {
            return { authorized: true };
          }
          return { authorized: false, response: NextResponse.json({ error: 'File not in shared album' }, { status: 403 }) };
        } else {
          if (sharedData.fileId === fileId) {
            return { authorized: true };
          }
          return { authorized: false, response: NextResponse.json({ error: 'File not matching share' }, { status: 403 }) };
        }
      }
    }
  }

  return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
}

/**
 * Safely try to get an S3 object. Returns null if not found.
 */
async function safeGetObject(key: string): Promise<{ body: ReadableStream; contentType: string } | null> {
  try {
    return await getObject(key);
  } catch (error: any) {
    // S3 NoSuchKey, 404, or any other error
    console.warn(`S3 object not found: ${key}`, error?.name || error?.message);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const rateLimitResult = await checkIpRateLimit(request, 'download');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const { fileId } = params;
    const url = new URL(request.url);
    const sizeParam = url.searchParams.get('size') as ThumbnailSize | null;
    const size: ThumbnailSize = sizeParam && SIZE_KEYS[sizeParam] ? sizeParam : 'medium';

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    const access = await verifyAccess(request, fileId, fileData);
    if (!access.authorized) {
      return access.response;
    }

    // Build ordered list of S3 keys to try
    const keysToTry: string[] = [];

    // 1. Requested size
    const requestedKey = fileData[SIZE_KEYS[size]] as string | undefined;
    if (requestedKey) keysToTry.push(requestedKey);

    // 2. Medium thumbnail (most commonly available)
    if (fileData.thumbnailKey && !keysToTry.includes(fileData.thumbnailKey as string)) {
      keysToTry.push(fileData.thumbnailKey as string);
    }

    // 3. Small thumbnail
    if (fileData.smallThumbKey && !keysToTry.includes(fileData.smallThumbKey as string)) {
      keysToTry.push(fileData.smallThumbKey as string);
    }

    // 4. Large thumbnail
    if (fileData.largeThumbKey && !keysToTry.includes(fileData.largeThumbKey as string)) {
      keysToTry.push(fileData.largeThumbKey as string);
    }

    // 5. For images only: fall back to original file (will be served as-is)
    const isImage = (fileData.type === 'image' || (fileData.mimeType as string)?.startsWith('image/'));
    if (isImage && fileData.s3Key) {
      keysToTry.push(fileData.s3Key as string);
    }

    // Try each key in order until one works
    for (const key of keysToTry) {
      const result = await safeGetObject(key);
      if (result) {
        return new Response(result.body, {
          headers: {
            'Content-Type': result.contentType,
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }
    }

    // Nothing found at all
    return NextResponse.json({ error: 'Thumbnail not available' }, { status: 404 });
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
