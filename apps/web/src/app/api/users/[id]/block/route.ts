import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { setBlocked, conversationId, conversationRef } from '@/lib/messages';

export const dynamic = 'force-dynamic';

// GET /api/users/[id]/block — { blocked } for the current user.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { id } = await params;
  const snap = await db.collection('users').doc(auth.userId).collection('blocked').doc(id).get();
  return NextResponse.json({ blocked: snap.exists });
}

// POST /api/users/[id]/block { blocked: boolean } — a blocked user can't
// message you and you can't message them; the conversation is hidden.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id: targetId } = await params;
  if (targetId === userId) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const blocked = body?.blocked !== false;
  await setBlocked(userId, targetId, blocked);

  if (blocked) {
    const ref = conversationRef(conversationId(userId, targetId));
    if ((await ref.get()).exists) {
      await ref.update({ [`hidden.${userId}`]: true, [`unread.${userId}`]: 0 });
    }
  }
  return NextResponse.json({ success: true, blocked });
}
