import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db, auth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// Helper: extract userId from Bearer token (returns null if not authenticated)
async function getOptionalUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = await auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// GET /api/disk-share/browse?token=X&folderId=Y — browse contents of a shared folder
// Requires authentication. Without auth, returns share metadata + owner referral code for registration.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const subfolderId = url.searchParams.get('folderId');

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Verify share token is valid
    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const shareData = shareDoc.data()!;
    if (!shareData.isActive) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
    }

    const ownerId = shareData.userId;

    // Check authentication
    const viewerUserId = await getOptionalUserId(request);

    if (!viewerUserId) {
      // Not authenticated — return share metadata + owner's referral code for registration
      const ownerDoc = await db.collection('users').doc(ownerId).get();
      const ownerData = ownerDoc.data();
      const referralCode = ownerData?.referralCode || null;
      const ownerName = ownerData?.displayName || ownerData?.name || null;

      return NextResponse.json({
        requiresAuth: true,
        type: shareData.type,
        itemName: shareData.itemName,
        permission: shareData.permission,
        ownerName,
        referralCode,
      });
    }

    // Record share access (first time only, fire-and-forget)
    if (viewerUserId !== ownerId) {
      recordShareAccess(token, viewerUserId, shareData).catch(() => {});
    }

    // If sharing a single file, return its info
    if (shareData.type === 'file') {
      const fileDoc = await db.collection('diskFiles').doc(shareData.diskFileId).get();
      if (!fileDoc.exists || fileDoc.data()?.isTrashed) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const fileData = fileDoc.data()!;
      return NextResponse.json({
        requiresAuth: false,
        type: 'file',
        permission: shareData.permission,
        itemName: shareData.itemName,
        ownerUserId: ownerId,
        file: {
          id: fileDoc.id,
          name: fileData.name,
          mimeType: fileData.mimeType,
          size: fileData.size,
          createdAt: fileData.createdAt?.toDate?.()?.toISOString() || fileData.createdAt,
        },
      });
    }

    // Folder share — determine which folder to browse
    const sharedRootFolderId = shareData.folderId;
    const browseFolderId = subfolderId || sharedRootFolderId;

    // Security: verify the browseFolderId is the shared folder or a descendant
    if (browseFolderId !== sharedRootFolderId) {
      const isDescendant = await verifyDescendant(browseFolderId, sharedRootFolderId, ownerId);
      if (!isDescendant) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get folders in this directory
    const foldersSnap = await db.collection('folders')
      .where('userId', '==', ownerId)
      .where('parentId', '==', browseFolderId)
      .get();

    const folders = foldersSnap.docs
      .filter((doc) => !doc.data().isTrashed)
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get files in this directory
    const filesSnap = await db.collection('diskFiles')
      .where('userId', '==', ownerId)
      .where('folderId', '==', browseFolderId)
      .get();

    const files = filesSnap.docs
      .filter((doc) => !doc.data().isTrashed)
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name,
          mimeType: d.mimeType,
          size: d.size,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || d.createdAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build breadcrumbs from sharedRootFolderId to browseFolderId
    const breadcrumbs = await buildBreadcrumbs(browseFolderId, sharedRootFolderId, ownerId);

    // Increment view count (fire-and-forget)
    if (!subfolderId) {
      db.collection('diskShares').doc(token).update({
        viewCount: FieldValue.increment(1),
      }).catch(() => {});
    }

    return NextResponse.json({
      requiresAuth: false,
      type: 'folder',
      permission: shareData.permission,
      itemName: shareData.itemName,
      ownerUserId: ownerId,
      sharedFolderId: sharedRootFolderId,
      currentFolderId: browseFolderId,
      breadcrumbs,
      folders,
      files,
    });
  } catch (error) {
    console.error('Disk share browse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Record that a user has accessed this share (creates entry in diskShareAccess)
async function recordShareAccess(shareToken: string, viewerUserId: string, shareData: any) {
  const accessId = `${shareToken}_${viewerUserId}`;
  const existingAccess = await db.collection('diskShareAccess').doc(accessId).get();

  if (!existingAccess.exists) {
    await db.collection('diskShareAccess').doc(accessId).set({
      shareToken,
      viewerUserId,
      ownerUserId: shareData.userId,
      type: shareData.type,
      itemName: shareData.itemName,
      permission: shareData.permission,
      folderId: shareData.folderId || null,
      diskFileId: shareData.diskFileId || null,
      accessedAt: FieldValue.serverTimestamp(),
    });
  } else {
    // Update last accessed
    await db.collection('diskShareAccess').doc(accessId).update({
      lastAccessedAt: FieldValue.serverTimestamp(),
      permission: shareData.permission,
      itemName: shareData.itemName,
    });
  }
}

// Verify that targetFolderId is a descendant of ancestorFolderId
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

// Build breadcrumbs from sharedRootFolderId up to browseFolderId
async function buildBreadcrumbs(
  currentFolderId: string,
  sharedRootFolderId: string,
  ownerId: string
): Promise<{ id: string; name: string }[]> {
  if (currentFolderId === sharedRootFolderId) return [];

  const crumbs: { id: string; name: string }[] = [];
  let folderId = currentFolderId;
  const maxDepth = 20;

  for (let i = 0; i < maxDepth; i++) {
    if (folderId === sharedRootFolderId || folderId === 'root') break;

    const doc = await db.collection('folders').doc(folderId).get();
    if (!doc.exists || doc.data()?.userId !== ownerId) break;

    crumbs.unshift({ id: doc.id, name: doc.data()!.name });
    folderId = doc.data()!.parentId;
  }

  return crumbs;
}
