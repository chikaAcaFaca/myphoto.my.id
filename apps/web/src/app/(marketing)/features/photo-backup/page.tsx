import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Upload,
  Cloud,
  Shield,
  Smartphone,
  Zap,
  Lock,
  Server,
} from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
    title: t('marketing.photoBackup.meta.title'),
    description: t('marketing.photoBackup.meta.description'),
    alternates: {
      canonical: 'https://myphotomy.space/features/photo-backup',
    },
    openGraph: {
      title: t('marketing.photoBackup.meta.title'),
      description: t('marketing.photoBackup.meta.ogDescription'),
      url: 'https://myphotomy.space/features/photo-backup',
      siteName: 'MyPhoto',
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: t('marketing.photoBackup.meta.ogAlt'),
        },
      ],
    },
  };
}

const STEPS = [
  { icon: Smartphone, key: 'install' },
  { icon: Upload, key: 'enable' },
  { icon: Cloud, key: 'enjoy' },
] as const;

const FEATURES = [
  { icon: Zap, key: 'background' },
  { icon: Shield, key: 'original' },
  { icon: Lock, key: 'encryption' },
  { icon: Server, key: 'eu' },
  { icon: Smartphone, key: 'devices' },
  { icon: Cloud, key: 'anywhere' },
] as const;

const FAQS = ['battery', 'compression', 'lostPhone', 'freeSpace'] as const;

export default async function PhotoBackupPage() {
  const t = await getT();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MyPhoto',
        applicationCategory: 'PhotographyApplication',
        operatingSystem: 'Android, Web',
        description: t('marketing.photoBackup.meta.jsonLdDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        url: 'https://myphotomy.space',
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
            name: t('marketing.photoBackup.meta.breadcrumb'),
            item: 'https://myphotomy.space/features/photo-backup',
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
      <section className="bg-gradient-to-b from-primary-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {t('marketing.photoBackup.hero.title')}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            {t('marketing.photoBackup.hero.subtitle')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
            >
              {t('marketing.photoBackup.hero.cta')}
            </Link>
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Smartphone className="h-5 w-5" />
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.photoBackup.how.title')}
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          {t('marketing.photoBackup.how.subtitle')}
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <article
              key={step.key}
              className="relative rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-gray-800"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                {i + 1}
              </div>
              <step.icon className="mx-auto mb-3 h-8 w-8 text-primary-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t(`marketing.photoBackup.steps.${step.key}.title`)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.photoBackup.steps.${step.key}.description`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketing.photoBackup.whyTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.key}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <f.icon className="mb-3 h-8 w-8 text-primary-500" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`marketing.photoBackup.features.${f.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t(`marketing.photoBackup.features.${f.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Android App CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white md:p-12">
          <Smartphone className="mx-auto mb-4 h-12 w-12" />
          <h2 className="mb-2 text-3xl font-bold">
            {t('marketing.photoBackup.android.title')}
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-primary-100">
            {t('marketing.photoBackup.android.text')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-primary-50"
            >
              {t('marketing.photoBackup.android.play')}
            </a>
            <Link
              href="/register"
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              {t('marketing.photoBackup.android.web')}
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.shared.faqTitle')}
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq}
              className="group rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900 dark:text-white">
                {t(`marketing.photoBackup.faqs.${faq}.q`)}
                <span className="ml-4 text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.photoBackup.faqs.${faq}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/50">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          {t('marketing.photoBackup.final.title')}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-gray-600 dark:text-gray-300">
          {t('marketing.shared.freeNoCard')}
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
        >
          {t('marketing.photoBackup.final.cta')}
        </Link>
      </section>
    </>
  );
}
