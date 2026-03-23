import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateUploadUrl, copyObject, configureBucketCors } from '@/lib/s3';
import { generateFileId, getFileExtension, MAX_UPLOAD_SIZE } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

// One-time CORS setup for the S3 bucket
let corsConfigured = false;
async function ensureCorsConfigured() {
  if (corsConfigured) return;
  try {
    await configureBucketCors();
    corsConfigured = true;
  } catch (err) {
    console.error('Failed to configure S3 CORS (non-fatal):', err);
  }
}

// Auto-rename duplicate filenames like Windows: file.txt -> file (1).txt -> file (2).txt
async function getUniqueFilename(userId: string, folderId: string, filename: string): Promise<string> {
  const existing = await db.collection('diskFiles')
    .where('userId', '==', userId)
    .where('folderId', '==', folderId)
    .where('isTrashed', '==', false)
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

// POST /api/disk-files — get presigned upload URL for a disk file
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'upload');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    // Ensure S3 CORS is configured (runs once per cold start)
    await ensureCorsConfigured();

    const body = await request.json();
    const { filename, folderId = 'root' } = body;
    const mimeType = body.mimeType || 'application/octet-stream';
    const size = body.size || 0;

    if (!filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Check storage quota
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const storageUsed = userData.storageUsed || 0;
    const storageLimit = userData.storageLimit || 0;

    if (storageUsed + size > storageLimit) {
      return NextResponse.json({ error: 'Storage quota exceeded' }, { status: 403 });
    }

    // Verify folder belongs to user (if not root)
    if (folderId !== 'root') {
      const folderDoc = await db.collection('folders').doc(folderId).get();
      if (!folderDoc.exists || folderDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    const fileId = generateFileId();
    const extension = getFileExtension(filename, mimeType);
    const s3Key = `disk/${userId}/${fileId}${extension ? '.' + extension : ''}`;

    const { url, expiresAt } = await generateUploadUrl(s3Key, mimeType, size);

    return NextResponse.json({
      uploadUrl: url,
      fileId,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Disk files POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/disk-files — confirm upload OR move files to another folder
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();

    // Move files to another folder
    if (body.action === 'move') {
      const { fileIds, folderIds, targetFolderId } = body;
      if (!targetFolderId) {
        return NextResponse.json({ error: 'Target folder required' }, { status: 400 });
      }

      // Verify target folder belongs to user (if not root)
      if (targetFolderId !== 'root') {
        const targetDoc = await db.collection('folders').doc(targetFolderId).get();
        if (!targetDoc.exists || targetDoc.data()?.userId !== userId) {
          return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
        }
      }

      const batch = db.batch();
      const now = new Date();

      // Move files
      if (fileIds?.length) {
        for (const fId of fileIds) {
          const fileDoc = await db.collection('diskFiles').doc(fId).get();
          if (fileDoc.exists && fileDoc.data()?.userId === userId) {
            batch.update(fileDoc.ref, { folderId: targetFolderId, updatedAt: now });
          }
        }
      }

      // Move folders
      if (folderIds?.length) {
        for (const fId of folderIds) {
          // Prevent moving folder into itself
          if (fId === targetFolderId) continue;
          const folderDoc = await db.collection('folders').doc(fId).get();
          if (folderDoc.exists && folderDoc.data()?.userId === userId) {
            batch.update(folderDoc.ref, { parentId: targetFolderId, updatedAt: now });
          }
        }
      }

      await batch.commit();
      return NextResponse.json({ success: true });
    }

    // Rename a file
    if (body.action === 'rename') {
      const { fileId, name } = body;
      if (!fileId || !name?.trim()) {
        return NextResponse.json({ error: 'fileId and name required' }, { status: 400 });
      }
      const fileDoc = await db.collection('diskFiles').doc(fileId).get();
      if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      await fileDoc.ref.update({ name: name.trim(), updatedAt: new Date() });
      return NextResponse.json({ success: true });
    }

    // Copy files and folders (deep copy) to another folder
    if (body.action === 'copy') {
      const { fileIds, folderIds, targetFolderId } = body;
      if (!targetFolderId) {
        return NextResponse.json({ error: 'Target folder required' }, { status: 400 });
      }

      // Verify target folder belongs to user (if not root)
      if (targetFolderId !== 'root') {
        const targetDoc = await db.collection('folders').doc(targetFolderId).get();
        if (!targetDoc.exists || targetDoc.data()?.userId !== userId) {
          return NextResponse.json({ error: 'Target folder not found' }, { status: 404 });
        }
      }

      const now = new Date();
      let totalCopiedSize = 0;

      // Helper: copy all files in a folder to a new parent
      async function copyFilesInFolder(sourceFolderId: string, destFolderId: string) {
        const filesSnap = await db.collection('diskFiles')
          .where('userId', '==', userId)
          .where('folderId', '==', sourceFolderId)
          .get();

        for (const doc of filesSnap.docs) {
          const fileData = doc.data();
          if (fileData.isTrashed) continue;
          const newFileId = generateFileId();
          const ext = getFileExtension(fileData.name, fileData.mimeType);
          const newS3Key = `disk/${userId}/${newFileId}${ext ? '.' + ext : ''}`;
          await copyObject(fileData.s3Key, newS3Key);
          await db.collection('diskFiles').doc(newFileId).set({
            userId,
            name: fileData.name,
            s3Key: newS3Key,
            mimeType: fileData.mimeType,
            size: fileData.size || 0,
            folderId: destFolderId,
            isTrashed: false,
            createdAt: now,
            updatedAt: now,
          });
          totalCopiedSize += fileData.size || 0;
        }
      }

      // Helper: recursively copy a folder and all its contents
      async function deepCopyFolder(sourceFolderId: string, destParentId: string) {
        const folderDoc = await db.collection('folders').doc(sourceFolderId).get();
        if (!folderDoc.exists || folderDoc.data()?.userId !== userId) return;
        const folderData = folderDoc.data()!;

        // Create new folder in destination
        const newFolderRef = await db.collection('folders').add({
          userId,
          name: folderData.name,
          parentId: destParentId,
          path: '/',
          isTrashed: false,
          createdAt: now,
          updatedAt: now,
        });

        // Copy all files in this folder
        await copyFilesInFolder(sourceFolderId, newFolderRef.id);

        // Recursively copy subfolders
        const subFoldersSnap = await db.collection('folders')
          .where('userId', '==', userId)
          .where('parentId', '==', sourceFolderId)
          .get();

        for (const subDoc of subFoldersSnap.docs) {
          if (subDoc.data().isTrashed) continue;
          await deepCopyFolder(subDoc.id, newFolderRef.id);
        }
      }

      // Copy individual files
      if (fileIds?.length) {
        for (const fId of fileIds) {
          const fileDoc = await db.collection('diskFiles').doc(fId).get();
          if (!fileDoc.exists || fileDoc.data()?.userId !== userId) continue;
          const fileData = fileDoc.data()!;
          const newFileId = generateFileId();
          const ext = getFileExtension(fileData.name, fileData.mimeType);
          const newS3Key = `disk/${userId}/${newFileId}${ext ? '.' + ext : ''}`;
          await copyObject(fileData.s3Key, newS3Key);
          await db.collection('diskFiles').doc(newFileId).set({
            userId,
            name: fileData.name,
            s3Key: newS3Key,
            mimeType: fileData.mimeType,
            size: fileData.size || 0,
            folderId: targetFolderId,
            isTrashed: false,
            createdAt: now,
            updatedAt: now,
          });
          totalCopiedSize += fileData.size || 0;
        }
      }

      // Deep copy folders (with all subfolders and files)
      if (folderIds?.length) {
        for (const fId of folderIds) {
          await deepCopyFolder(fId, targetFolderId);
        }
      }

      // Update storage used
      if (totalCopiedSize > 0) {
        const userDoc = await db.collection('users').doc(userId).get();
        const currentUsed = userDoc.data()?.storageUsed || 0;
        await db.collection('users').doc(userId).update({
          storageUsed: currentUsed + totalCopiedSize,
        });
      }

      return NextResponse.json({ success: true });
    }

    // Confirm upload (original behavior)
    const { fileId, s3Key, filename, mimeType, size, folderId = 'root' } = body;

    if (!fileId || !s3Key || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auto-rename if a file with the same name exists in this folder
    const finalName = await getUniqueFilename(userId, folderId, filename);

    const now = new Date();
    await db.collection('diskFiles').doc(fileId).set({
      userId,
      name: finalName,
      s3Key,
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0,
      folderId,
      isTrashed: false,
      createdAt: now,
      updatedAt: now,
    });

    // Update storage used
    await db.collection('users').doc(userId).update({
      storageUsed: (await db.collection('users').doc(userId).get()).data()?.storageUsed + (size || 0),
    });

    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error('Disk files PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/disk-files — trash a file
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    const fileDoc = await db.collection('diskFiles').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await db.collection('diskFiles').doc(fileId).update({
      isTrashed: true,
      trashedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk files DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
