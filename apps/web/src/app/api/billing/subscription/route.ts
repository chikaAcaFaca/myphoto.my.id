import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getActiveSubscription } from '@/lib/billing';

export const dynamic = 'force-dynamic';

/** GET /api/billing/subscription → { subscription } (null on the free plan). */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;

  const sub = await getActiveSubscription(authResult.userId);
  return NextResponse.json({
    subscription: sub && {
      id: sub.id,
      provider: sub.provider,
      tier: sub.tier.tier,
      period: sub.period,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  });
}
