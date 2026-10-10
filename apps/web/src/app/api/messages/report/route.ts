import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getConversationFor, MessageError } from '@/lib/messages';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const REASONS = new Set(['spam', 'harassment', 'inappropriate', 'other']);
const SUPPORT_EMAIL = 'support@myphotomy.space';

// POST /api/messages/report { conversationId, reason, messageId? }
// Stores the report with a snapshot of the last messages and emails support,
// so a human can act on it (Play policy for user-to-user messaging).
export async function POST(request: NextRequest) {
  const auth = await verifyAuthWithRateLimit(request, 'api');
  if (!auth.success) return auth.response;
  const { userId } = auth;

  const body = await request.json().catch(() => ({}));
  const convId = typeof body?.conversationId === 'string' ? body.conversationId : '';
  const reason = REASONS.has(body?.reason) ? body.reason : 'other';

  try {
    const { ref, data } = await getConversationFor(userId, convId);
    const reportedId = (data.participants as string[]).find((p) => p !== userId) || '';

    const recent = await ref.collection('messages').orderBy('createdAt', 'desc').limit(20).get();
    const snapshot = recent.docs.reverse().map((d) => {
      const m = d.data();
      return { id: d.id, senderId: m.senderId, text: m.text || '', memeId: m.memeId || null, createdAt: m.createdAt };
    });

    const reportRef = await db.collection('reports').add({
      kind: 'message',
      reporterId: userId,
      reportedId,
      conversationId: convId,
      messageId: typeof body?.messageId === 'string' ? body.messageId : null,
      reason,
      snapshot,
      status: 'open',
      createdAt: new Date(),
    });

    const lines = snapshot
      .map((m) => `${m.senderId === reportedId ? 'PRIJAVLJENI' : 'prijavio'}: ${m.memeId ? `[mim ${m.memeId}] ` : ''}${m.text}`)
      .join('\n');
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Prijava poruke (${reason}) #${reportRef.id}`,
      text: `Prijava ${reportRef.id}\nRazlog: ${reason}\nPrijavio: ${userId}\nPrijavljeni: ${reportedId}\nRazgovor: ${convId}\n\n${lines}`,
      html: `<p>Prijava <b>${reportRef.id}</b><br>Razlog: ${reason}<br>Prijavio: ${userId}<br>Prijavljeni: ${reportedId}<br>Razgovor: ${convId}</p><pre>${lines.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</pre>`,
    }).catch(() => false);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof MessageError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
