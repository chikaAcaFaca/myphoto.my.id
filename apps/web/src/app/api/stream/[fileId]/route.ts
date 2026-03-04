import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit } from '@/lib/auth-utils';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const rateLimitResult = await checkIpRateLimit(request, 'download');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const { fileId } = params;

    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data()!;
    const key = fileData.s3Key;
    if (!key) {
      return NextResponse.json({ error: 'File has no storage key' }, { status: 404 });
    }

    const contentType = fileData.mimeType || 'application/octet-stream';
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      // Range request → 206 Partial Content
      const headCmd = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
      const headRes = await s3Client.send(headCmd);
      const totalSize = headRes.ContentLength || 0;

      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new NextResponse('Invalid Range header', { status: 416 });
      }

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize) {
        return new NextResponse('Range Not Satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        });
      }

      const getCmd = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Range: `bytes=${start}-${end}`,
      });
      const getRes = await s3Client.send(getCmd);
      const contentLength = end - start + 1;

      return new NextResponse(getRes.Body as ReadableStream, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // No Range header → full stream, 200 OK
    const getCmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const getRes = await s3Client.send(getCmd);

    return new NextResponse(getRes.Body as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(getRes.ContentLength ? { 'Content-Length': getRes.ContentLength.toString() } : {}),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const rateLimitResult = await checkIpRateLimit(request, 'download');
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const { fileId } = params;
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) {
      return new NextResponse(null, { status: 404 });
    }

    const fileData = fileDoc.data()!;
    const key = fileData.s3Key;
    if (!key) {
      return new NextResponse(null, { status: 404 });
    }

    const headCmd = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const headRes = await s3Client.send(headCmd);

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': fileData.mimeType || 'application/octet-stream',
        'Content-Length': (headRes.ContentLength || 0).toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in HEAD request:', error);
    return new NextResponse(null, { status: 500 });
  }
}
