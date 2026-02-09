import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { credential } from 'firebase-admin';

export const dynamic = 'force-dynamic';

const INDEXES = [
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isTrashed', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isTrashed', order: 'ASCENDING' },
      { fieldPath: 'isArchived', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'type', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isFavorite', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'isArchived', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'files',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'albumIds', arrayConfig: 'CONTAINS' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
  {
    collectionGroup: 'albums',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' },
    ],
  },
];

export async function POST(request: NextRequest) {
  try {
    initAdmin();

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const database = 'myphoto';

    // Get access token from service account
    const cred = credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    });
    const tokenResult = await cred.getAccessToken();

    const results: any[] = [];

    for (const index of INDEXES) {
      const collectionGroup = index.collectionGroup;
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${database}/collectionGroups/${collectionGroup}/indexes`;

      const body = {
        queryScope: 'COLLECTION',
        fields: index.fields.map((f: any) => {
          if (f.arrayConfig) {
            return { fieldPath: f.fieldPath, arrayConfig: f.arrayConfig };
          }
          return { fieldPath: f.fieldPath, order: f.order };
        }),
      };

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenResult.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        results.push({
          collection: collectionGroup,
          fields: index.fields.map((f: any) => f.fieldPath).join(', '),
          status: res.ok ? 'creating' : data.error?.message || 'failed',
          statusCode: res.status,
        });
      } catch (err: any) {
        results.push({
          collection: collectionGroup,
          fields: index.fields.map((f: any) => f.fieldPath).join(', '),
          status: `error: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error creating indexes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create indexes' },
      { status: 500 }
    );
  }
}
