import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Verify access to a file via session cookie or share token.
 * Returns { authorized: true } or { authorized: false, response }.
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
          // Album share: fileId must be in albumFileIds
          const albumFileIds: string[] = sharedData.albumFileIds || [];
          if (albumFileIds.includes(fileId)) {
            return { authorized: true };
          }
          return {
            authorized: false,
            response: NextResponse.json({ error: 'File not in shared album' }, { status: 403 }),
          };
        } else {
          // Single file share: fileId must match
          if (sharedData.fileId === fileId) {
            return { authorized: true };
          }
          return {
            authorized: false,
            response: NextResponse.json({ error: 'File not matching share' }, { status: 403 }),
          };
        }
      }
    }
  }

  // Neither valid session nor valid share token
  return {
    authorized: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
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

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // Access control check
    const access = await verifyAccess(request, fileId, fileData);
    if (!access.authorized) {
      return access.response;
    }

    const key = fileData.s3Key;
    if (!key) {
      return NextResponse.json({ error: 'File has no storage key' }, { status: 404 });
    }

    // Redirect to presigned S3 URL — zero Vercel bandwidth usage
    const presignedUrl = await generateDownloadUrl(key);
    return NextResponse.redirect(presignedUrl, 302);
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const rateLimitResult = await checkIpRateLimit(request, 'download');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const { fileId } = params;
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return new NextResponse(null, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // Access control check
    const access = await verifyAccess(request, fileId, fileData);
    if (!access.authorized) {
      return new NextResponse(null, { status: 401 });
    }

    const key = fileData.s3Key;
    if (!key) {
      return new NextResponse(null, { status: 404 });
    }

    // Redirect to presigned S3 URL
    const presignedUrl = await generateDownloadUrl(key);
    return NextResponse.redirect(presignedUrl, 302);
  } catch (error) {
    console.error('Error in HEAD request:', error);
    return new NextResponse(null, { status: 500 });
  }
}
