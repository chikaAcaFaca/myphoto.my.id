import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateShareToken } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

// POST /api/disk-share — create a share link for a disk file or folder
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { diskFileId, folderId, permission = 'read' } = body;

    if (!diskFileId && !folderId) {
      return NextResponse.json({ error: 'Missing diskFileId or folderId' }, { status: 400 });
    }

    if (!['read', 'readwrite'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission. Use "read" or "readwrite"' }, { status: 400 });
    }

    // --- Folder sharing ---
    if (folderId) {
      // Verify folder belongs to user (root is a virtual folder)
      if (folderId !== 'root') {
        const folderDoc = await db.collection('folders').doc(folderId).get();
        if (!folderDoc.exists || folderDoc.data()?.userId !== userId) {
          return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }
      }

      const folderName = folderId === 'root' ? 'MySpace' : (await db.collection('folders').doc(folderId).get()).data()?.name || 'Folder';

      // Check if active share already exists for this folder
      const existing = await db
        .collection('diskShares')
        .where('folderId', '==', folderId)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        const existingData = existingDoc.data();
        // Update permission if changed
        if (existingData.permission !== permission) {
          await existingDoc.ref.update({ permission });
        }
        return NextResponse.json({
          shareUrl: `/shared/disk/${existingDoc.id}`,
          token: existingDoc.id,
          permission,
        });
      }

      const token = generateShareToken();
      await db.collection('diskShares').doc(token).set({
        token,
        type: 'folder',
        folderId,
        diskFileId: null,
        userId,
        itemName: folderName,
        permission,
        createdAt: FieldValue.serverTimestamp(),
        isActive: true,
        viewCount: 0,
      });

      return NextResponse.json({
        shareUrl: `/shared/disk/${token}`,
        token,
        permission,
      });
    }

    // --- File sharing ---
    const fileDoc = await db.collection('diskFiles').doc(diskFileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // Check if active share already exists
    const existing = await db
      .collection('diskShares')
      .where('diskFileId', '==', diskFileId)
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      const existingData = existingDoc.data();
      if (existingData.permission !== permission) {
        await existingDoc.ref.update({ permission });
      }
      return NextResponse.json({
        shareUrl: `/shared/disk/${existingDoc.id}`,
        token: existingDoc.id,
        permission,
      });
    }

    const token = generateShareToken();
    await db.collection('diskShares').doc(token).set({
      token,
      type: 'file',
      diskFileId,
      folderId: null,
      userId,
      itemName: fileData.name,
      mimeType: fileData.mimeType,
      size: fileData.size,
      permission,
      createdAt: FieldValue.serverTimestamp(),
      isActive: true,
      viewCount: 0,
    });

    return NextResponse.json({
      shareUrl: `/shared/disk/${token}`,
      token,
      permission,
    });
  } catch (error) {
    console.error('Disk share POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/disk-share — update permission on an existing share
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { token, permission } = body;

    if (!token || !permission) {
      return NextResponse.json({ error: 'Missing token or permission' }, { status: 400 });
    }

    if (!['read', 'readwrite'].includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission' }, { status: 400 });
    }

    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists || shareDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    await shareDoc.ref.update({ permission });
    return NextResponse.json({ success: true, permission });
  } catch (error) {
    console.error('Disk share PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/disk-share — revoke a share link
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists || shareDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    await shareDoc.ref.update({ isActive: false });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk share DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/disk-share?diskFileId=X or ?folderId=X — get active share info for an item
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const url = new URL(request.url);
    const diskFileId = url.searchParams.get('diskFileId');
    const folderId = url.searchParams.get('folderId');

    if (!diskFileId && !folderId) {
      return NextResponse.json({ error: 'Missing diskFileId or folderId' }, { status: 400 });
    }

    let query = db.collection('diskShares')
      .where('userId', '==', userId)
      .where('isActive', '==', true);

    if (diskFileId) {
      query = query.where('diskFileId', '==', diskFileId);
    } else {
      query = query.where('folderId', '==', folderId);
    }

    const snap = await query.limit(1).get();

    if (snap.empty) {
      return NextResponse.json({ shared: false });
    }

    const doc = snap.docs[0];
    const data = doc.data();
    return NextResponse.json({
      shared: true,
      token: doc.id,
      shareUrl: `/shared/disk/${doc.id}`,
      permission: data.permission,
      viewCount: data.viewCount || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error('Disk share GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
