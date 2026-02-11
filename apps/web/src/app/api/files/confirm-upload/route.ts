import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { objectExists } from '@/lib/s3';
import { getFileType } from '@myphoto/shared';
import { processImageAI } from '@/lib/ai-processing';

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
    const { fileId, s3Key, name, size, mimeType, thumbnailKey } = body;

    // Validate
    if (!fileId || !s3Key || !name || !size || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify file exists in S3
    const exists = await objectExists(s3Key);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Create file document
    const fileData: Record<string, any> = {
      userId,
      type: getFileType(mimeType),
      name,
      size,
      mimeType,
      s3Key,
      albumIds: [],
      isFavorite: false,
      isArchived: false,
      isTrashed: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If client sent a video thumbnail, store it
    if (thumbnailKey && typeof thumbnailKey === 'string') {
      fileData.thumbnailKey = thumbnailKey;
    }

    await db.collection('files').doc(fileId).set(fileData);

    // Update user storage
    await db.collection('users').doc(userId).update({
      storageUsed: FieldValue.increment(size),
    });

    // Trigger AI processing asynchronously for images
    if (mimeType.startsWith('image/')) {
      processImageAI(fileId, s3Key).catch((err) => {
        console.error('AI processing error:', err);
      });
    }

    return NextResponse.json({
      id: fileId,
      ...fileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error confirming upload:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
