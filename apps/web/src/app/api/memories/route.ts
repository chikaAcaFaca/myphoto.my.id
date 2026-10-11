import { NextRequest, NextResponse } from 'next/server';
import { thumbUrls } from '@/lib/thumb-urls';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getAllMemories } from '@/lib/ai/memories';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify auth and check rate limit
    const authResult = await verifyAuthWithRateLimit(request, 'api');
    if (!authResult.success) {
      return authResult.response;
    }
    const { userId } = authResult;

    // Get all memories for user
    const memories = await getAllMemories(userId);
    // Thumbnails as presigned URLs (no per-image /api/thumbnail call).
    await Promise.all(
      memories.flatMap((m: any) => (m.files || []).slice(0, 10).map(async (f: any) => {
        Object.assign(f, await thumbUrls(f));
      }))
    );

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Memories API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
