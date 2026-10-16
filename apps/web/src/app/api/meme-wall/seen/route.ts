import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { markSeen } from '@/lib/meme-feed';

export const dynamic = 'force-dynamic';

// POST /api/meme-wall/seen { ids: string[] } — memes the user scrolled past,
// sent in batches so the "Za tebe" feed shows new ones first next time.
export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids)
    ? [...new Set((body.ids as unknown[]).filter((x): x is string => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)))].slice(0, 50)
    : [];
  if (ids.length) await markSeen(auth.userId, ids);
  return NextResponse.json({ ok: true });
}
