import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { db } from '@/lib/firebase-admin';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'image' | 'video' | 'document' | 'other'
    const isTrashed = searchParams.get('isTrashed') === 'true';
    const isArchived = searchParams.get('isArchived') === 'true';
    const isFavorite = searchParams.get('isFavorite');
    const albumId = searchParams.get('albumId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '60', 10), 200);

    // Build Firestore query
    let query = db.collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', isTrashed);

    if (type) {
      query = query.where('type', '==', type);
    }

    if (isArchived) {
      query = query.where('isArchived', '==', true);
    } else {
      query = query.where('isArchived', '==', false);
    }

    if (isFavorite === 'true') {
      query = query.where('isFavorite', '==', true);
    }

    if (albumId) {
      query = query.where('albumIds', 'array-contains', albumId);
    }

    // Order by creation date (newest first) and paginate
    query = query.orderBy('createdAt', 'desc');

    // Use offset-based pagination (good enough for reasonable dataset sizes)
    const offset = (page - 1) * pageSize;
    if (offset > 0) {
      query = query.offset(offset);
    }
    query = query.limit(pageSize + 1); // +1 to check hasMore

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    const items = docs.slice(0, pageSize);

    // Generate presigned thumbnail URLs for each file
    const files = await Promise.all(
      items.map(async (doc) => {
        const data = doc.data();
        const file: Record<string, any> = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          takenAt: data.takenAt?.toDate?.()?.toISOString() || data.takenAt || null,
          trashedAt: data.trashedAt?.toDate?.()?.toISOString() || data.trashedAt || null,
        };

        // Add presigned thumbnail URL for mobile clients
        if (data.smallThumbKey) {
          try {
            file.smallThumbUrl = await generateDownloadUrl(data.smallThumbKey);
          } catch { /* skip */ }
        }
        if (data.thumbnailKey) {
          try {
            file.thumbnailUrl = await generateDownloadUrl(data.thumbnailKey);
          } catch { /* skip */ }
        }

        return file;
      })
    );

    return NextResponse.json({
      files,
      page,
      pageSize,
      hasMore,
    });
  } catch (error) {
    console.error('Error listing files:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
