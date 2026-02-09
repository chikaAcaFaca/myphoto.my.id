import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { configureBucketCors, getBucketCors } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }

    await configureBucketCors();

    return NextResponse.json({ success: true, message: 'CORS configured' });
  } catch (error) {
    console.error('Error configuring CORS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure CORS' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }

    const cors = await getBucketCors();
    return NextResponse.json({ cors: cors?.CORSRules || null });
  } catch (error) {
    console.error('Error getting CORS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get CORS config' },
      { status: 500 }
    );
  }
}
