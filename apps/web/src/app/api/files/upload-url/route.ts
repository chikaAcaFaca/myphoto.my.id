import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateUploadUrl, configureBucketCors } from '@/lib/s3';
import { generateS3Key, generateFileId, getFileExtension, getFileType, isSupportedMimeType, MAX_UPLOAD_SIZE } from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// One-time CORS setup for the S3 bucket
let corsConfigured = false;
async function ensureCorsConfigured() {
  if (corsConfigured) return;
  try {
    await configureBucketCors();
    corsConfigured = true;
    console.log('S3 bucket CORS configured successfully');
  } catch (err) {
    console.error('Failed to configure S3 CORS (non-fatal):', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'upload');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Ensure CORS is configured (runs once per cold start)
    await ensureCorsConfigured();

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

    const response: Record<string, any> = {
      uploadUrl: url,
      fileId,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    };

    // For image and video files, provide a presigned URL for client-side thumbnail upload
    const fileType = getFileType(mimeType);
    if (fileType === 'video' || fileType === 'image') {
      const thumbnailKey = generateS3Key(userId, fileId, '', 'thumbnail');
      // Estimate max thumbnail size: 400x400 WebP ≈ 100KB
      const { url: thumbUrl } = await generateUploadUrl(thumbnailKey, 'image/webp', 200 * 1024);
      response.thumbnailUploadUrl = thumbUrl;
      response.thumbnailKey = thumbnailKey;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating upload URL:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
