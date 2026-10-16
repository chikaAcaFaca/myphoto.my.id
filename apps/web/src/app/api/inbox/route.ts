import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getUnreadCount } from '@/lib/inbox';

export const dynamic = 'force-dynamic';

const toIso = (v: any) => (v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(0)).toISOString();

// GET /api/inbox — latest activity rows (newest first) plus the unread count.
export async function GET(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const snap = await db
    .collection('users').doc(userId).collection('inbox')
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get();

  const items = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type,
      actorId: x.actorId || null,
      actorName: x.actorName || null,
      memeId: x.memeId || null,
      text: x.text || null,
      count: x.count || 1,
      read: !!x.read,
      updatedAt: toIso(x.updatedAt),
    };
  });

  return NextResponse.json({ items, unread: await getUnreadCount(userId) });
}
