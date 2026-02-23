'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Cloud,
  ArrowLeft,
  Shield,
  Lock,
  Server,
  Check,
  Sparkles,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { initializePaddle, CheckoutEventNames } from '@paddle/paddle-js';
import type { Paddle, PaddleEventData } from '@paddle/paddle-js';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import type { StorageTier, BillingPeriod } from '@myphoto/shared';
import { useAuthStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

function getPaddlePriceId(tier: StorageTier, isAI: boolean, period: BillingPeriod): string {
  if (isAI) {
    switch (period) {
      case 'monthly': return tier.paddleProductIdAI;
      case 'quarterly': return tier.paddleQuarterlyIdAI;
      case 'semiAnnual': return tier.paddleSemiAnnualIdAI;
      case 'yearly': return tier.paddleYearlyIdAI;
    }
  }
  switch (period) {
    case 'monthly': return tier.paddleProductId;
    case 'quarterly': return tier.paddleQuarterlyId;
    case 'semiAnnual': return tier.paddleSemiAnnualId;
    case 'yearly': return tier.paddleYearlyId;
  }
}

function getPeriodTotal(tier: StorageTier, isAI: boolean, period: BillingPeriod): number {
  if (isAI) {
    switch (period) {
      case 'monthly': return tier.priceMonthlyAI;
      case 'quarterly': return tier.priceQuarterlyAI;
      case 'semiAnnual': return tier.priceSemiAnnualAI;
      case 'yearly': return tier.priceYearlyAI;
    }
  }
  switch (period) {
    case 'monthly': return tier.priceMonthly;
    case 'quarterly': return tier.priceQuarterly;
    case 'semiAnnual': return tier.priceSemiAnnual;
    case 'yearly': return tier.priceYearly;
  }
}

function getMonthlyEquivalent(tier: StorageTier, isAI: boolean, period: BillingPeriod): number {
  const total = getPeriodTotal(tier, isAI, period);
  const months = BILLING_PERIODS[period].months;
  return total / months;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, firebaseUser, isLoading: authLoading, isInitialized } = useAuthStore();

  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);

  // Parse URL params
  const tierNum = parseInt(searchParams.get('tier') || '1', 10);
  const isAI = searchParams.get('ai') === 'true';
  const period = (searchParams.get('period') || 'monthly') as BillingPeriod;

  // Find the tier
  const tier = STORAGE_TIERS.find(t => t.tier === tierNum) || STORAGE_TIERS[1];
  const periodConfig = BILLING_PERIODS[period];

  // Redirect free tier to register
  useEffect(() => {
    if (tier.tier === 0) {
      router.replace('/register');
    }
  }, [tier.tier, router]);

  // Initialize Paddle
  const handleCheckoutEvent = useCallback((event: PaddleEventData) => {
    if (event.name === CheckoutEventNames.CHECKOUT_COMPLETED) {
      router.push('/photos?subscribed=true');
    }
    if (event.name === CheckoutEventNames.CHECKOUT_CLOSED) {
      setIsOpeningCheckout(false);
    }
  }, [router]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;

    initializePaddle({
      token,
      environment: 'sandbox',
      eventCallback: handleCheckoutEvent,
    }).then((paddleInstance) => {
      if (paddleInstance) {
        setPaddle(paddleInstance);
      }
    });
  }, [handleCheckoutEvent]);

  const handleOpenCheckout = () => {
    if (!paddle || !firebaseUser || !user) return;

    const priceId = getPaddlePriceId(tier, isAI, period);
    if (!priceId) return;

    setIsOpeningCheckout(true);

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { user_id: firebaseUser.uid },
      customer: { email: user.email },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'en',
        successUrl: `${window.location.origin}/photos?subscribed=true`,
      },
    });
  };

  const priceTotal = getPeriodTotal(tier, isAI, period);
  const priceMonthly = getMonthlyEquivalent(tier, isAI, period);
  const features = [...tier.features];
  if (isAI && tier.aiFeatures) {
    features.push(...tier.aiFeatures);
  }

  const isLoggedIn = isInitialized && !!user && !!firebaseUser;
  const showAuthLoading = !isInitialized || authLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/pricing" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad na planove
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-center text-3xl font-bold md:text-4xl">Završite narudžbu</h1>

        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
          {/* Left: Order Summary */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold">Pregled narudžbe</h2>

            {/* Plan name + badge */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl font-bold">{tier.name}</span>
              {isAI && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" />
                  AI Powered
                </span>
              )}
            </div>

            {/* Storage */}
            <p className="mb-4 text-lg text-gray-600 dark:text-gray-300">
              {tier.storageDisplay} storage
            </p>

            {/* Billing period */}
            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Period plaćanja</span>
                <span className="font-semibold">{periodConfig.label}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Ukupno za period</span>
                <span className="text-2xl font-bold text-primary-600">${priceTotal.toFixed(2)}</span>
              </div>
              {period !== 'monthly' && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Mesečno ekvivalent</span>
                  <span className="text-sm text-gray-500">${priceMonthly.toFixed(2)}/mes</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">Uključeno</h3>
              <ul className="space-y-2">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {isAI && tier.aiFeatures && i >= tier.features.length ? (
                      <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                    )}
                    <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Your photos, your data */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-800 dark:text-green-300">Vaše slike su vaše</p>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                    Ne koristimo vaše slike za AI trening. Vaši podaci ostaju privatni i pod vašom kontrolom.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment / Auth */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold">Plaćanje</h2>

              {showAuthLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : isLoggedIn ? (
                /* Logged in — show checkout button */
                <div>
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                    Ulogovani ste kao <span className="font-semibold">{user.email}</span>
                  </p>
                  <button
                    onClick={handleOpenCheckout}
                    disabled={!paddle || isOpeningCheckout}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-semibold text-white transition-colors',
                      paddle && !isOpeningCheckout
                        ? 'bg-primary-500 hover:bg-primary-600'
                        : 'cursor-not-allowed bg-gray-400'
                    )}
                  >
                    {isOpeningCheckout ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Otvaranje plaćanja...
                      </>
                    ) : !paddle ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Učitavanje...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Nastavi na plaćanje — ${priceTotal.toFixed(2)}
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-500">
                    Bićete preusmereni na sigurnu Paddle stranicu za plaćanje
                  </p>
                </div>
              ) : (
                /* Not logged in — show login/register prompt */
                <div>
                  <p className="mb-4 text-gray-600 dark:text-gray-300">
                    Morate se ulogovati ili registrovati pre nego što nastavite sa plaćanjem.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link
                      href={`/login?redirect=/checkout?tier=${tierNum}&ai=${isAI}&period=${period}`}
                      className="block w-full rounded-lg bg-primary-500 py-3 text-center font-semibold text-white transition-colors hover:bg-primary-600"
                    >
                      Prijavite se
                    </Link>
                    <Link
                      href={`/register?tier=${tierNum}&ai=${isAI}&period=${period}`}
                      className="block w-full rounded-lg border-2 border-primary-500 py-3 text-center font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      Registrujte se
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Trust badges */}
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Sigurnost i garancije</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">EU Serveri</p>
                    <p className="text-sm text-gray-500">Frankfurt, Nemačka</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">GDPR usklađeno</p>
                    <p className="text-sm text-gray-500">Potpuna zaštita podataka</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Sigurno plaćanje</p>
                    <p className="text-sm text-gray-500">Paddle — PCI DSS Level 1</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantees */}
            <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  14 dana garancija povrata novca
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Otkažite bilo kada bez obaveze
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Export svih podataka jednim klikom
                </li>
              </ul>
            </div>
          </div>
        </div>
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
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
