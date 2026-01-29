import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { findDuplicates } from '@/lib/ai/duplicate-detection';

export async function GET(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Get all files with pHash for this user
    const snapshot = await db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false)
      .where('type', '==', 'image')
      .select('pHash', 'name', 'size', 'thumbnailKey', 'createdAt')
      .get();

    const filesWithHash = snapshot.docs
      .map((doc) => ({
        fileId: doc.id,
        hash: doc.data().pHash,
        name: doc.data().name,
        size: doc.data().size,
        thumbnailKey: doc.data().thumbnailKey,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      }))
      .filter((f) => f.hash); // Only include files with computed hash

    if (filesWithHash.length < 2) {
      return NextResponse.json({ duplicates: [] });
    }

    // Find duplicate groups
    const duplicateGroups = findDuplicates(filesWithHash);

    // Enrich with file details
    const enrichedGroups = duplicateGroups.map((group) => ({
      files: group.files.map((f) => {
        const file = filesWithHash.find((fh) => fh.fileId === f.fileId);
        return {
          id: f.fileId,
          name: file?.name,
          size: file?.size,
          thumbnailKey: file?.thumbnailKey,
          createdAt: file?.createdAt,
        };
      }),
      similarity: group.similarity,
    }));

    return NextResponse.json({ duplicates: enrichedGroups });
  } catch (error) {
    console.error('Duplicates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
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
