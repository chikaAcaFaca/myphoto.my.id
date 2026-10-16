import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { markRead } from '@/lib/inbox';

export const dynamic = 'force-dynamic';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,120}$/;

// POST /api/inbox/read { ids?: string[] } — no ids marks everything read.
export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === 'string' && ID_PATTERN.test(id)) : undefined;
  await markRead(auth.userId, ids);
  return NextResponse.json({ success: true });
}
