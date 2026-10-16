import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Share2,
  Lock,
  Shield,
  Check,
  Eye,
  Cloud,
  Smartphone,
  Zap,
} from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
    title: t('marketing.photoSharing.meta.title'),
    description: t('marketing.photoSharing.meta.description'),
    alternates: {
      canonical: 'https://myphotomy.space/features/photo-sharing',
    },
    openGraph: {
      title: t('marketing.photoSharing.meta.title'),
      description: t('marketing.photoSharing.meta.ogDescription'),
      url: 'https://myphotomy.space/features/photo-sharing',
      siteName: 'MyPhoto',
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: t('marketing.photoSharing.meta.ogAlt'),
        },
      ],
    },
  };
}

const SHARING_FEATURES = [
  { icon: Share2, key: 'oneClick' },
  { icon: Lock, key: 'password' },
  { icon: Eye, key: 'expiring' },
  { icon: Shield, key: 'access' },
  { icon: Cloud, key: 'original' },
  { icon: Smartphone, key: 'devices' },
] as const;

const FAMILY_FEATURES = ['members', 'privateSpace', 'album', 'manage', 'price', 'pool'] as const;

const SHARING_STEPS = [
  { step: 1, key: 'select' },
  { step: 2, key: 'access' },
  { step: 3, key: 'share' },
] as const;

export default async function PhotoSharingPage() {
  const t = await getT();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MyPhoto',
        applicationCategory: 'PhotographyApplication',
        operatingSystem: 'Android, Web',
        description: t('marketing.photoSharing.meta.jsonLdDescription'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
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
            name: t('marketing.photoSharing.meta.breadcrumb'),
            item: 'https://myphotomy.space/features/photo-sharing',
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
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <Share2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {t('marketing.photoSharing.hero.title')}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            {t('marketing.photoSharing.hero.subtitle')}
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {t('marketing.photoSharing.hero.cta')}
          </Link>
        </div>
      </section>

      {/* How sharing works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.photoSharing.how.title')}
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          {t('marketing.photoSharing.how.subtitle')}
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {SHARING_STEPS.map((s) => (
            <article
              key={s.step}
              className="rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-gray-800"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl font-bold text-white">
                {s.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t(`marketing.photoSharing.steps.${s.key}.title`)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.photoSharing.steps.${s.key}.description`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Sharing features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketing.photoSharing.featuresTitle')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SHARING_FEATURES.map((f) => (
              <article
                key={f.key}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <f.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {t(`marketing.photoSharing.features.${f.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t(`marketing.photoSharing.features.${f.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Family sharing */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              {t('marketing.photoSharing.family.title')}
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('marketing.photoSharing.family.text')}
            </p>
            <ul className="space-y-3">
              {FAMILY_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3"
                >
                  <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t(`marketing.photoSharing.family.items.${feature}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 p-8 text-center dark:from-blue-900/20 dark:to-sky-900/20">
            <Zap className="mx-auto mb-4 h-16 w-16 text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
              {t('marketing.photoSharing.family.badgeTitle')}
            </p>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
              {t('marketing.photoSharing.family.badgeText')}
            </p>
          </div>
        </div>
      </section>

      {/* Access control */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketing.photoSharing.control.title')}
          </h2>
          <p className="mb-12 text-gray-600 dark:text-gray-300">
            {t('marketing.photoSharing.control.subtitle')}
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Lock className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {t('marketing.photoSharing.control.password.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('marketing.photoSharing.control.password.text')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Eye className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {t('marketing.photoSharing.control.expiry.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('marketing.photoSharing.control.expiry.text')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Shield className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {t('marketing.photoSharing.control.download.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('marketing.photoSharing.control.download.text')}
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Share2 className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                {t('marketing.photoSharing.control.revoke.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('marketing.photoSharing.control.revoke.text')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold">
          {t('marketing.photoSharing.final.title')}
        </h2>
        <p className="mx-auto mb-6 max-w-md text-blue-100">
          {t('marketing.photoSharing.final.text')}
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        >
          {t('marketing.photoSharing.final.cta')}
        </Link>
      </section>
    </>
  );
}
