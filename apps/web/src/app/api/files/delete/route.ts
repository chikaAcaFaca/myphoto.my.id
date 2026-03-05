import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { db } from '@/lib/firebase-admin';
import { deleteObject } from '@/lib/s3';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const { userId } = auth;

  let body: { fileIds: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.fileIds || !Array.isArray(body.fileIds) || body.fileIds.length === 0) {
    return NextResponse.json({ error: 'fileIds required' }, { status: 400 });
  }

  if (body.fileIds.length > 100) {
    return NextResponse.json({ error: 'Max 100 files per request' }, { status: 400 });
  }

  const results: { fileId: string; success: boolean; error?: string }[] = [];
  let totalSizeFreed = 0;

  for (const fileId of body.fileIds) {
    try {
      const fileRef = db.collection('files').doc(fileId);
      const fileDoc = await fileRef.get();

      if (!fileDoc.exists) {
        results.push({ fileId, success: false, error: 'Not found' });
        continue;
      }

      const fileData = fileDoc.data()!;

      // Verify ownership
      if (fileData.userId !== userId) {
        results.push({ fileId, success: false, error: 'Not authorized' });
        continue;
      }

      // Delete from S3 (main file + all thumbnails)
      const keysToDelete = [fileData.s3Key];
      if (fileData.thumbnailKey) keysToDelete.push(fileData.thumbnailKey);
      if (fileData.smallThumbKey) keysToDelete.push(fileData.smallThumbKey);
      if (fileData.largeThumbKey) keysToDelete.push(fileData.largeThumbKey);

      await Promise.all(
        keysToDelete.map((key) => deleteObject(key).catch((err) => {
          console.error(`Failed to delete S3 key ${key}:`, err);
        }))
      );

      // Delete Firestore document
      await fileRef.delete();

      totalSizeFreed += fileData.size || 0;
      results.push({ fileId, success: true });
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      results.push({ fileId, success: false, error: 'Internal error' });
    }
  }

  // Update user storage in one operation
  if (totalSizeFreed > 0) {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      storageUsed: FieldValue.increment(-totalSizeFreed),
    });
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    success: successCount === body.fileIds.length,
    deleted: successCount,
    total: body.fileIds.length,
    results,
  });
}
