import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_TIERS, getTierCreemProductId, getTierPeriods, isBillingPeriod } from '@myphoto/shared';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getActiveSubscription } from '@/lib/billing';
import { changeCreemSubscriptionProduct } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/change { tier, period } — the retention offer: move the
 * existing subscription to a smaller plan or a longer period instead of
 * cancelling (no second subscription is created). The webhook's
 * subscription.update then rewrites tier/period/storage.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const tier = STORAGE_TIERS.find((t) => t.tier === Number(body?.tier));
  if (!tier || tier.tier === 0 || !isBillingPeriod(body?.period) || !getTierPeriods(tier).includes(body.period)) {
    return NextResponse.json({ error: 'Unknown plan or period' }, { status: 400 });
  }
  const productId = getTierCreemProductId(tier, body.period);
  if (!productId) {
    return NextResponse.json({ error: 'This plan is not available yet', code: 'not-configured' }, { status: 409 });
  }

  const sub = await getActiveSubscription(authResult.userId);
  if (!sub?.creemSubscriptionId || sub.provider !== 'creem') {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  try {
    // Bigger plan → charge the difference now; smaller plan or longer
    // period → switch without a mid-period charge.
    const upgrade = tier.storageBytes > sub.tier.storageBytes;
    await changeCreemSubscriptionProduct(
      sub.creemSubscriptionId,
      productId,
      upgrade ? 'proration-charge-immediately' : 'proration-none'
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Creem plan change failed:', error);
    return NextResponse.json({ error: 'Could not change the plan' }, { status: 502 });
  }
}
