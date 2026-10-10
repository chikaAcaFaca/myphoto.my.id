import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getUnreadCount } from '@/lib/inbox';
import { getUnreadMessageCount } from '@/lib/messages';

export const dynamic = 'force-dynamic';

// GET /api/inbox/unread — badge count (activity + messages), polled by the app.
export async function GET(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const [activity, messages] = await Promise.all([
    getUnreadCount(auth.userId),
    getUnreadMessageCount(auth.userId),
  ]);
  return NextResponse.json({ unread: activity + messages, activity, messages });
}
