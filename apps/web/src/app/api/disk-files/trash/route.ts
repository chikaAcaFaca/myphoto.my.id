import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { deleteObject } from '@/lib/s3';
import { applyDeltaToSharedAncestors } from '@/lib/shared-folder-quota';

export const dynamic = 'force-dynamic';

// GET /api/disk-files/trash — list trashed disk files and folders
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    // Get trashed files
    const filesSnap = await db.collection('diskFiles')
      .where('userId', '==', userId)
      .where('isTrashed', '==', true)
      .get();

    const files = filesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      trashedAt: doc.data().trashedAt?.toDate?.()?.toISOString() || null,
    }));

    // Get trashed folders
    const foldersSnap = await db.collection('folders')
      .where('userId', '==', userId)
      .where('isTrashed', '==', true)
      .get();

    const folders = foldersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      trashedAt: doc.data().trashedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ files, folders });
  } catch (error) {
    console.error('Disk trash GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/disk-files/trash — restore items from trash
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { action, ids, type } = await request.json();

    if (action !== 'restore' || !ids?.length || !type) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const collection = type === 'folder' ? 'folders' : 'diskFiles';
    const batch = db.batch();
    // Restore now also re-adds the freed bytes to storageUsed since
    // soft-delete decremented them. Tracking the total here so we update
    // the user counter once at the end of the batch.
    let bytesToRestore = 0;

    for (const id of ids) {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      if (doc.exists && doc.data()?.userId === userId) {
        batch.update(docRef, { isTrashed: false, trashedAt: null });
        if (type === 'file') bytesToRestore += doc.data()?.size || 0;
      }
    }

    // If restoring a folder, also restore its files
    if (type === 'folder') {
      for (const folderId of ids) {
        const filesSnap = await db.collection('diskFiles')
          .where('userId', '==', userId)
          .where('folderId', '==', folderId)
          .where('isTrashed', '==', true)
          .get();
        for (const fileDoc of filesSnap.docs) {
          batch.update(fileDoc.ref, { isTrashed: false, trashedAt: null });
          bytesToRestore += fileDoc.data()?.size || 0;
        }
        // Restore subfolders too
        const subSnap = await db.collection('folders')
          .where('userId', '==', userId)
          .where('parentId', '==', folderId)
          .where('isTrashed', '==', true)
          .get();
        for (const subDoc of subSnap.docs) {
          batch.update(subDoc.ref, { isTrashed: false, trashedAt: null });
        }
      }
    }

    await batch.commit();

    if (bytesToRestore > 0) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      const currentUsed = userDoc.data()?.storageUsed || 0;
      await userRef.update({ storageUsed: currentUsed + bytesToRestore });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk trash PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/disk-files/trash — permanently delete items
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const { ids, type } = await request.json();

    if (!ids?.length || !type) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const collection = type === 'folder' ? 'folders' : 'diskFiles';
    // We no longer decrement storageUsed here — the soft-delete step
    // (DELETE /api/disk-files) now does that immediately, so permanent
    // delete is just S3 + Firestore cleanup. Decrementing again would
    // under-count. (Old pre-fix records in Trash whose soft-delete never
    // decremented will be reconciled via /api/storage/recompute.)
    const freedByFolder = new Map<string, number>();

    for (const id of ids) {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.userId !== userId) continue;

      if (type === 'file') {
        const data = doc.data() || {};
        const s3Key = data.s3Key;
        if (s3Key) {
          try { await deleteObject(s3Key); } catch {}
        }
        const bytes = data.size || 0;
        const folderId = data.folderId || 'root';
        freedByFolder.set(folderId, (freedByFolder.get(folderId) || 0) + bytes);
        await docRef.delete();
      } else {
        // Delete folder and all its files from S3
        const filesSnap = await db.collection('diskFiles')
          .where('userId', '==', userId)
          .where('folderId', '==', id)
          .get();
        for (const fileDoc of filesSnap.docs) {
          const data = fileDoc.data();
          const s3Key = data.s3Key;
          if (s3Key) {
            try { await deleteObject(s3Key); } catch {}
          }
          const bytes = data.size || 0;
          freedByFolder.set(id, (freedByFolder.get(id) || 0) + bytes);
          await fileDoc.ref.delete();
        }
        await docRef.delete();
      }
    }

    // Fan out negative deltas to viewers of any share covering each folder
    // that lost bytes. Fire-and-forget — viewers stay over-quota briefly if
    // this fails; a manual reconcile job can fix drift later.
    for (const [folderId, bytes] of freedByFolder) {
      if (bytes > 0) {
        applyDeltaToSharedAncestors(folderId, userId, -bytes).catch((err) =>
          console.error('Share fan-out failed (purge):', err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disk trash DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
