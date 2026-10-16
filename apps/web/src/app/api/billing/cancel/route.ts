import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { getActiveSubscription } from '@/lib/billing';
import { cancelCreemSubscription } from '@/lib/creem';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/cancel → cancel at the end of the paid period.
 * Shown only after the retention offer was declined (settings page).
 * Access continues until subscription.canceled arrives from Creem.
 */
export async function POST(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;

  const sub = await getActiveSubscription(authResult.userId);
  if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  if (sub.provider !== 'creem' || !sub.creemSubscriptionId) {
    return NextResponse.json({ error: 'Please contact support to cancel this subscription' }, { status: 409 });
  }

  try {
    await cancelCreemSubscription(sub.creemSubscriptionId, 'scheduled');
    await db.collection('subscriptions').doc(sub.id).update({ cancelAtPeriodEnd: true });
    return NextResponse.json({ success: true, currentPeriodEnd: sub.currentPeriodEnd });
  } catch (error) {
    console.error('Creem cancel failed:', error);
    return NextResponse.json({ error: 'Could not cancel the subscription' }, { status: 502 });
  }
}
