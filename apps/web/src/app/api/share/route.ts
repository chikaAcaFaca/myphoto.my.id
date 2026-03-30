import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateShareToken } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    const body = await request.json();
    const { fileId, albumId, permission = 'read' } = body;

    if (!fileId && !albumId) {
      return NextResponse.json(
        { error: 'Missing fileId or albumId' },
        { status: 400 }
      );
    }

    // Validate permission
    if (permission !== 'read' && permission !== 'readwrite') {
      return NextResponse.json(
        { error: 'Invalid permission. Must be "read" or "readwrite"' },
        { status: 400 }
      );
    }

    // --- Album sharing ---
    if (albumId) {
      const albumDoc = await db.collection('albums').doc(albumId).get();
      if (!albumDoc.exists) {
        return NextResponse.json({ error: 'Album not found' }, { status: 404 });
      }

      const albumData = albumDoc.data()!;
      if (albumData.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Check if active share already exists
      const existing = await db
        .collection('shared')
        .where('albumId', '==', albumId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        const token = existingDoc.id;
        return NextResponse.json({ shareUrl: `/shared/${token}`, token });
      }

      // Get ALL album files (no limit - album size is only bounded by storage capacity)
      const fileIds: string[] = [];
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      const batchSize = 500;

      while (true) {
        let query = db
          .collection('files')
          .where('userId', '==', userId)
          .where('albumIds', 'array-contains', albumId)
          .where('isTrashed', '==', false)
          .orderBy('createdAt', 'desc')
          .limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        snapshot.docs.forEach((d) => fileIds.push(d.id));

        if (snapshot.size < batchSize) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }
      const coverFileId = albumData.coverFileId || (fileIds.length > 0 ? fileIds[0] : null);

      const token = generateShareToken();
      const sharedData = {
        token,
        type: 'album' as const,
        albumId,
        fileId: coverFileId,
        userId,
        permission,
        albumName: albumData.name,
        albumDescription: albumData.description || null,
        albumFileIds: fileIds,
        albumFileCount: fileIds.length,
        fileName: albumData.name,
        fileType: 'image',
        mimeType: 'image/jpeg',
        coverFileId,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: null,
        viewCount: 0,
        isActive: true,
      };

      await db.collection('shared').doc(token).set(sharedData);

      // Update album's shared status
      await db.collection('albums').doc(albumId).update({
        isShared: true,
        shareLink: `/shared/${token}`,
      });

      return NextResponse.json({ shareUrl: `/shared/${token}`, token });
    }

    // --- File sharing ---
    // Verify file exists and belongs to user
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const fileData = fileDoc.data()!;
    if (fileData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if active share already exists (idempotent)
    const existing = await db
      .collection('shared')
      .where('fileId', '==', fileId)
      .where('userId', '==', userId)
      .where('type', '==', 'file')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      const token = existingDoc.id;
      return NextResponse.json({
        shareUrl: `/shared/${token}`,
        token,
      });
    }

    // Create new share link
    const token = generateShareToken();
    const sharedData = {
      token,
      type: 'file' as const,
      fileId,
      userId,
      permission,
      fileName: fileData.name,
      fileType: fileData.type,
      mimeType: fileData.mimeType,
      width: fileData.width || null,
      height: fileData.height || null,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: null,
      viewCount: 0,
      isActive: true,
    };

    await db.collection('shared').doc(token).set(sharedData);

    return NextResponse.json({
      shareUrl: `/shared/${token}`,
      token,
    });
  } catch (error) {
    console.error('Error creating share link:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    const body = await request.json();
    const { token, albumId } = body;

    // Revoke by albumId (used when deleting an album)
    if (albumId) {
      const shareDocs = await db
        .collection('shared')
        .where('albumId', '==', albumId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      shareDocs.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });
      await batch.commit();

      return NextResponse.json({ success: true, revoked: shareDocs.size });
    }

    // Revoke by token
    if (!token) {
      return NextResponse.json(
        { error: 'Missing token or albumId' },
        { status: 400 }
      );
    }

    const shareDoc = await db.collection('shared').doc(token).get();
    if (!shareDoc.exists) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    const shareData = shareDoc.data()!;
    if (shareData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await db.collection('shared').doc(token).update({
      isActive: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share link:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
