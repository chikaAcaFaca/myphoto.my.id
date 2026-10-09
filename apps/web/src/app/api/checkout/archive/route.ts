import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ARCHIVE_MONTH_OPTIONS, getArchiveOffers } from '@myphoto/shared';
import { auth, db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { createCreemCheckout } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/archive  { months } → { url }
 *
 * One-time "keep my files" purchase for a user over their free allowance.
 * The price is computed here from the bytes stored right now (never trusted
 * from the client) and charged through a single one-time Creem product
 * (CREEM_ARCHIVE_PRODUCT_ID) with a per-checkout custom_price. If a real plan
 * is no dearer for that duration, the archive is refused and the client is
 * told which plan to buy instead.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  const productId = process.env.CREEM_ARCHIVE_PRODUCT_ID;
  if (!productId) {
    return NextResponse.json({ error: 'Archive is not available yet', code: 'not-configured' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const months = Number(body?.months);
  if (!(ARCHIVE_MONTH_OPTIONS as readonly number[]).includes(months)) {
    return NextResponse.json({ error: 'Unknown archive length' }, { status: 400 });
  }

  const user = (await db.collection('users').doc(userId).get()).data();
  const bytes = user?.storageUsed || 0;
  if (!user || bytes <= (user.storageLimit || 0)) {
    return NextResponse.json({ error: 'Your files already fit your storage' }, { status: 400 });
  }

  const offer = getArchiveOffers(bytes).find((o) => o.months === months)!;
  if (offer.kind === 'plan') {
    return NextResponse.json(
      { error: 'A plan is cheaper for this period', code: 'plan-cheaper', tier: offer.tier.tier, period: offer.period },
      { status: 409 }
    );
  }

  try {
    const email = (await auth().getUser(userId)).email;
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
    const checkout = await createCreemCheckout({
      productId,
      userId,
      email,
      requestId: `${userId}:archive:${randomUUID()}`,
      successUrl: `${origin}/keep-files?archived=true`,
      customPriceCents: Math.round(offer.price * 100),
      metadata: { kind: 'archive', months, bytes },
    });
    return NextResponse.json({ url: checkout.checkout_url, price: offer.price });
  } catch (error) {
    console.error('Creem archive checkout error:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
