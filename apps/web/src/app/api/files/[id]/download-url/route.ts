import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET /api/files/[id]/download-url — return a presigned URL for downloading
// this file. Mobile uses the same endpoint for both "save to gallery" and
// "open in editor" flows; serving an ID-based URL is friendlier than the
// existing s3Key-based POST since the client doesn't have to know the key.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthWithRateLimit(request, 'download');
  if (!auth.success) return auth.response;

  const { id } = await params;
  const doc = await db.collection('files').doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  const data = doc.data()!;
  if (data.userId !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!data.s3Key) {
    return NextResponse.json({ error: 'File has no storage key' }, { status: 500 });
  }

  const downloadUrl = await generateDownloadUrl(data.s3Key);
  return NextResponse.json({
    downloadUrl,
    fileName: data.name,
    mimeType: data.mimeType,
    size: data.size || 0,
  });
}
