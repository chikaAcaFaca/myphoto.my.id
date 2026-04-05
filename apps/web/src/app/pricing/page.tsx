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
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import type { BillingPeriod } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores';
import { usePlanRecommendation } from '@/lib/hooks';

const BILLING_OPTIONS: BillingPeriod[] = ['monthly', 'yearly'];

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

  const periodConfig = BILLING_PERIODS[billingCycle];

  const getMonthlyBase = (tier: typeof STORAGE_TIERS[0]) => {
    return tier.priceMonthly;
  };

  const getMonthlyEquivalent = (tier: typeof STORAGE_TIERS[0]) => {
    switch (billingCycle) {
      case 'monthly': return tier.priceMonthly;
      case 'yearly': return tier.priceYearly / 12;
    }
  };

  const getPeriodTotal = (tier: typeof STORAGE_TIERS[0]) => {
    switch (billingCycle) {
      case 'monthly': return tier.priceMonthly;
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

        {/* Billing Cycle Toggle */}
        <div className="mb-8 flex flex-col items-center gap-6">
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

        {/* Smart recommendation banner */}
        {user && recommendation && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
              <TrendingUp className="h-5 w-5 shrink-0 text-blue-500" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Na osnovu vašeg korišćenja (~{recommendation.monthlyUploadFormatted}/mesečno), preporučujemo{' '}
                <strong>{recommendation.recommendedTier.name}</strong> plan.
                {recommendation.daysUntilFull > 0 && recommendation.daysUntilFull < 365 && (
                  <> Trenutni prostor će vam se napuniti za ~{recommendation.daysUntilFull} dana.</>
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
                {isRecommended && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
                    PREPORUČENO ZA VAS
                  </div>
                )}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    {isRecommended ? 'NAJPOPULARNIJI · PREPORUČENO' : 'NAJPOPULARNIJI'}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                </div>

                {/* Price display */}
                <div className="mt-1 mb-1">
                  {isFree ? (
                    <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                      Besplatno
                    </p>
                  ) : showSavings ? (
                    <div>
                      <p className={cn('text-base line-through', isPopular ? 'text-primary-200' : 'text-gray-400')}>
                        €{monthlyBase.toFixed(2)}/mes
                      </p>
                      <p className="text-3xl font-bold text-green-500">
                        €{monthlyEquiv.toFixed(2)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          /mes
                        </span>
                      </p>
                      <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        €{periodTotal.toFixed(2)}/{periodConfig.labelShort}
                        {savings > 0 && (
                          <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                            -{savings}%
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                      €{monthlyEquiv.toFixed(2)}
                      <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        /mes
                      </span>
                    </p>
                  )}
                </div>

                <p className={cn(
                  'mb-1 mt-2 text-2xl font-medium',
                  isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'
                )}>
                  {tier.storageDisplay}
                </p>
                <p className={cn(
                  'mb-2 flex items-center gap-1 text-xs font-medium',
                  isPopular ? 'text-primary-200' : 'text-purple-600 dark:text-purple-400'
                )}>
                  <Sparkles className="h-3 w-3" />
                  {tier.memesPerDay} memova/dan · {tier.memesPerMonth}/mes
                </p>

                {!isFree && monthlyEquiv <= 3.50 && (
                  <p className={cn(
                    'mb-3 flex items-center gap-1.5 text-xs font-medium',
                    isPopular ? 'text-yellow-300' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    <Coffee className="h-3.5 w-3.5" />
                    Manje od cene jedne kafe mesečno
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
                  href={isFree ? registerUrl : `/checkout?tier=${tier.tier}&period=${billingCycle}${refParam}`}
                  className={cn(
                    'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                    isPopular
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {isFree ? 'Započni besplatno' : 'Izaberi plan'}
                </Link>
                {isFree && (
                  <p className="mt-3 text-center text-xs text-green-600 dark:text-green-400">
                    Pozovite prijatelje za do 15 GB besplatno!
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional tiers */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold">Treba vam više prostora?</h2>
          <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STORAGE_TIERS.slice(6).map((tier) => {
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
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tier.storageDisplay}
                    </p>
                    <p className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                      <Sparkles className="h-3 w-3" />
                      {tier.memesPerDay} memova/dan · {tier.memesPerMonth}/mes
                    </p>

                    {/* Price with savings */}
                    {showSavings ? (
                      <div className="mt-1">
                        <p className="text-sm text-gray-400 line-through">
                          €{monthlyBase.toFixed(2)}/mes
                        </p>
                        <p className="text-xl font-bold text-green-500">
                          €{monthlyEquiv.toFixed(2)}/mes
                        </p>
                        <p className="text-sm text-gray-500">
                          €{periodTotal.toFixed(2)}/{periodConfig.labelShort}
                          {savings > 0 && (
                            <span className="ml-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              -{savings}%
                            </span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-1 text-xl font-bold text-primary-600">
                        €{monthlyEquiv.toFixed(2)}/mes
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/checkout?tier=${tier.tier}&period=${billingCycle}`}
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
                  AI radi na vašem uređaju — besplatno
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

        {/* FAQ */}
        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Često postavljana pitanja</h2>
          <div className="space-y-4">
            <FaqItem
              question="Da li su AI funkcije uključene u sve planove?"
              answer="Da! AI funkcije poput pametne pretrage, automatskog tagovanja i prepoznavanja lica rade direktno na vašem uređaju i uključene su u sve planove bez dodatne naplate."
            />
            <FaqItem
              question="Da li se moje slike koriste za trening AI modela?"
              answer="Ne. Nikada ne koristimo vaše slike za trening AI modela. Vaši podaci ostaju vaši i služe isključivo za funkcije koje vi koristite."
            />
            <FaqItem
              question="Koji su periodi plaćanja dostupni?"
              answer="Nudimo 2 perioda plaćanja: mesečno i godišnje (2 meseca besplatno, ušteda ~16.7%). Godišnji plan vam daje najbolju vrednost."
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
              answer="Da! Dodajte do 5 članova porodice za €2/mesečno po članu. Svi dele storage pool dok slike ostaju privatne."
            />
            <FaqItem
              question="Gde se čuvaju moji podaci?"
              answer="Vaši podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt), u skladu sa GDPR regulativom."
            />
            <FaqItem
              question="Šta je AI Meme Generator?"
              answer="AI Meme Generator koristi veštačku inteligenciju da generiše smešne komentare za vaše fotografije. Broj memova koje možete kreirati zavisi od vašeg plana — od 2 dnevno (Free) do 40 dnevno (Ultra). AI automatski analizira sadržaj pre objave radi zaštite zajednice."
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
              href={registerUrl}
              className="rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
            >
              Započni besplatno
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
