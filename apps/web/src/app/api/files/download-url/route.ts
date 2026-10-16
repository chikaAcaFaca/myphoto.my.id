import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'download');
    if (!authResult.success) {
      return authResult.response;
    }

    const { s3Key } = await request.json();

    if (!s3Key || typeof s3Key !== 'string') {
      return NextResponse.json({ error: 'Missing s3Key' }, { status: 400 });
    }

    // Verify ownership by looking the key up in either collection (files =
    // MyPhoto gallery, diskFiles = MySpace). The old check assumed every key
    // starts with `${userId}/`, which 403'd MySpace files (e.g. a zip in a
    // folder) whose keys use a different prefix — hence "Could not get
    // download URL" in the app.
    const [filesSnap, diskSnap] = await Promise.all([
      db.collection('files').where('s3Key', '==', s3Key).limit(3).get(),
      db.collection('diskFiles').where('s3Key', '==', s3Key).limit(3).get(),
    ]);
    const owned =
      filesSnap.docs.some((d) => d.data().userId === authResult.userId) ||
      diskSnap.docs.some((d) => d.data().userId === authResult.userId);
    if (!owned) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const downloadUrl = await generateDownloadUrl(s3Key);

    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error('Download URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
