import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { STORAGE_TIERS, type BillingPeriod } from '@myphoto/shared';
import { auth } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { createCreemCheckout, getCreemProductId } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/creem  { tier, period } → { url }
 *
 * The checkout session is created server-side so the API key never reaches
 * the browser and the buyer's Firebase uid rides along in `metadata` — the
 * webhook then credits exactly this account, whatever email they type.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  const body = await request.json().catch(() => ({}));
  const tierNum = Number(body?.tier);
  const period: BillingPeriod = body?.period === 'yearly' ? 'yearly' : 'monthly';

  const tier = STORAGE_TIERS.find((t) => t.tier === tierNum);
  if (!tier || tier.tier === 0) {
    return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
  }
  if (tier.yearlyOnly && period === 'monthly') {
    return NextResponse.json({ error: 'This plan is billed yearly only' }, { status: 400 });
  }
  const productId = getCreemProductId(tier, period);
  if (!productId) {
    return NextResponse.json(
      { error: `Plan "${tier.name}" is not available for ${period} billing yet`, code: 'not-configured' },
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
      requestId: `${userId}:${randomUUID()}`,
      successUrl: `${origin}/photos?subscribed=true`,
      metadata: { tier: tier.tier, period },
    });
    return NextResponse.json({ url: checkout.checkout_url });
  } catch (error) {
    console.error('Creem checkout error:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
