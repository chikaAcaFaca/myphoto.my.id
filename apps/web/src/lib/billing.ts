import { STORAGE_TIERS, isBillingPeriod, type BillingPeriod, type StorageTier } from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';

export interface ActiveSubscription {
  id: string;
  creemSubscriptionId: string | null;
  provider: string;
  tier: StorageTier;
  period: BillingPeriod | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/** The user's current paid subscription (largest active one), if any. */
export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  const snap = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  let best: ActiveSubscription | null = null;
  for (const doc of snap.docs) {
    const d = doc.data();
    const tier = STORAGE_TIERS.find((t) => t.tier === d.tier);
    if (!tier) continue;
    if (best && best.tier.storageBytes >= tier.storageBytes) continue;
    best = {
      id: doc.id,
      creemSubscriptionId: d.creemSubscriptionId ?? null,
      provider: d.provider ?? 'paddle',
      tier,
      period: isBillingPeriod(d.billingPeriod) ? d.billingPeriod : null,
      status: d.status,
      currentPeriodEnd: d.currentPeriodEnd?.toDate?.()?.toISOString() ?? null,
      cancelAtPeriodEnd: !!d.cancelAtPeriodEnd,
    };
  }
  return best;
}
