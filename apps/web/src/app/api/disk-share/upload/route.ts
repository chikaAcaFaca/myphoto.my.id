import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateUploadUrl } from '@/lib/s3';
import { generateFileId, getFileExtension, MAX_UPLOAD_SIZE } from '@myphoto/shared';
import { applyDeltaToSharedAncestors } from '@/lib/shared-folder-quota';
import { resolveDiskShareApiKey } from '@/lib/disk-share-api-key';

export const dynamic = 'force-dynamic';

// POST /api/disk-share/upload — get presigned upload URL for shared folder (readwrite only)
export async function POST(request: NextRequest) {
  try {
    // Automated callers authenticate via X-Disk-Api-Key (must grant readwrite).
    const apiKey = await resolveDiskShareApiKey(request);
    if (apiKey && apiKey.permission !== 'readwrite') {
      return NextResponse.json({ error: 'API key is read-only' }, { status: 403 });
    }

    const body = await request.json();
    const { folderId, filename, mimeType, size } = body;
    if (apiKey && body.token && body.token !== apiKey.shareToken) {
      return NextResponse.json({ error: 'Token does not match API key' }, { status: 403 });
    }
    const token = apiKey ? apiKey.shareToken : body.token;

    if (!token || !filename || !mimeType || !size) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Verify share token
    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const shareData = shareDoc.data()!;
    if (!shareData.isActive) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
    }

    if (shareData.permission !== 'readwrite') {
      return NextResponse.json({ error: 'Write access not allowed' }, { status: 403 });
    }

    if (shareData.type !== 'folder') {
      return NextResponse.json({ error: 'Cannot upload to a file share' }, { status: 400 });
    }

    const ownerId = shareData.userId;
    const targetFolderId = folderId || shareData.folderId;

    // Verify target folder is within the shared folder tree
    if (targetFolderId !== shareData.folderId) {
      const isDescendant = await verifyDescendant(targetFolderId, shareData.folderId, ownerId);
      if (!isDescendant) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Check storage quota of the owner
    const userDoc = await db.collection('users').doc(ownerId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const storageUsed = userData.storageUsed || 0;
    const storageLimit = userData.storageLimit || 0;

    if (storageUsed + size > storageLimit) {
      return NextResponse.json({ error: 'Vlasnikov skladišni prostor je pun' }, { status: 403 });
    }

    const fileId = generateFileId();
    const extension = getFileExtension(filename, mimeType);
    const s3Key = `disk/${ownerId}/${fileId}${extension ? '.' + extension : ''}`;

    const { url, expiresAt } = await generateUploadUrl(s3Key, mimeType, size);

    return NextResponse.json({
      uploadUrl: url,
      fileId,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Disk share upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/disk-share/upload — confirm upload to shared folder
export async function PATCH(request: NextRequest) {
  try {
    const apiKey = await resolveDiskShareApiKey(request);
    if (apiKey && apiKey.permission !== 'readwrite') {
      return NextResponse.json({ error: 'API key is read-only' }, { status: 403 });
    }

    const body = await request.json();
    const { fileId, s3Key, filename, mimeType, size, folderId } = body;
    if (apiKey && body.token && body.token !== apiKey.shareToken) {
      return NextResponse.json({ error: 'Token does not match API key' }, { status: 403 });
    }
    const token = apiKey ? apiKey.shareToken : body.token;

    if (!token || !fileId || !s3Key || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify share token
    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const shareData = shareDoc.data()!;
    if (!shareData.isActive || shareData.permission !== 'readwrite' || shareData.type !== 'folder') {
      return NextResponse.json({ error: 'Write access not allowed' }, { status: 403 });
    }

    const ownerId = shareData.userId;
    const targetFolderId = folderId || shareData.folderId;

    const now = new Date();
    await db.collection('diskFiles').doc(fileId).set({
      userId: ownerId,
      name: filename,
      s3Key,
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0,
      folderId: targetFolderId,
      isTrashed: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update owner's storage used
    const userDoc = await db.collection('users').doc(ownerId).get();
    const currentUsed = userDoc.data()?.storageUsed || 0;
    await db.collection('users').doc(ownerId).update({
      storageUsed: currentUsed + (size || 0),
    });

    // Fan out the upload's size to every viewer of any share that covers
    // this folder. By definition this share's viewers are charged, but
    // there may be other shares higher up the tree that also need bumping.
    applyDeltaToSharedAncestors(targetFolderId, ownerId, size || 0).catch((err) =>
      console.error('Share fan-out failed (guest upload):', err)
    );

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error('Disk share upload confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function verifyDescendant(targetFolderId: string, ancestorFolderId: string, ownerId: string): Promise<boolean> {
  let currentId = targetFolderId;
  const maxDepth = 20;

  for (let i = 0; i < maxDepth; i++) {
    if (currentId === ancestorFolderId) return true;
    if (currentId === 'root') return false;

    const doc = await db.collection('folders').doc(currentId).get();
    if (!doc.exists || doc.data()?.userId !== ownerId) return false;
    currentId = doc.data()!.parentId;
  }

  return false;
}
