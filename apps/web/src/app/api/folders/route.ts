import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// GET /api/folders?parentId=xxx — list folders (and files) inside a parent
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId') || 'root';

    // Get subfolders
    const foldersSnap = await db
      .collection('folders')
      .where('userId', '==', userId)
      .where('parentId', '==', parentId)
      .get();

    const folders = foldersSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }))
      .filter((f: any) => !f.isTrashed)
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    // Get files in this folder
    const filesSnap = await db
      .collection('diskFiles')
      .where('userId', '==', userId)
      .where('folderId', '==', parentId)
      .get();

    const files = filesSnap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      }))
      .filter((f: any) => !f.isTrashed)
      .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({ folders, files });
  } catch (error) {
    console.error('Folders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/folders — create a new folder
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { name, parentId = 'root' } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check for duplicate name in same parent
    const existing = await db
      .collection('folders')
      .where('userId', '==', userId)
      .where('parentId', '==', parentId)
      .get();

    const duplicate = existing.docs.find(
      (doc) => doc.data().name === trimmedName && !doc.data().isTrashed
    );
    if (duplicate) {
      return NextResponse.json({ error: 'Folder sa ovim imenom već postoji' }, { status: 409 });
    }

    // Build path for breadcrumb
    let path = '/';
    if (parentId !== 'root') {
      const parentDoc = await db.collection('folders').doc(parentId).get();
      if (parentDoc.exists && parentDoc.data()?.userId === userId) {
        path = (parentDoc.data()?.path || '/') + parentDoc.data()?.name + '/';
      }
    }

    const now = new Date();
    const folderRef = await db.collection('folders').add({
      userId,
      name: trimmedName,
      parentId,
      path,
      isTrashed: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      id: folderRef.id,
      name: trimmedName,
      parentId,
      path,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Folders POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/folders — rename or move a folder
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const body = await request.json();
    const { folderId, name, parentId } = body;

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }

    const folderDoc = await db.collection('folders').doc(folderId).get();
    if (!folderDoc.exists || folderDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name && typeof name === 'string') updates.name = name.trim();
    if (parentId !== undefined) updates.parentId = parentId;

    await db.collection('folders').doc(folderId).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folders PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/folders — trash a folder (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) return authResult.response;
    const { userId } = authResult;

    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }

    const folderDoc = await db.collection('folders').doc(folderId).get();
    if (!folderDoc.exists || folderDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const now = new Date();
    // Trash the folder
    await db.collection('folders').doc(folderId).update({
      isTrashed: true,
      trashedAt: now,
    });

    // Trash all files in this folder and subfolders
    const batch = db.batch();

    const filesSnap = await db
      .collection('diskFiles')
      .where('userId', '==', userId)
      .where('folderId', '==', folderId)
      .get();

    for (const doc of filesSnap.docs) {
      batch.update(doc.ref, { isTrashed: true, trashedAt: now });
    }

    const subSnap = await db
      .collection('folders')
      .where('userId', '==', userId)
      .where('parentId', '==', folderId)
      .get();

    for (const doc of subSnap.docs) {
      batch.update(doc.ref, { isTrashed: true, trashedAt: now });
    }

    if (filesSnap.docs.length > 0 || subSnap.docs.length > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Folders DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
