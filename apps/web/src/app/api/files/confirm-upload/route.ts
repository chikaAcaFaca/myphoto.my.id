import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getObjectMetadata } from '@/lib/s3';
import { getFileType } from '@myphoto/shared';
import { processImageAI } from '@/lib/ai-processing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Auto-rename duplicate filenames: photo.jpg -> photo (1).jpg -> photo (2).jpg
async function getUniquePhotoName(userId: string, filename: string): Promise<string> {
  const existing = await db.collection('files')
    .where('userId', '==', userId)
    .where('isTrashed', '==', false)
    .where('name', '>=', filename.split('.')[0])
    .where('name', '<=', filename.split('.')[0] + '\uf8ff')
    .get();

  const names = new Set(existing.docs.map((d) => d.data().name));
  if (!names.has(filename)) return filename;

  const dotIndex = filename.lastIndexOf('.');
  const baseName = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.slice(dotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${ext}`;
  while (names.has(candidate)) {
    counter++;
    candidate = `${baseName} (${counter})${ext}`;
  }
  return candidate;
}

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

    // Everything below comes from the client, so pin it to what upload-url
    // issued for THIS user: the id must be a plain id, the key must live under
    // the caller's own prefix and carry that id, and the thumbnail key must be
    // the caller's too. Without this a user could register someone else's
    // object as their own file and then read or delete it through /api/files.
    if (typeof fileId !== 'string' || !/^[a-z0-9-]{6,64}$/i.test(fileId)) {
      return NextResponse.json({ error: 'Invalid fileId' }, { status: 400 });
    }
    const ownPrefix = `users/${userId}/`;
    if (
      typeof s3Key !== 'string' ||
      !s3Key.startsWith(`${ownPrefix}originals/`) ||
      !s3Key.includes(`/${fileId}.`) ||
      s3Key.includes('..')
    ) {
      return NextResponse.json({ error: 'Invalid s3Key' }, { status: 400 });
    }
    if (
      thumbnailKey !== undefined &&
      thumbnailKey !== null &&
      (typeof thumbnailKey !== 'string' || !thumbnailKey.startsWith(`${ownPrefix}thumbnails/${fileId}`))
    ) {
      return NextResponse.json({ error: 'Invalid thumbnailKey' }, { status: 400 });
    }

    // Verify the object exists and take its size from storage, not the body —
    // a client-supplied (e.g. negative) size would skew the quota.
    const meta = await getObjectMetadata(s3Key);
    if (!meta) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }
    const actualSize = meta.contentLength;

    // Never overwrite an existing record. A retry of the same confirm by the
    // same user is answered idempotently.
    const existing = await db.collection('files').doc(fileId).get();
    if (existing.exists) {
      if (existing.data()?.userId === userId && existing.data()?.s3Key === s3Key) {
        return NextResponse.json({ id: fileId, ...existing.data(), duplicateConfirm: true });
      }
      return NextResponse.json({ error: 'File id already in use' }, { status: 409 });
    }

    // Auto-rename if duplicate name exists
    const uniqueName = await getUniquePhotoName(userId, name);

    // Create file document
    const fileData: Record<string, any> = {
      userId,
      type: getFileType(mimeType),
      name: uniqueName,
      size: actualSize,
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

    await db.collection('files').doc(fileId).create(fileData);

    // Update user storage
    await db.collection('users').doc(userId).update({
      storageUsed: FieldValue.increment(actualSize),
    });

    // Trigger AI processing — await it so the serverless function stays alive
    // Thumbnails are saved first inside processImageAI, so even partial failure is OK
    if (mimeType.startsWith('image/')) {
      // Don't await — but use waitUntil pattern via global EdgeRuntime or just fire-and-forget
      // Since thumbnails are now saved first in processImageAI, this is safe
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
