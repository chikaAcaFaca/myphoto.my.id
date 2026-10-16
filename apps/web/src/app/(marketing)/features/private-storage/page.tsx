import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Server,
  Eye,
  Check,
  Cloud,
  Zap,
} from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
    title: t('marketing.privateStorage.meta.title'),
    description: t('marketing.privateStorage.meta.description'),
    alternates: {
      canonical: 'https://myphotomy.space/features/private-storage',
    },
    openGraph: {
      title: t('marketing.privateStorage.meta.title'),
      description: t('marketing.privateStorage.meta.ogDescription'),
      url: 'https://myphotomy.space/features/private-storage',
      siteName: 'MyPhoto',
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: t('marketing.privateStorage.meta.ogAlt'),
        },
      ],
    },
  };
}

const PRIVACY_FEATURES = [
  { icon: Eye, key: 'noAi' },
  { icon: Server, key: 'eu' },
  { icon: Lock, key: 'aes' },
  { icon: Shield, key: 'gdpr' },
  { icon: Cloud, key: 'noThirdParty' },
  { icon: Zap, key: 'transparent' },
] as const;

const FAQS = ['aiTraining', 'location', 'gdpr', 'encryption', 'delete'] as const;

const TRUST_POINTS = ['noAi', 'noScan', 'noShare', 'noProfile', 'eu', 'export'] as const;

const GDPR_POINTS = ['access', 'erasure', 'portability', 'dpa'] as const;

export default async function PrivateStoragePage() {
  const t = await getT();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MyPhoto',
        applicationCategory: 'PhotographyApplication',
        operatingSystem: 'Android, Web',
        description: t('marketing.privateStorage.meta.jsonLdDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        url: 'https://myphotomy.space',
      },
      {
        '@type': 'FAQPage',
        // Mirrors the on-page FAQ (first four questions) in the visitor's language.
        mainEntity: FAQS.slice(0, 4).map((faq) => ({
          '@type': 'Question',
          name: t(`marketing.privateStorage.faqs.${faq}.q`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t(`marketing.privateStorage.faqs.${faq}.a`),
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: t('marketing.shared.breadcrumbHome'),
            item: 'https://myphotomy.space',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: t('marketing.shared.breadcrumbFeatures'),
            item: 'https://myphotomy.space/features',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: t('marketing.privateStorage.meta.breadcrumb'),
            item: 'https://myphotomy.space/features/private-storage',
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {t('marketing.privateStorage.hero.title')}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            {t('marketing.privateStorage.hero.subtitle')}
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {t('marketing.privateStorage.hero.cta')}
          </Link>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.privateStorage.promise.title')}
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          {t('marketing.privateStorage.promise.subtitle')}
        </p>
        <div className="mx-auto max-w-2xl">
          <ul className="grid gap-3 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/10"
              >
                <Check className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {t(`marketing.privateStorage.trust.${point}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketing.privateStorage.protectTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRIVACY_FEATURES.map((f) => (
              <article
                key={f.key}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <f.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`marketing.privateStorage.features.${f.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t(`marketing.privateStorage.features.${f.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GDPR Compliance */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              {t('marketing.privateStorage.gdpr.title')}
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('marketing.privateStorage.gdpr.text')}
            </p>
            <ul className="space-y-3">
              {GDPR_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t(`marketing.privateStorage.gdpr.${point}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-8 text-center dark:from-green-900/20 dark:to-emerald-900/20">
            <Shield className="mx-auto mb-4 h-16 w-16 text-green-600 dark:text-green-400" />
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">
              {t('marketing.privateStorage.gdpr.badgeTitle')}
            </p>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              {t('marketing.privateStorage.gdpr.badgeText')}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.privateStorage.faqTitle')}
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq}
              className="group rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900 dark:text-white">
                {t(`marketing.privateStorage.faqs.${faq}.q`)}
                <span className="ml-4 text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.privateStorage.faqs.${faq}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold">
          {t('marketing.privateStorage.final.title')}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-green-100">
          {t('marketing.privateStorage.final.text')}
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-green-700 hover:bg-green-50"
        >
          {t('marketing.privateStorage.final.cta')}
        </Link>
      </section>
    </>
  );
}
