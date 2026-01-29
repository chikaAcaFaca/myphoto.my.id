'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cloud, Check, ArrowLeft } from 'lucide-react';
import { STORAGE_TIERS } from '@myphoto/shared';
import { cn } from '@/lib/utils';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Start free, upgrade when you need more space
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              Yearly
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STORAGE_TIERS.slice(0, 5).map((tier, index) => {
            const price = billingCycle === 'monthly' ? tier.priceMonthly : tier.priceYearly / 12;
            const isPopular = tier.tier === 4; // Pro tier

            return (
              <div
                key={tier.tier}
                className={cn(
                  'relative rounded-2xl p-6',
                  isPopular
                    ? 'bg-primary-500 text-white shadow-xl'
                    : 'bg-white shadow-sm dark:bg-gray-800'
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                  {tier.tier === 0 ? (
                    'Free'
                  ) : (
                    <>
                      ${price.toFixed(2)}
                      <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                        /mo
                      </span>
                    </>
                  )}
                </p>
                <p className={cn('mb-6 text-2xl font-medium', isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300')}>
                  {tier.storageDisplay}
                </p>

                <ul className="mb-6 space-y-3">
                  {getFeatures(tier.tier).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={cn('mt-0.5 h-4 w-4 flex-shrink-0', isPopular ? 'text-primary-100' : 'text-primary-500')} />
                      <span className={isPopular ? 'text-primary-50' : 'text-gray-600 dark:text-gray-300'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.tier === 0 ? '/register' : `/register?tier=${tier.tier}`}
                  className={cn(
                    'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                    isPopular
                      ? 'bg-white text-primary-600 hover:bg-primary-50'
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  )}
                >
                  {tier.tier === 0 ? 'Get Started' : 'Choose Plan'}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Additional tiers */}
        <div className="mt-12">
          <h2 className="mb-6 text-center text-2xl font-bold">Need more storage?</h2>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {STORAGE_TIERS.slice(5).map((tier) => {
              const price = billingCycle === 'monthly' ? tier.priceMonthly : tier.priceYearly / 12;

              return (
                <div
                  key={tier.tier}
                  className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                >
                  <div>
                    <p className="font-semibold">{tier.name}</p>
                    <p className="text-sm text-gray-500">{tier.storageDisplay}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${price.toFixed(2)}/mo</p>
                    <Link href={`/register?tier=${tier.tier}`} className="text-sm text-primary-500 hover:underline">
                      Select
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FaqItem
              question="Can I stack multiple plans?"
              answer="Yes! You can purchase multiple subscriptions and the storage will be combined. For example, Starter (100GB) + Standard (500GB) = 600GB total."
            />
            <FaqItem
              question="What happens if I exceed my storage limit?"
              answer="You won't be able to upload new files until you upgrade your plan or delete existing files. Your existing files will remain safe."
            />
            <FaqItem
              question="Can I cancel anytime?"
              answer="Yes, you can cancel your subscription at any time. Your storage will remain available until the end of the billing period."
            />
            <FaqItem
              question="Is there a family plan?"
              answer="Yes! Add up to 5 family members for $2/month each. Everyone shares the storage pool while keeping their photos private."
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function getFeatures(tier: number): string[] {
  const base = ['Web & mobile access', 'Automatic backups', 'AI-powered search'];

  if (tier === 0) {
    return [...base, 'Basic sharing'];
  }
  if (tier <= 2) {
    return [...base, 'Album sharing', 'Priority upload'];
  }
  if (tier <= 4) {
    return [...base, 'Album sharing', 'Priority upload', 'Family sharing', 'Premium support'];
  }
  return [...base, 'Album sharing', 'Priority upload', 'Family sharing', 'Premium support', 'API access'];
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
        <span className="ml-4 text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{answer}</p>
      )}
    </div>
  );
}
