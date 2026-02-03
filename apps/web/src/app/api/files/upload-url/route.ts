import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateUploadUrl } from '@/lib/s3';
import { generateS3Key, generateFileId, getFileExtension, isSupportedMimeType, MAX_UPLOAD_SIZE } from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'upload');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Parse request body
    const body = await request.json();
    const { filename, mimeType, size } = body;

    // Validate
    if (!filename || !mimeType || !size) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    if (size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }

    // Check storage quota
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const storageUsed = userData.storageUsed || 0;
    const storageLimit = userData.storageLimit || 0;

    if (storageUsed + size > storageLimit) {
      return NextResponse.json(
        { error: 'Storage quota exceeded' },
        { status: 403 }
      );
    }

    // Generate file ID and S3 key
    const fileId = generateFileId();
    const extension = getFileExtension(filename, mimeType);
    const s3Key = generateS3Key(userId, fileId, extension);

    // Generate pre-signed upload URL
    const { url, expiresAt } = await generateUploadUrl(s3Key, mimeType, size);

    return NextResponse.json({
      uploadUrl: url,
      fileId,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
