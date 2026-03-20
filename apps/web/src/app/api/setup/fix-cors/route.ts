import { NextResponse } from 'next/server';
import { configureBucketCors, getBucketCors } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// GET /api/setup/fix-cors — force-update S3 CORS (temporary, remove after use)
export async function GET() {
  try {
    // Show current CORS
    const before = await getBucketCors();

    // Apply new CORS
    await configureBucketCors();

    // Show updated CORS
    const after = await getBucketCors();

    return NextResponse.json({
      success: true,
      message: 'CORS updated successfully',
      before: before?.CORSRules || null,
      after: after?.CORSRules || null,
    });
  } catch (error) {
    console.error('CORS fix error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed',
    }, { status: 500 });
  }
}
