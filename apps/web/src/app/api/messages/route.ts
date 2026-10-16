import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { sendMessage, MessageError } from '@/lib/messages';

export const dynamic = 'force-dynamic';

const toIso = (v: any) => (v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(0)).toISOString();

// GET /api/messages — my conversations, newest first.
// status: 'active' | 'request_in' (someone asks to message me) | 'request_out'
export async function GET(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const snap = await db.collection('conversations').where('participants', 'array-contains', userId).limit(300).get();

  const conversations = snap.docs
    .map((d) => {
      const c = d.data();
      if (c.hidden?.[userId]) return null;
      const otherId = (c.participants as string[]).find((p) => p !== userId) || '';
      const status =
        c.status === 'request' ? (c.requestedBy === userId ? 'request_out' : 'request_in') : 'active';
      return {
        id: d.id,
        other: { id: otherId, name: c.names?.[otherId] || '' },
        status,
        unread: c.unread?.[userId] || 0,
        lastMessage: c.lastMessage
          ? {
              text: c.lastMessage.text || '',
              isMeme: !!c.lastMessage.memeId,
              fromMe: c.lastMessage.senderId === userId,
              at: toIso(c.lastMessage.at),
            }
          : null,
        updatedAt: toIso(c.updatedAt),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.updatedAt < b!.updatedAt ? 1 : -1));

  return NextResponse.json({ conversations });
}

// POST /api/messages { toUserId, text?, memeId? } — start or continue a
// conversation with a user (used from profiles and "send meme to…").
export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const toUserId = typeof body?.toUserId === 'string' ? body.toUserId : '';
  if (!/^[A-Za-z0-9]{10,128}$/.test(toUserId)) {
    return NextResponse.json({ error: 'toUserId required', code: 'BAD_REQUEST' }, { status: 400 });
  }

  try {
    const result = await sendMessage(auth.userId, toUserId, { text: body?.text, memeId: body?.memeId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MessageError) {
      return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
    }
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
