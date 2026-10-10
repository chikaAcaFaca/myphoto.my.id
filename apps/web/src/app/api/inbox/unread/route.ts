import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getUnreadCount } from '@/lib/inbox';

export const dynamic = 'force-dynamic';

// GET /api/inbox/unread — badge count, polled by the app.
export async function GET(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  return NextResponse.json({ unread: await getUnreadCount(auth.userId) });
}
