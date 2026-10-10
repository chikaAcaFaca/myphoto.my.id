import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { generateDownloadUrl } from '@/lib/s3';
import { sendMessage, getConversationFor, MessageError } from '@/lib/messages';

export const dynamic = 'force-dynamic';

const toIso = (v: any) => (v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(0)).toISOString();

function errorResponse(error: unknown) {
  if (error instanceof MessageError) {
    return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
  }
  console.error('Conversation route error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// GET /api/messages/[id]?after=ISO — the latest 50 messages (or only newer
// than `after`, for polling). Opening a conversation marks it read.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;

  try {
    const { ref, data } = await getConversationFor(userId, id);
    const after = request.nextUrl.searchParams.get('after');

    let q = ref.collection('messages').orderBy('createdAt', 'desc').limit(50);
    if (after && !Number.isNaN(Date.parse(after))) q = q.where('createdAt', '>', new Date(after));
    const snap = await q.get();

    // Resolve meme previews once per meme.
    const memeIds = [...new Set(snap.docs.map((d) => d.data().memeId).filter(Boolean))] as string[];
    const memes: Record<string, { imageUrl: string; caption: string; mediaType: string }> = {};
    await Promise.all(
      memeIds.map(async (memeId) => {
        const m = (await db.collection('memes').doc(memeId).get()).data();
        if (!m) return;
        let imageUrl = m.imageUrl || '';
        if (m.s3Key && !imageUrl) {
          try { imageUrl = await generateDownloadUrl(m.s3Key); } catch {}
        }
        memes[memeId] = { imageUrl, caption: m.caption || '', mediaType: m.mediaType || 'image' };
      })
    );

    const messages = snap.docs
      .map((d) => {
        const x = d.data();
        return {
          id: d.id,
          senderId: x.senderId,
          text: x.text || '',
          meme: x.memeId ? { id: x.memeId, ...(memes[x.memeId] || { imageUrl: '', caption: '', mediaType: 'image' }) } : null,
          createdAt: toIso(x.createdAt),
        };
      })
      .reverse();

    if ((data.unread?.[userId] || 0) > 0) {
      await ref.update({ [`unread.${userId}`]: 0 });
    }

    const otherId = (data.participants as string[]).find((p) => p !== userId) || '';
    const blockedByMe = await db.collection('users').doc(userId).collection('blocked').doc(otherId).get();

    return NextResponse.json({
      conversation: {
        id,
        other: { id: otherId, name: data.names?.[otherId] || '' },
        status: data.status === 'request' ? (data.requestedBy === userId ? 'request_out' : 'request_in') : 'active',
        blockedByMe: blockedByMe.exists,
        // The other side's last read: everything up to now is "seen" when
        // their unread count is 0.
        // Never for a pending request: reading it must not tell the sender.
        seenByOther: data.status !== 'request' && (data.unread?.[otherId] || 0) === 0,
      },
      messages,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/messages/[id] { text?, memeId? } — reply in this conversation.
// { action: 'accept' } accepts a message request without replying.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const { ref, data } = await getConversationFor(userId, id);
    const otherId = (data.participants as string[]).find((p) => p !== userId) || '';

    if (body?.action === 'accept') {
      if (data.status === 'request' && data.requestedBy !== userId) {
        await ref.update({ status: 'active' });
      }
      return NextResponse.json({ success: true, status: 'active' });
    }

    const result = await sendMessage(userId, otherId, { text: body?.text, memeId: body?.memeId });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/messages/[id] — hide the conversation for me (declines a
// request). It comes back if the other side writes again.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;
  const { id } = await params;

  try {
    const { ref } = await getConversationFor(userId, id);
    await ref.update({ [`hidden.${userId}`]: true, [`unread.${userId}`]: 0 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
