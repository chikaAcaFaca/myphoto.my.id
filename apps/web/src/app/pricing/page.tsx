'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  Check,
  ArrowLeft,
  Shield,
  Sparkles,
  Lock,
  Download,
  Server,
  Image,
  Brain,
  Search,
  Users,
  Zap
} from 'lucide-react';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import type { BillingPeriod } from '@myphoto/shared';
import { cn } from '@/lib/utils';

const BILLING_OPTIONS: BillingPeriod[] = ['monthly', 'quarterly', 'semiAnnual', 'yearly'];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingPeriod>('monthly');
  const [planType, setPlanType] = useState<'standard' | 'ai'>('ai');

  const periodConfig = BILLING_PERIODS[billingCycle];

  const getMonthlyBase = (tier: typeof STORAGE_TIERS[0]) => {
    return planType === 'ai' ? tier.priceMonthlyAI : tier.priceMonthly;
  };

  const getMonthlyEquivalent = (tier: typeof STORAGE_TIERS[0]) => {
    if (planType === 'ai') {
      switch (billingCycle) {
        case 'monthly': return tier.priceMonthlyAI;
        case 'quarterly': return tier.priceQuarterlyAI / 3;
        case 'semiAnnual': return tier.priceSemiAnnualAI / 6;
        case 'yearly': return tier.priceYearlyAI / 12;
      }
    }
    switch (billingCycle) {
      case 'monthly': return tier.priceMonthly;
      case 'quarterly': return tier.priceQuarterly / 3;
      case 'semiAnnual': return tier.priceSemiAnnual / 6;
      case 'yearly': return tier.priceYearly / 12;
    }
  };

  const getPeriodTotal = (tier: typeof STORAGE_TIERS[0]) => {
    if (planType === 'ai') {
      switch (billingCycle) {
        case 'monthly': return tier.priceMonthlyAI;
        case 'quarterly': return tier.priceQuarterlyAI;
        case 'semiAnnual': return tier.priceSemiAnnualAI;
        case 'yearly': return tier.priceYearlyAI;
      }
    }
    switch (billingCycle) {
      case 'monthly': return tier.priceMonthly;
      case 'quarterly': return tier.priceQuarterly;
      case 'semiAnnual': return tier.priceSemiAnnual;
      case 'yearly': return tier.priceYearly;
    }
  };

  const getSavingsPercent = (tier: typeof STORAGE_TIERS[0]) => {
    const monthly = getMonthlyBase(tier);
    if (monthly === 0) return 0;
    const monthlyEquiv = getMonthlyEquivalent(tier);
    return Math.round((1 - monthlyEquiv / monthly) * 100);
  };

  const getDiscountBadge = (period: BillingPeriod) => {
    switch (period) {
      case 'monthly': return null;
      case 'quarterly': return '-2.5%';
      case 'semiAnnual': return '-5%';
      case 'yearly': return '2 mes. besplatno';
    }
  };

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
            Back to Home
          </Link>
        </nav>
      </header>

      {/* Main content — pricing immediately */}
      <main className="container mx-auto px-4 py-8">
        {/* Title + Trust Badges (compact) */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">Izaberite plan</h1>
          <p className="mx-auto mt-2 max-w-xl text-gray-600 dark:text-gray-300">
            Fleksibilni planovi za svakoga. Otkazivanje bilo kad.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Shield className="h-3.5 w-3.5" />
              Ne koristimo slike za AI trening
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Server className="h-3.5 w-3.5" />
              EU Serveri
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Lock className="h-3.5 w-3.5" />
              GDPR
            </span>
          </div>
        </div>

        {/* Toggle Section */}
        <div className="mb-8 flex flex-col items-center gap-6">
          {/* Plan Type Toggle (AI / Standard) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Izaberite tip plana</span>
            <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => setPlanType('standard')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  planType === 'standard'
                    ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <Image className="h-4 w-4" />
                Standard
              </button>
              <button
                onClick={() => setPlanType('ai')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  planType === 'ai'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                <Sparkles className="h-4 w-4" />
                AI Powered
                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs text-yellow-900">
                  Popular
                </span>
              </button>
            </div>
          </div>

          {/* Billing Cycle Toggle - 4 options */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Period plaćanja</span>
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
                    {BILLING_PERIODS[period].label}
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

        {/* AI Features Banner (shown when AI is selected) */}
        {planType === 'ai' && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                <span>Smart Search</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span>Auto-tagging</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>Face Recognition</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <span>AI Assistant</span>
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-purple-100">
              AI funkcije dostupne od $2.99/mesečno - ne samo za premium korisnike
            </p>
          </div>
        )}

        {/* Pricing cards - First 5 tiers */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {STORAGE_TIERS.slice(0, 5).map((tier) => {
            const monthlyBase = getMonthlyBase(tier);
            const monthlyEquiv = getMonthlyEquivalent(tier);
            const periodTotal = getPeriodTotal(tier);
            const isPopular = tier.isPopular;
            const savings = getSavingsPercent(tier);
            const isFree = tier.tier === 0;
            const showSavings = billingCycle !== 'monthly' && !isFree;

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
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    NAJPOPULARNIJI
                  </div>
                )}

                <h3 className="text-lg font-semibold">{tier.name}</h3>

                {/* Price display */}
                <div className="mt-1 mb-1">
                  {isFree ? (
                    <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                      Besplatno
                    </p>
                  ) : showSavings ? (
                    <div>
                      <p className={cn('text-base line-through', isPopular ? 'text-primary-200' : 'text-gray-400')}>
                        ${monthlyBase.toFixed(2)}/mes
                      </p>
                      <p className="text-3xl font-bold text-green-500">
                        ${monthlyEquiv.toFixed(2)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          /mes
                        </span>
                      </p>
                      <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        ${periodTotal.toFixed(2)}/{periodConfig.labelShort}
                        {savings > 0 && (
                          <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            -{savings}%
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                      ${monthlyEquiv.toFixed(2)}
                      <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        /mes
                      </span>
                    </p>
                  )}
                </div>

                <p className={cn(
                  'mb-4 mt-2 text-2xl font-medium',
                  isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'
                )}>
                  {tier.storageDisplay}
                </p>

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
                  {planType === 'ai' && tier.aiFeatures && tier.aiFeatures.slice(0, 2).map((feature, i) => (
                    <li key={`ai-${i}`} className="flex items-start gap-2 text-sm">
                      <Sparkles className={cn(
                        'mt-0.5 h-4 w-4 flex-shrink-0',
                        isPopular ? 'text-yellow-300' : 'text-purple-500'
                      )} />
                      <span className={isPopular ? 'text-primary-50' : 'text-purple-600 dark:text-purple-400'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={isFree ? '/register' : `/checkout?tier=${tier.tier}&ai=${planType === 'ai'}&period=${billingCycle}`}
                  className={cn(
                    'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                    isPopular
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {isFree ? 'Započni besplatno' : 'Izaberi plan'}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Additional tiers */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold">Treba vam više prostora?</h2>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STORAGE_TIERS.slice(5).map((tier) => {
              const monthlyBase = getMonthlyBase(tier);
              const monthlyEquiv = getMonthlyEquivalent(tier);
              const periodTotal = getPeriodTotal(tier);
              const savings = getSavingsPercent(tier);
              const showSavings = billingCycle !== 'monthly';

              return (
                <div
                  key={tier.tier}
                  className="flex flex-col justify-between rounded-xl bg-white p-5 shadow-md dark:bg-gray-800"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">{tier.name}</p>
                      {planType === 'ai' && (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tier.storageDisplay}
                    </p>

                    {/* Price with savings */}
                    {showSavings ? (
                      <div className="mt-1">
                        <p className="text-sm text-gray-400 line-through">
                          ${monthlyBase.toFixed(2)}/mes
                        </p>
                        <p className="text-xl font-bold text-green-500">
                          ${monthlyEquiv.toFixed(2)}/mes
                        </p>
                        <p className="text-sm text-gray-500">
                          ${periodTotal.toFixed(2)}/{periodConfig.labelShort}
                          {savings > 0 && (
                            <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              -{savings}%
                            </span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xl font-bold text-primary-600">
                        ${monthlyEquiv.toFixed(2)}/mes
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/checkout?tier=${tier.tier}&ai=${planType === 'ai'}&period=${billingCycle}`}
                    className="mt-4 block rounded-lg bg-gray-100 py-2 text-center font-medium text-gray-900 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    Izaberi
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Why MyPhoto Section */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-3xl font-bold">Zašto MyPhoto?</h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Privacy */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Privatnost na prvom mestu</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  Ne koristimo vaše slike za AI trening
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  Ne skeniramo sadržaj za reklame
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  Ne delimo podatke sa trećim stranama
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                  Zero-knowledge enkripcija dostupna
                </li>
              </ul>
            </div>

            {/* Value */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Storage koji ima smisla</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  Fleksibilni tier-ovi (150GB do 10TB)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  AI funkcije od $2.99/mesečno
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  Original kvalitet, bez kompresije
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  Do 2 meseca besplatno na godišnjem planu
                </li>
              </ul>
            </div>

            {/* Control */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Vaša kontrola. Uvek.</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  Export sve jednim klikom
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  API pristup za developere
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  Bez ugovorne obaveze
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  Otkažite bilo kada
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* AI Features Detail (when AI selected) */}
        {planType === 'ai' && (
          <section className="mt-16 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 p-8 dark:from-purple-900/20 dark:to-pink-900/20">
            <h2 className="mb-6 text-center text-2xl font-bold">AI funkcije uključene u svaki plan</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                <Search className="mb-2 h-8 w-8 text-purple-500" />
                <h4 className="font-semibold">Smart Search</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  &quot;Pokaži slike sa plaže iz leta 2023&quot;
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                <Zap className="mb-2 h-8 w-8 text-purple-500" />
                <h4 className="font-semibold">Auto-tagging</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Automatski taguje ljude, mesta, objekte
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                <Users className="mb-2 h-8 w-8 text-purple-500" />
                <h4 className="font-semibold">Face Recognition</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Grupiše slike po osobama automatski
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-800">
                <Brain className="mb-2 h-8 w-8 text-purple-500" />
                <h4 className="font-semibold">AI Assistant</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  &quot;Napravi album od putovanja u Grčku&quot;
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Često postavljana pitanja</h2>
          <div className="space-y-4">
            <FaqItem
              question="Koja je razlika između Standard i AI plana?"
              answer="Standard plan uključuje sve osnovne funkcije za čuvanje i deljenje slika. AI plan dodaje napredne funkcije kao što su pametna pretraga, automatsko tagovanje, prepoznavanje lica i AI asistent za organizaciju vaših uspomena."
            />
            <FaqItem
              question="Da li se moje slike koriste za trening AI modela?"
              answer="Ne. Nikada ne koristimo vaše slike za trening AI modela. Vaši podaci ostaju vaši i služe isključivo za funkcije koje vi koristite."
            />
            <FaqItem
              question="Koji su periodi plaćanja dostupni?"
              answer="Nudimo 4 perioda plaćanja: mesečno, kvartalno (2.5% popust), polugodišnje (5% popust) i godišnje (2 meseca besplatno, ušteda ~16.7%). Duži period = veći popust."
            />
            <FaqItem
              question="Mogu li kombinovati više planova?"
              answer="Da! Možete kupiti više pretplata i storage će se sabirati. Na primer, Starter (150GB) + Plus (250GB) = 400GB ukupno."
            />
            <FaqItem
              question="Šta se dešava ako prekoračim limit storage-a?"
              answer="Nećete moći da uploadujete nove fajlove dok ne nadogradite plan ili obrišete postojeće fajlove. Vaši postojeći fajlovi ostaju sigurni."
            />
            <FaqItem
              question="Mogu li otkazati pretplatu bilo kada?"
              answer="Da, možete otkazati pretplatu u bilo kom trenutku. Vaš storage ostaje dostupan do kraja plaćenog perioda."
            />
            <FaqItem
              question="Da li podržavate porodične planove?"
              answer="Da! Dodajte do 5 članova porodice za $2/mesečno po članu. Svi dele storage pool dok slike ostaju privatne."
            />
            <FaqItem
              question="Gde se čuvaju moji podaci?"
              answer="Vaši podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt), u skladu sa GDPR regulativom."
            />
            <FaqItem
              question="Mogu li exportovati sve svoje slike?"
              answer="Da! Jednim klikom možete preuzeti sve svoje slike u originalnom kvalitetu. Vaši podaci su uvek vaši."
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-20 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-3xl font-bold">Spremni da započnete?</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            Pridružite se hiljadama korisnika koji čuvaju svoje uspomene privatno i sigurno.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
            >
              Započni besplatno - 10GB
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Kontaktirajte nas
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
            &copy; {new Date().getFullYear()} MyPhoto. Sva prava zadržana.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">Privatnost</Link>
            <Link href="/terms" className="hover:text-primary-500">Uslovi</Link>
            <Link href="/contact" className="hover:text-primary-500">Kontakt</Link>
            <Link href="/support" className="hover:text-primary-500">Podrška</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

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
