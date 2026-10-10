'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Cloud,
  Check,
  ArrowLeft,
  Shield,
  Lock,
  Download,
  Server,
  Zap,
  Coffee,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  STORAGE_TIERS,
  BILLING_PERIOD_ORDER,
  getTierPeriods,
  resolveTierPeriod,
  getTierPrice,
  getTierMonthlyEquivalent,
  getTierSavingsPercent,
} from '@myphoto/shared';
import type { BillingPeriod } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores';
import { usePlanRecommendation } from '@/lib/hooks';
import { useI18n, useT } from '@/i18n/client';

// Only show periods at least one plan is actually sold in.
const BILLING_OPTIONS: BillingPeriod[] = BILLING_PERIOD_ORDER.filter((p) =>
  STORAGE_TIERS.some((tier) => getTierPeriods(tier).includes(p))
);

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const [billingCycle, setBillingCycle] = useState<BillingPeriod>('yearly');
  const user = useAuthStore((state) => state.user);
  const recommendation = usePlanRecommendation();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const refParam = refCode ? `&ref=${refCode}` : '';
  const registerUrl = refCode ? `/register?ref=${refCode}` : '/register';

  const { t, intlLocale } = useI18n();
  const eur = (n: number) =>
    new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(n);
  // The toggle is page-wide; a plan that is not sold in the chosen period
  // falls back to its nearest longer one (see resolveTierPeriod).
  const periodOf = (tier: typeof STORAGE_TIERS[0]) => resolveTierPeriod(tier, billingCycle);
  const getMonthlyBase = (tier: typeof STORAGE_TIERS[0]) => tier.priceMonthly;
  const getMonthlyEquivalent = (tier: typeof STORAGE_TIERS[0]) => getTierMonthlyEquivalent(tier, periodOf(tier));
  const getPeriodTotal = (tier: typeof STORAGE_TIERS[0]) => getTierPrice(tier, periodOf(tier));
  const getSavingsPercent = (tier: typeof STORAGE_TIERS[0]) => getTierSavingsPercent(tier, periodOf(tier));
  const periodShortOf = (tier: typeof STORAGE_TIERS[0]) => t(`common.periodsShort.${periodOf(tier)}`);

  const getDiscountBadge = (period: BillingPeriod) =>
    period === 'yearly' ? t('pages.pricing.twoMonthsFree') : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('pages.pricing.backHome')}
          </Link>
        </nav>
      </header>

      {/* Main content — pricing immediately */}
      <main className="container mx-auto px-4 py-8">
        {/* Title + Trust Badges (compact) */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">{t('pages.pricing.title')}</h1>
          <p className="mx-auto mt-2 max-w-xl text-gray-600 dark:text-gray-300">
            {t('pages.pricing.subtitle')}
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('pages.pricing.vatNote')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Shield className="h-3.5 w-3.5" />
              {t('pages.pricing.badgeNoAi')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Server className="h-3.5 w-3.5" />
              {t('pages.pricing.badgeEu')}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Lock className="h-3.5 w-3.5" />
              GDPR
            </span>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('pages.pricing.billingPeriod')}</span>
            <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              {BILLING_OPTIONS.map((period) => {
                const badge = getDiscountBadge(period);
                return (
                  <button
                    key={period}
                    onClick={() => setBillingCycle(period)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      billingCycle === period
                        ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {t(`common.periods.${period}`)}
                    {badge && (
                      <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Smart recommendation banner */}
        {user && recommendation && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t('pages.pricing.recommendation', { usage: recommendation.monthlyUploadFormatted })}{' '}
                <strong>{recommendation.recommendedTier.name}</strong> {t('pages.pricing.recommendationPlan')}
                {recommendation.daysUntilFull > 0 && recommendation.daysUntilFull < 365 && (
                  <>{t('pages.pricing.recommendationFull', { days: recommendation.daysUntilFull })}</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Pricing cards - Main tiers (Free through Plus) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STORAGE_TIERS.slice(0, 6).map((tier) => {
            const monthlyBase = getMonthlyBase(tier);
            const monthlyEquiv = getMonthlyEquivalent(tier);
            const periodTotal = getPeriodTotal(tier);
            const isPopular = tier.isPopular;
            const isRecommended = recommendation?.recommendedTier.tier === tier.tier;
            const savings = getSavingsPercent(tier);
            const isFree = tier.tier === 0;
            // Yearly-only tiers (e.g. MyDisk Lite 3.99€/god) ignore the
            // monthly toggle entirely — the card shows the annual price
            // as a flat number so the "0.33€/mes" optical illusion
            // doesn't undersell the SKU.
            const isYearlyOnly = !!tier.yearlyOnly;
            const period = periodOf(tier);
            const showSavings = period !== 'monthly' && !isFree && !isYearlyOnly && savings > 0;
            const periodShort = periodShortOf(tier);
            const fallback = !isFree && !isYearlyOnly && period !== billingCycle;

            return (
              <div
                key={tier.tier}
                className={cn(
                  'relative rounded-2xl p-6 transition-transform hover:scale-105',
                  isPopular
                    ? 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-xl ring-4 ring-primary-200 dark:ring-primary-800'
                    : 'bg-white shadow-lg dark:bg-gray-800'
                )}
              >
                {isRecommended && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                    {t('pages.pricing.recommendedForYou')}
                  </div>
                )}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    {isRecommended ? t('pages.pricing.mostPopularRecommended') : t('pages.pricing.mostPopular')}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                </div>

                {/* Price display */}
                <div className="mt-1 mb-1">
                  {isFree ? (
                    <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                      {t('pages.pricing.free')}
                    </p>
                  ) : isYearlyOnly ? (
                    <div>
                      <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                        {eur(tier.priceYearly)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {t('pages.pricing.perYear')}
                        </span>
                      </p>
                      <p className={cn('mt-0.5 text-xs', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        {t('pages.pricing.yearlyOnly')}
                      </p>
                    </div>
                  ) : showSavings ? (
                    <div>
                      <p className={cn('text-base line-through', isPopular ? 'text-primary-200' : 'text-gray-400')}>
                        {eur(monthlyBase)}{t('pages.pricing.perMonth')}
                      </p>
                      <p className="text-3xl font-bold text-green-500">
                        {eur(monthlyEquiv)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {t('pages.pricing.perMonth')}
                        </span>
                      </p>
                      <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        {eur(periodTotal)}/{periodShort}
                        {savings > 0 && (
                          <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            -{savings}%
                          </span>
                        )}
                      </p>
                      {fallback && (
                        <p className={cn('mt-0.5 text-xs', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {t('pages.pricing.billedEvery', { period: t(`common.periods.${period}`) })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                        {eur(monthlyEquiv)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {t('pages.pricing.perMonth')}
                        </span>
                      </p>
                      {period !== 'monthly' && (
                        <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {eur(periodTotal)}/{periodShort}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className={cn(
                  'mb-1 mt-2 text-2xl font-medium',
                  isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'
                )}>
                  {tier.storageDisplay}
                </p>
                {tier.memesPerDay > 0 && (
                  <p className={cn(
                    'mb-2 flex items-center gap-1 text-xs font-medium',
                    isPopular ? 'text-primary-200' : 'text-purple-600 dark:text-purple-400'
                  )}>
                    <Sparkles className="h-3 w-3" />
                    {t('pages.pricing.memesPerDay', { day: tier.memesPerDay, month: tier.memesPerMonth })}
                  </p>
                )}

                {!isFree && monthlyEquiv <= 3.50 && (
                  <p className={cn(
                    'mb-3 flex items-center gap-1.5 text-xs font-medium',
                    isPopular ? 'text-yellow-300' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    <Coffee className="h-3.5 w-3.5" />
                    {t('pages.pricing.lessThanCoffee')}
                  </p>
                )}

                <ul className="mb-6 space-y-2">
                  {tier.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={cn(
                        'mt-0.5 h-4 w-4 flex-shrink-0',
                        isPopular ? 'text-primary-100' : 'text-primary-500'
                      )} />
                      <span className={isPopular ? 'text-primary-50' : 'text-gray-600 dark:text-gray-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={
                    isFree
                      ? registerUrl
                      : `/checkout?tier=${tier.tier}&period=${period}${refParam}`
                  }
                  className={cn(
                    'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                    isPopular
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {isFree ? t('pages.pricing.startFree') : t('pages.pricing.choosePlan')}
                </Link>
                {isFree && (
                  <p className="mt-3 text-center text-xs text-green-600 dark:text-green-400">
                    {t('pages.pricing.inviteFriends')}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional tiers */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold">{t('pages.pricing.needMore')}</h2>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STORAGE_TIERS.slice(6).map((tier) => {
              const monthlyBase = getMonthlyBase(tier);
              const monthlyEquiv = getMonthlyEquivalent(tier);
              const periodTotal = getPeriodTotal(tier);
              const savings = getSavingsPercent(tier);
              const period = periodOf(tier);
              const periodShort = periodShortOf(tier);
              const showSavings = period !== 'monthly' && savings > 0;

              return (
                <div
                  key={tier.tier}
                  className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-md dark:bg-gray-800"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">{tier.name}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tier.storageDisplay}
                    </p>
                    <p className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                      <Sparkles className="h-3 w-3" />
                      {t('pages.pricing.memesPerDay', { day: tier.memesPerDay, month: tier.memesPerMonth })}
                    </p>

                    {/* Price with savings */}
                    {showSavings ? (
                      <div className="mt-1">
                        <p className="text-sm text-gray-400 line-through">
                          {eur(monthlyBase)}{t('pages.pricing.perMonth')}
                        </p>
                        <p className="text-xl font-bold text-green-500">
                          {eur(monthlyEquiv)}{t('pages.pricing.perMonth')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {eur(periodTotal)}/{periodShort}
                          {savings > 0 && (
                            <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              -{savings}%
                            </span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-xl font-bold text-primary-600">
                          {eur(monthlyEquiv)}{t('pages.pricing.perMonth')}
                        </p>
                        {period !== 'monthly' && (
                          <p className="text-sm text-gray-500">{eur(periodTotal)}/{periodShort}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/checkout?tier=${tier.tier}&period=${period}${refParam}`}
                    className="mt-4 block rounded-lg bg-gray-100 py-2 text-center font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    {t('pages.pricing.choose')}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why MyPhoto Section */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-3xl font-bold">{t('pages.pricing.whyTitle')}</h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Privacy */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('pages.pricing.why.privacyTitle')}</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  {t('pages.pricing.why.privacy1')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  {t('pages.pricing.why.privacy2')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  {t('pages.pricing.why.privacy3')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  {t('pages.pricing.why.privacy4')}
                </li>
              </ul>
            </div>

            {/* Value */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('pages.pricing.why.valueTitle')}</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t('pages.pricing.why.value1')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t('pages.pricing.why.value2')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t('pages.pricing.why.value3')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t('pages.pricing.why.value4')}
                </li>
              </ul>
            </div>

            {/* Control */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{t('pages.pricing.why.controlTitle')}</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  {t('pages.pricing.why.control1')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  {t('pages.pricing.why.control2')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  {t('pages.pricing.why.control3')}
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  {t('pages.pricing.why.control4')}
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">{t('pages.pricing.faqTitle')}</h2>
          <div className="space-y-4">
            <FaqItem n={1} />
            <FaqItem n={2} />
            <FaqItem n={3} />
            <FaqItem n={4} />
            <FaqItem n={5} />
            <FaqItem n={6} />
            <FaqItem n={7} />
            <FaqItem n={8} />
            <FaqItem n={9} />
            <FaqItem n={10} />
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-20 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-3xl font-bold">{t('pages.pricing.ctaTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            {t('pages.pricing.ctaText')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={registerUrl}
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
            >
              {t('pages.pricing.startFree')}
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t('pages.pricing.contactUs')}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="container mx-auto mt-16 border-t border-gray-200 px-4 py-8 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary-500" />
            <span className="font-semibold">MyPhoto</span>
          </div>
          <p className="text-sm text-gray-500">
            {t('pages.pricing.footerRights', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">{t('pages.pricing.footerPrivacy')}</Link>
            <Link href="/terms" className="hover:text-primary-500">{t('pages.pricing.footerTerms')}</Link>
            <Link href="/refund" className="hover:text-primary-500">{t('pages.shell.refund')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.pricing.footerContact')}</Link>
            <Link href="/support" className="hover:text-primary-500">{t('pages.pricing.footerSupport')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ n }: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useT();
  const question = t(`pages.pricing.faq.q${n}`);
  const answer = t(`pages.pricing.faq.a${n}`);

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium">{question}</span>
        <span className="ml-4 text-gray-400">{isOpen ? '\u2212' : '+'}</span>
      </button>
      {isOpen && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{answer}</p>
      )}
    </div>
  );
}
