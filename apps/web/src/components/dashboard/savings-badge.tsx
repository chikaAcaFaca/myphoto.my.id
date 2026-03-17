'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';

const DISMISS_KEY = 'myphoto_savings_badge_dismissed';

export function SavingsBadge() {
  const user = useAuthStore((state) => state.user);
  const [dismissed, setDismissed] = useState(true);
  const [subscription, setSubscription] = useState<{ tier: number; billingPeriod: string } | null>(null);

  useEffect(() => {
    // Check if dismissed this session
    const d = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(!!d);
  }, []);

  useEffect(() => {
    if (!user?.subscriptionIds?.length) return;
    // Try to infer tier from storageLimit
    const limit = (user as any).storageLimit || 0;
    const tier = STORAGE_TIERS.find((t) => t.storageBytes === limit);
    const billingPeriod = (user as any).billingPeriod;
    if (tier && billingPeriod && billingPeriod !== 'monthly') {
      setSubscription({ tier: tier.tier, billingPeriod });
    }
  }, [user]);

  if (dismissed || !subscription) return null;

  const tier = STORAGE_TIERS.find((t) => t.tier === subscription.tier);
  if (!tier) return null;

  const period = BILLING_PERIODS[subscription.billingPeriod as keyof typeof BILLING_PERIODS];
  if (!period) return null;

  const monthlyPrice = tier.priceMonthly;
  const periodTotal = (() => {
    switch (subscription.billingPeriod) {
      case 'quarterly': return tier.priceQuarterly;
      case 'semiAnnual': return tier.priceSemiAnnual;
      case 'yearly': return tier.priceYearly;
      default: return monthlyPrice;
    }
  })();

  const monthlyEquiv = periodTotal / period.months;
  const savedPerYear = (monthlyPrice - monthlyEquiv) * 12;

  if (savedPerYear <= 0) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950/30">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
        <p className="text-sm text-green-800 dark:text-green-200">
          Uštedeli ste <strong>€{savedPerYear.toFixed(2)} godišnje</strong> sa {period.label.toLowerCase()} planom!
        </p>
      </div>
      <button onClick={handleDismiss} className="text-green-400 hover:text-green-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
