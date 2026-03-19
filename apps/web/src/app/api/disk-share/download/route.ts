import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

async function requireAuth(request: NextRequest): Promise<string | null> {
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

// GET /api/disk-share/download?token=X&fileId=Y — get presigned download URL for shared file
export async function GET(request: NextRequest) {
  try {
    const viewerUserId = await requireAuth(request);
    if (!viewerUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const fileId = url.searchParams.get('fileId');

    if (!token || !fileId) {
      return NextResponse.json({ error: 'Missing token or fileId' }, { status: 400 });
    }

    const shareDoc = await db.collection('diskShares').doc(token).get();
    if (!shareDoc.exists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const shareData = shareDoc.data()!;
    if (!shareData.isActive) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
    }

    const ownerId = shareData.userId;

    const fileDoc = await db.collection('diskFiles').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== ownerId || fileDoc.data()?.isTrashed) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;

    // For file shares, verify this is the exact shared file
    if (shareData.type === 'file') {
      if (shareData.diskFileId !== fileId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // For folder shares, verify the file is inside the shared folder tree
      const isInSharedFolder = await verifyFileInFolder(fileId, shareData.folderId, ownerId);
      if (!isInSharedFolder) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Return presigned URL — client downloads directly from S3
    const downloadUrl = await generateDownloadUrl(fileData.s3Key);

    return NextResponse.json({ downloadUrl, fileName: fileData.name, mimeType: fileData.mimeType });
  } catch (error) {
    console.error('Disk share download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function verifyFileInFolder(fileId: string, sharedFolderId: string, ownerId: string): Promise<boolean> {
  const fileDoc = await db.collection('diskFiles').doc(fileId).get();
  if (!fileDoc.exists || fileDoc.data()?.userId !== ownerId) return false;

  let currentFolderId = fileDoc.data()!.folderId;
  const maxDepth = 20;

  for (let i = 0; i < maxDepth; i++) {
    if (currentFolderId === sharedFolderId) return true;
    if (currentFolderId === 'root') return false;

    const folderDoc = await db.collection('folders').doc(currentFolderId).get();
    if (!folderDoc.exists || folderDoc.data()?.userId !== ownerId) return false;
    currentFolderId = folderDoc.data()!.parentId;
  }

  return false;
}
