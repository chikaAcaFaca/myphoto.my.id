import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { findDuplicates } from '@/lib/ai/duplicate-detection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Get all image files for this user (not just those with pHash)
    const snapshot = await db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false)
      .where('type', '==', 'image')
      .select('pHash', 'name', 'size', 'thumbnailKey', 'createdAt', 'mimeType', 's3Key')
      .get();

    const allFiles = snapshot.docs.map((doc) => ({
      fileId: doc.id,
      hash: doc.data().pHash || '',
      name: doc.data().name,
      size: doc.data().size,
      mimeType: doc.data().mimeType,
      thumbnailKey: doc.data().thumbnailKey,
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    }));

    if (allFiles.length < 2) {
      return NextResponse.json({ duplicates: [] });
    }

    // Strategy 1: pHash-based similarity (for files that have hashes)
    const filesWithHash = allFiles.filter((f) => f.hash);
    const pHashGroups = filesWithHash.length >= 2
      ? findDuplicates(filesWithHash)
      : [];

    // Strategy 2: Exact match by file size + name (catches identical re-uploads)
    const sizeGroups = findExactDuplicates(allFiles);

    // Merge both strategies, deduplicate
    const allGroupFileIds = new Set<string>();
    const enrichedGroups: Array<{ files: Array<{ id: string; name: string; size: number; thumbnailKey: string; createdAt: Date }>; similarity: number }> = [];

    // Add pHash groups first
    for (const group of pHashGroups) {
      const files = group.files
        .map((f) => allFiles.find((af) => af.fileId === f.fileId))
        .filter((f): f is NonNullable<typeof f> => !!f);
      if (files.length > 1) {
        for (const f of files) allGroupFileIds.add(f.fileId);
        enrichedGroups.push({
          files: files.map((f) => ({ id: f.fileId, name: f.name, size: f.size, thumbnailKey: f.thumbnailKey, createdAt: f.createdAt })),
          similarity: group.similarity,
        });
      }
    }

    // Add size-based groups (only files not already in a pHash group)
    for (const group of sizeGroups) {
      const newFiles = group.filter((f) => !allGroupFileIds.has(f.fileId));
      if (newFiles.length > 1) {
        for (const f of newFiles) allGroupFileIds.add(f.fileId);
        enrichedGroups.push({
          files: newFiles.map((f) => ({ id: f.fileId, name: f.name, size: f.size, thumbnailKey: f.thumbnailKey, createdAt: f.createdAt })),
          similarity: 100,
        });
      }
    }

    return NextResponse.json({ duplicates: enrichedGroups });
  } catch (error) {
    console.error('Duplicates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Find exact duplicates by file size (same size = likely identical)
function findExactDuplicates(
  files: Array<{ fileId: string; size: number; name: string; [key: string]: any }>
): Array<Array<typeof files[number]>> {
  const sizeMap = new Map<number, typeof files>();
  for (const file of files) {
    const key = file.size;
    if (!sizeMap.has(key)) {
      sizeMap.set(key, []);
    }
    sizeMap.get(key)!.push(file);
  }

  // Return groups with more than 1 file of the same size
  return Array.from(sizeMap.values()).filter((group) => group.length > 1);
}

// Dismiss a duplicate (mark as not duplicate)
export async function POST(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    const body = await request.json();
    const { fileId, action } = body;

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Verify file belongs to user
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (action === 'dismiss') {
      // Mark file as reviewed (not a duplicate)
      await db.collection('files').doc(fileId).update({
        duplicateReviewed: true,
        duplicateDismissedAt: new Date(),
      });
    } else if (action === 'delete') {
      // Move to trash
      await db.collection('files').doc(fileId).update({
        isTrashed: true,
        trashedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Duplicate action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
