'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  STORAGE_TIERS,
  getTierPeriods,
  getTierPrice,
  getTierSavingsPercent,
  type BillingPeriod,
  type StorageTier,
} from '@myphoto/shared';
import { getIdToken } from '@/lib/firebase';
import { useStorage } from '@/lib/hooks';
import { useI18n } from '@/i18n/client';

interface SubscriptionInfo {
  id: string;
  provider: string;
  tier: number;
  period: BillingPeriod | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

async function api(path: string, method: 'GET' | 'POST', body?: unknown) {
  const token = await getIdToken();
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Settings → Storage: current subscription, billing portal, and cancel —
 * which first offers a smaller plan or a cheaper (longer) period.
 */
export function SubscriptionSection() {
  const { t, intlLocale } = useI18n();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  const load = useCallback(() => {
    api('/api/billing/subscription', 'GET')
      .then((d) => setSub(d.subscription))
      .catch(() => setSub(null))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(load, [load]);

  if (!loaded || !sub) return null;
  const tier = STORAGE_TIERS.find((x) => x.tier === sub.tier);
  if (!tier) return null;

  const date = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const openPortal = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api('/api/billing/portal', 'POST');
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
      <p className="text-sm text-gray-500">{t('components.subscription.title')}</p>
      <p className="mt-1 text-lg font-semibold">
        {tier.name} · {tier.storageDisplay}
        {sub.period && <span className="ml-2 text-sm font-normal text-gray-500">{t(`common.periods.${sub.period}`)}</span>}
      </p>
      {date && (
        <p className="mt-1 text-sm text-gray-500">
          {sub.cancelAtPeriodEnd
            ? t('components.subscription.endsOn', { date })
            : t('components.subscription.renewsOn', { date })}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {sub.provider === 'creem' && (
          <button onClick={openPortal} disabled={busy} className="btn-secondary text-sm">
            {t('components.subscription.manageBilling')}
          </button>
        )}
        {sub.provider === 'creem' && !sub.cancelAtPeriodEnd && (
          <button
            onClick={() => setShowCancel(true)}
            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            {t('components.subscription.cancel')}
          </button>
        )}
      </div>
      {showCancel && (
        <CancelDialog
          sub={sub}
          tier={tier}
          onClose={() => setShowCancel(false)}
          onDone={() => {
            setShowCancel(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CancelDialog({
  sub,
  tier,
  onClose,
  onDone,
}: {
  sub: SubscriptionInfo;
  tier: StorageTier;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, intlLocale } = useI18n();
  const { data: storage } = useStorage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eur = (n: number) => new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(n);

  // Offer 1: same plan, yearly — if not yearly already.
  const yearlyOffer =
    sub.period !== 'yearly' && getTierPeriods(tier).includes('yearly')
      ? { tier, period: 'yearly' as BillingPeriod, savings: getTierSavingsPercent(tier, 'yearly') }
      : null;
  // Offer 2: the smallest cheaper plan that still holds everything stored.
  const used = storage?.used ?? Infinity;
  const smaller = STORAGE_TIERS.find((x) => x.tier > 0 && x.tier < tier.tier && x.storageBytes >= used);
  const smallerPeriod = smaller ? (getTierPeriods(smaller).includes('yearly') ? 'yearly' : getTierPeriods(smaller)[0]) : null;

  const run = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(path, 'POST', body);
      onDone();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold">{t('components.subscription.retentionTitle')}</h3>
          <button onClick={onClose} aria-label={t('components.common.close')} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {smaller && smallerPeriod && (
            <button
              disabled={busy}
              onClick={() => run('/api/billing/change', { tier: smaller.tier, period: smallerPeriod })}
              className="w-full rounded-xl border border-primary-200 bg-primary-50 p-4 text-left hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20"
            >
              <p className="font-semibold">
                {t('components.subscription.switchSmaller', { plan: `${smaller.name} · ${smaller.storageDisplay}` })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {eur(getTierPrice(smaller, smallerPeriod))} / {t(`common.periods.${smallerPeriod}`)} ·{' '}
                {t('components.subscription.fitsFiles')}
              </p>
            </button>
          )}
          {yearlyOffer && (
            <button
              disabled={busy}
              onClick={() => run('/api/billing/change', { tier: tier.tier, period: 'yearly' })}
              className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20"
            >
              <p className="font-semibold">{t('components.subscription.switchYearly')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {eur(getTierPrice(tier, 'yearly'))} / {t('common.periods.yearly')}
                {yearlyOffer.savings > 0 && ` · ${t('pages.pricing.savePercent', { percent: yearlyOffer.savings })}`}
              </p>
            </button>
          )}
        </div>

        <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">{t('components.subscription.cancelWarning')}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">
            {t('components.subscription.keep')}
          </button>
          <button
            disabled={busy}
            onClick={() => run('/api/billing/cancel')}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('components.subscription.cancelAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}
