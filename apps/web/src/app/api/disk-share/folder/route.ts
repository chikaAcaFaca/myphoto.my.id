import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { resolveDiskShareApiKey, enforceDiskApiKeyRateLimit } from '@/lib/disk-share-api-key';

export const dynamic = 'force-dynamic';

interface ShareContext {
  ownerId: string;
  sharedRootFolderId: string;
  shareToken: string;
}

// Resolve the share + owner for a folder-management call. Accepts either an
// API key (X-Disk-Api-Key, must grant readwrite) or a Firebase owner token
// (with `token` in the body). Returns the context or a NextResponse error.
async function resolveShareContext(
  request: NextRequest,
  body: any
): Promise<{ ctx?: ShareContext; error?: NextResponse }> {
  const apiKey = await resolveDiskShareApiKey(request);
  if (apiKey) {
    const limited = await enforceDiskApiKeyRateLimit(apiKey.shareToken);
    if (limited) return { error: limited };
    if (apiKey.permission !== 'readwrite') {
      return { error: NextResponse.json({ error: 'API key is read-only' }, { status: 403 }) };
    }
    if (body?.token && body.token !== apiKey.shareToken) {
      return { error: NextResponse.json({ error: 'Token does not match API key' }, { status: 403 }) };
    }
    return {
      ctx: { ownerId: apiKey.ownerId, sharedRootFolderId: apiKey.folderId, shareToken: apiKey.shareToken },
    };
  }

  // Firebase owner path
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return { error: authResult.response };
  const token = body?.token;
  if (!token) return { error: NextResponse.json({ error: 'Missing token' }, { status: 400 }) };

  const shareDoc = await db.collection('diskShares').doc(token).get();
  if (!shareDoc.exists || shareDoc.data()?.userId !== authResult.userId) {
    return { error: NextResponse.json({ error: 'Share not found' }, { status: 404 }) };
  }
  const shareData = shareDoc.data()!;
  if (!shareData.isActive) {
    return { error: NextResponse.json({ error: 'Share link expired' }, { status: 410 }) };
  }
  if (shareData.type !== 'folder') {
    return { error: NextResponse.json({ error: 'Not a folder share' }, { status: 400 }) };
  }
  return {
    ctx: { ownerId: shareData.userId, sharedRootFolderId: shareData.folderId, shareToken: token },
  };
}

// POST /api/disk-share/folder — create a subfolder inside the shared tree.
// Idempotent: if a folder with the same name already exists under the parent,
// the existing folder is returned (so an automat can re-run "firma/radnik"
// structure creation safely).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ctx, error } = await resolveShareContext(request, body);
    if (error) return error;
    const { ownerId, sharedRootFolderId } = ctx!;

    const { name } = body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }
    const trimmedName = name.trim();
    const targetParentId = body.parentId || sharedRootFolderId;

    // The parent must be the shared root or a descendant of it.
    if (targetParentId !== sharedRootFolderId) {
      const isDescendant = await verifyDescendant(targetParentId, sharedRootFolderId, ownerId);
      if (!isDescendant) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Duplicate name → return the existing folder (idempotent).
    const existing = await db
      .collection('folders')
      .where('userId', '==', ownerId)
      .where('parentId', '==', targetParentId)
      .get();
    const dup = existing.docs.find((d) => d.data().name === trimmedName && !d.data().isTrashed);
    if (dup) {
      return NextResponse.json({
        id: dup.id,
        name: trimmedName,
        parentId: targetParentId,
        existed: true,
      });
    }

    // Breadcrumb path
    let path = '/';
    if (targetParentId !== 'root') {
      const parentDoc = await db.collection('folders').doc(targetParentId).get();
      if (parentDoc.exists && parentDoc.data()?.userId === ownerId) {
        path = (parentDoc.data()?.path || '/') + parentDoc.data()?.name + '/';
      }
    }

    const now = new Date();
    const folderRef = await db.collection('folders').add({
      userId: ownerId,
      name: trimmedName,
      parentId: targetParentId,
      path,
      isTrashed: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      id: folderRef.id,
      name: trimmedName,
      parentId: targetParentId,
      path,
      existed: false,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Disk share folder POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/disk-share/folder — trash a subfolder (and its direct files +
// subfolders) inside the shared tree. The shared root itself cannot be deleted.
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ctx, error } = await resolveShareContext(request, body);
    if (error) return error;
    const { ownerId, sharedRootFolderId } = ctx!;

    const { folderId } = body;
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }
    if (folderId === sharedRootFolderId || folderId === 'root') {
      return NextResponse.json({ error: 'Cannot delete the shared root folder' }, { status: 403 });
    }

    // Must be a descendant of the shared root.
    const isDescendant = await verifyDescendant(folderId, sharedRootFolderId, ownerId);
    if (!isDescendant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const folderDoc = await db.collection('folders').doc(folderId).get();
    if (!folderDoc.exists || folderDoc.data()?.userId !== ownerId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const now = new Date();
    await folderDoc.ref.update({ isTrashed: true, trashedAt: now });

    const batch = db.batch();
    const filesSnap = await db
      .collection('diskFiles')
      .where('userId', '==', ownerId)
      .where('folderId', '==', folderId)
      .get();
    for (const doc of filesSnap.docs) batch.update(doc.ref, { isTrashed: true, trashedAt: now });

    const subSnap = await db
      .collection('folders')
      .where('userId', '==', ownerId)
      .where('parentId', '==', folderId)
      .get();
    for (const doc of subSnap.docs) batch.update(doc.ref, { isTrashed: true, trashedAt: now });

    if (filesSnap.docs.length > 0 || subSnap.docs.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk share folder DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify that targetFolderId is a descendant of ancestorFolderId (same logic as
// the browse/upload routes; duplicated to keep each route self-contained).
async function verifyDescendant(
  targetFolderId: string,
  ancestorFolderId: string,
  ownerId: string
): Promise<boolean> {
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
