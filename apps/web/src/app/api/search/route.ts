import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { parseNaturalLanguageQuery, type ParsedSearch } from '@/lib/ai/nl-search-parser';

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

    // Parse natural language query
    const parsed = parseNaturalLanguageQuery(query);

    // Resolve person names to personIds
    const personIds = await resolvePersonNames(userId, parsed.personNames);

    // Normalize remaining keywords for label/text search
    const searchTerms = [
      ...parsed.keywords,
      ...parsed.locationTerms.map((l) => l.toLowerCase()),
    ].filter(Boolean);

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

    // Get all matching files (we need to filter client-side due to Firestore limitations)
    const snapshot = await filesRef.orderBy('createdAt', 'desc').get();

    // Build set of file IDs containing the searched persons
    const personFileIds = new Set<string>();
    if (personIds.length > 0) {
      for (const personId of personIds) {
        const personDoc = await db.collection('people').doc(personId).get();
        if (personDoc.exists) {
          const sampleFileIds: string[] = personDoc.data()?.sampleFileIds || [];
          sampleFileIds.forEach((id) => personFileIds.add(id));
        }
      }
    }

    // Filter files with combined criteria
    const matchingFiles = snapshot.docs.filter((doc) => {
      const data = doc.data();

      // --- Person filter: if person names were detected, file must contain that person ---
      if (personIds.length > 0) {
        if (!personFileIds.has(doc.id)) {
          return false;
        }
      }

      // --- Date range filter ---
      if (parsed.dateRange) {
        const fileDate = data.takenAt?.toDate?.() || data.createdAt?.toDate?.();
        if (fileDate) {
          if (fileDate < parsed.dateRange.from || fileDate > parsed.dateRange.to) {
            return false;
          }
        }
      }

      // --- Location filter: check locationName or labels for location terms ---
      if (parsed.locationTerms.length > 0) {
        const locationName = (data.locationName || '').toLowerCase();
        const labels: string[] = data.labels || [];
        const labelsLower = labels.map((l: string) => l.toLowerCase());

        const locationMatch = parsed.locationTerms.some((term) => {
          const termLower = term.toLowerCase();
          return (
            locationName.includes(termLower) ||
            labelsLower.some((l) => l.includes(termLower))
          );
        });

        if (!locationMatch) {
          return false;
        }
      }

      // --- Scene attribute filters (landscape, architecture, time of day, weather etc.) ---
      if (parsed.sceneFilters.length > 0) {
        const sceneAttrs = data.sceneAttributes || {};
        const sceneMatch = parsed.sceneFilters.every((filter) => {
          const attrValue = sceneAttrs[filter.field];
          if (Array.isArray(attrValue)) {
            return attrValue.includes(filter.value);
          }
          return attrValue === filter.value;
        });
        if (!sceneMatch) return false;
      }

      // --- Face attribute filters (hair color, gender etc.) ---
      if (parsed.faceFilters.length > 0) {
        const faces: any[] = data.faces || [];
        if (faces.length === 0) return false;

        const faceMatch = parsed.faceFilters.every((filter) => {
          return faces.some((face) => {
            const attrs = face.attributes || {};
            return attrs[filter.field]?.toString() === filter.value;
          });
        });
        if (!faceMatch) return false;
      }

      // --- Keyword search (labels, name, OCR) ---
      if (searchTerms.length > 0) {
        const labels: string[] = data.labels || [];
        const name: string = (data.name || '').toLowerCase();
        const ocrText: string = (data.ocrText || '').toLowerCase();

        return searchTerms.some((term) => {
          if (labels.some((label: string) => label.toLowerCase().includes(term))) return true;
          if (name.includes(term)) return true;
          if (ocrText.includes(term)) return true;
          return false;
        });
      }

      // If we got here with person/date/location filters but no keywords, include the file
      return true;
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
      // Return parsed query info so UI can show what was understood
      parsed: {
        personNames: parsed.personNames,
        locationTerms: parsed.locationTerms,
        dateRange: parsed.dateRange
          ? { from: parsed.dateRange.from.toISOString(), to: parsed.dateRange.to.toISOString() }
          : null,
        sceneFilters: parsed.sceneFilters,
        faceFilters: parsed.faceFilters,
        keywords: parsed.keywords,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Resolve person names to person document IDs by fuzzy matching
 * against the people collection.
 */
async function resolvePersonNames(userId: string, names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  const peopleSnapshot = await db
    .collection('people')
    .where('userId', '==', userId)
    .get();

  const personIds: string[] = [];

  for (const name of names) {
    const nameLower = name.toLowerCase();

    for (const doc of peopleSnapshot.docs) {
      const personName = (doc.data().name || '').toLowerCase();
      if (!personName) continue;

      // Exact or partial match
      if (
        personName === nameLower ||
        personName.startsWith(nameLower) ||
        nameLower.startsWith(personName)
      ) {
        personIds.push(doc.id);
      }
    }
  }

  return personIds;
}
