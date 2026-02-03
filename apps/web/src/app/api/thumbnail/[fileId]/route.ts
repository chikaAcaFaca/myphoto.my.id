import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

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

    // Get file document
    const fileDoc = await db.collection('files').doc(fileId).get();

    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // Use thumbnail if available, otherwise use original
    const key = fileData.thumbnailKey || fileData.s3Key;

    // Generate signed URL
    const url = await generateDownloadUrl(key);

    // Redirect to signed URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error getting thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
