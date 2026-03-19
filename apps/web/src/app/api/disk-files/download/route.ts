import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'download');
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

    const fileData = fileDoc.data()!;

    // Return presigned URL — client downloads directly from S3
    const downloadUrl = await generateDownloadUrl(fileData.s3Key);

    return NextResponse.json({ downloadUrl, fileName: fileData.name, mimeType: fileData.mimeType });
  } catch (error) {
    console.error('Disk file download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
