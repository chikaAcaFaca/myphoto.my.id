import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'search');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Parse request body
    const body = await request.json();
    const { query, filters = {}, page = 1, pageSize = 50 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Normalize search query
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    // Build Firestore query
    let filesRef = db
      .collection('files')
      .where('userId', '==', userId)
      .where('isTrashed', '==', false);

    // Apply filters
    if (filters.type) {
      filesRef = filesRef.where('type', '==', filters.type);
    }
    if (filters.isFavorite !== undefined) {
      filesRef = filesRef.where('isFavorite', '==', filters.isFavorite);
    }
    if (filters.isArchived !== undefined) {
      filesRef = filesRef.where('isArchived', '==', filters.isArchived);
    }
    if (filters.albumId) {
      filesRef = filesRef.where('albumIds', 'array-contains', filters.albumId);
    }

    // Get all matching files (we need to filter by labels client-side due to Firestore limitations)
    const snapshot = await filesRef.orderBy('createdAt', 'desc').get();

    // Filter by search terms (matching labels, name, or OCR text)
    const matchingFiles = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const labels: string[] = data.labels || [];
      const name: string = (data.name || '').toLowerCase();
      const ocrText: string = (data.ocrText || '').toLowerCase();

      // Check if any search term matches
      return searchTerms.some((term) => {
        // Check labels
        if (labels.some((label) => label.toLowerCase().includes(term))) {
          return true;
        }
        // Check filename
        if (name.includes(term)) {
          return true;
        }
        // Check OCR text
        if (ocrText.includes(term)) {
          return true;
        }
        return false;
      });
    });

    // Paginate results
    const total = matchingFiles.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedFiles = matchingFiles.slice(startIndex, endIndex);

    // Convert to response format
    const files = paginatedFiles.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        takenAt: data.takenAt?.toDate?.()?.toISOString(),
        trashedAt: data.trashedAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({
      items: files,
      total,
      page,
      pageSize,
      hasMore: endIndex < total,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
