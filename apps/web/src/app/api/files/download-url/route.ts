import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';

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

    // Verify the s3Key belongs to this user (starts with their userId)
    if (!s3Key.startsWith(authResult.userId + '/')) {
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
