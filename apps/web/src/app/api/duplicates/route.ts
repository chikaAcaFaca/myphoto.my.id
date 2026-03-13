import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { findDuplicates } from '@/lib/ai/duplicate-detection';

export const dynamic = 'force-dynamic';

interface FileEntry {
  fileId: string;
  hash: string;
  name: string;
  size: number;
  type: string;
  mimeType: string;
  thumbnailKey: string;
  createdAt: Date;
  width?: number;
  height?: number;
  duration?: number;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Get ALL files (images AND videos) for this user
    const snapshot = await db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false)
      .select('pHash', 'name', 'size', 'type', 'mimeType', 'thumbnailKey', 'createdAt', 'width', 'height', 'duration')
      .get();

    const allFiles: FileEntry[] = snapshot.docs.map((doc) => ({
      fileId: doc.id,
      hash: doc.data().pHash || '',
      name: doc.data().name || '',
      size: doc.data().size || 0,
      type: doc.data().type || 'image',
      mimeType: doc.data().mimeType || '',
      thumbnailKey: doc.data().thumbnailKey || '',
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      width: doc.data().width,
      height: doc.data().height,
      duration: doc.data().duration,
    }));

    if (allFiles.length < 2) {
      return NextResponse.json({ duplicates: [] });
    }

    const allGroupFileIds = new Set<string>();
    const enrichedGroups: Array<{
      files: Array<{ id: string; name: string; size: number; type: string; thumbnailKey: string; createdAt: Date; duration?: number }>;
      similarity: number;
      matchType: string;
    }> = [];

    // Strategy 1: pHash-based visual similarity (images with hashes)
    const imagesWithHash = allFiles.filter((f) => f.hash && f.type === 'image');
    if (imagesWithHash.length >= 2) {
      const pHashGroups = findDuplicates(imagesWithHash);
      for (const group of pHashGroups) {
        const files = group.files
          .map((f) => allFiles.find((af) => af.fileId === f.fileId))
          .filter((f): f is FileEntry => !!f);
        if (files.length > 1) {
          for (const f of files) allGroupFileIds.add(f.fileId);
          enrichedGroups.push({
            files: files.map(toOutput),
            similarity: group.similarity,
            matchType: 'visual',
          });
        }
      }
    }

    // Strategy 2: Exact size match (same byte count = likely identical file)
    const sizeMap = new Map<number, FileEntry[]>();
    for (const file of allFiles) {
      if (allGroupFileIds.has(file.fileId)) continue;
      const key = file.size;
      if (!sizeMap.has(key)) sizeMap.set(key, []);
      sizeMap.get(key)!.push(file);
    }
    for (const group of sizeMap.values()) {
      if (group.length > 1) {
        for (const f of group) allGroupFileIds.add(f.fileId);
        enrichedGroups.push({
          files: group.map(toOutput),
          similarity: 100,
          matchType: 'size',
        });
      }
    }

    // Strategy 3: Similar filename (strip extension, compare base names)
    const nameMap = new Map<string, FileEntry[]>();
    for (const file of allFiles) {
      if (allGroupFileIds.has(file.fileId)) continue;
      // Normalize: lowercase, strip extension, strip common suffixes like (1), _copy, -1
      const baseName = file.name
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[\s_-]?\(?\d+\)?$/, '')
        .replace(/[\s_-]?copy$/i, '')
        .trim();
      if (!baseName) continue;
      if (!nameMap.has(baseName)) nameMap.set(baseName, []);
      nameMap.get(baseName)!.push(file);
    }
    for (const group of nameMap.values()) {
      if (group.length > 1) {
        for (const f of group) allGroupFileIds.add(f.fileId);
        enrichedGroups.push({
          files: group.map(toOutput),
          similarity: 85,
          matchType: 'name',
        });
      }
    }

    return NextResponse.json({ duplicates: enrichedGroups });
  } catch (error) {
    console.error('Duplicates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function toOutput(f: FileEntry) {
  return {
    id: f.fileId,
    name: f.name,
    size: f.size,
    type: f.type,
    thumbnailKey: f.thumbnailKey,
    createdAt: f.createdAt,
    duration: f.duration,
  };
}

// Dismiss or delete a duplicate
export async function POST(request: NextRequest) {
  try {
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

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (action === 'dismiss') {
      await db.collection('files').doc(fileId).update({
        duplicateReviewed: true,
        duplicateDismissedAt: new Date(),
      });
    } else if (action === 'delete') {
      await db.collection('files').doc(fileId).update({
        isTrashed: true,
        trashedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Duplicate action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
