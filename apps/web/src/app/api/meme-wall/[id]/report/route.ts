import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { checkIpRateLimit, getClientIp, getOptionalUserId } from '@/lib/auth-utils';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const REASONS = new Set(['spam', 'nudity', 'hate', 'violence', 'copyright', 'other']);
const SUPPORT_EMAIL = 'support@myphotomy.space';
// Distinct reporters after which a meme leaves the public wall until a human
// looks at it (the meme itself is kept; support can restore isPublic).
const AUTO_HIDE_AT = 3;

// POST /api/meme-wall/[id]/report { reason } — public: guests can report too.
// One report per meme per reporter (user id, or hashed IP for guests).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await checkIpRateLimit(request, 'api');
  if (!limited.success) return limited.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = REASONS.has(body?.reason) ? body.reason : 'other';

  const userId = await getOptionalUserId(request);
  const reporterKey = userId
    ? `u_${userId}`
    : `ip_${createHash('sha256').update(getClientIp(request)).digest('hex').slice(0, 32)}`;

  try {
    const memeRef = db.collection('memes').doc(id);
    const meme = await memeRef.get();
    if (!meme.exists) return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    const m = meme.data()!;

    const reportRef = db.collection('reports').doc(`meme_${id}_${reporterKey}`);
    try {
      await reportRef.create({
        kind: 'meme',
        memeId: id,
        reportedId: m.authorId || null,
        reporterId: userId,
        reason,
        caption: m.caption || '',
        status: 'open',
        createdAt: new Date(),
      });
    } catch {
      return NextResponse.json({ success: true, duplicate: true });
    }

    const count = (await db.collection('reports').where('memeId', '==', id).count().get()).data().count;
    const hidden = count >= AUTO_HIDE_AT && m.isPublic === true;
    if (hidden) await memeRef.update({ isPublic: false, hiddenByReports: true });

    const link = `https://myphotomy.space/meme/${id}`;
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Prijava mima (${reason})${hidden ? ' - SKLONJEN sa zida' : ''} #${id}`,
      text: `Mim: ${link}\nRazlog: ${reason}\nPrijava broj: ${count}\nAutor: ${m.authorId || '?'}\nPrijavio: ${userId || 'gost'}${hidden ? `\n\nSklonjen sa zida posle ${AUTO_HIDE_AT} prijave. Vrati ga sa isPublic=true ako je u redu.` : ''}`,
      html: `<p>Mim: <a href="${link}">${link}</a><br>Razlog: ${reason}<br>Prijava broj: ${count}<br>Autor: ${m.authorId || '?'}<br>Prijavio: ${userId || 'gost'}</p>${hidden ? `<p><b>Sklonjen sa zida posle ${AUTO_HIDE_AT} prijave.</b> Vrati ga sa isPublic=true ako je u redu.</p>` : ''}`,
    }).catch(() => false);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Meme report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
