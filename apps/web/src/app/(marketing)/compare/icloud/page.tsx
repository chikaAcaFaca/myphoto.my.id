import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Cloud,
  Lock,
  Server,
  Check,
  Smartphone,
  Zap,
} from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import type { marketing } from '@/i18n/messages/en/marketing';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
    title: t('marketing.compareIcloud.meta.title'),
    description: t('marketing.compareIcloud.meta.description'),
    alternates: {
      canonical: 'https://myphotomy.space/compare/icloud',
    },
    openGraph: {
      title: t('marketing.compareIcloud.meta.title'),
      description: t('marketing.compareIcloud.meta.ogDescription'),
      url: 'https://myphotomy.space/compare/icloud',
      siteName: 'MyPhoto',
      type: 'website',
      locale: locale === 'sr' ? 'sr_RS' : 'en_US',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: t('marketing.compareIcloud.meta.ogAlt'),
        },
      ],
    },
  };
}

const FAQS = ['bothPlatforms', 'cheaper', 'transfer', 'windowsLinux', 'switchPhone'] as const;

const COMPARISON_ROWS: {
  key: keyof typeof marketing.compareIcloud.rows;
  winner: 'myphoto' | 'icloud' | 'tie';
}[] = [
  { key: 'crossPlatform', winner: 'myphoto' },
  { key: 'pricePerGb', winner: 'myphoto' },
  { key: 'starter', winner: 'tie' },
  { key: 'servers', winner: 'myphoto' },
  { key: 'gdpr', winner: 'myphoto' },
  { key: 'aiTraining', winner: 'tie' },
  { key: 'quality', winner: 'tie' },
  { key: 'lockIn', winner: 'myphoto' },
  { key: 'family', winner: 'tie' },
  { key: 'windowsLinux', winner: 'myphoto' },
];

const ADVANTAGES = [
  { icon: Smartphone, key: 'devices' },
  { icon: Lock, key: 'lockIn' },
  { icon: Server, key: 'eu' },
  { icon: Zap, key: 'price' },
] as const;

const FREEDOM_POINTS = ['android', 'web', 'export', 'noContract'] as const;

export default async function CompareICloudPage() {
  const t = await getT();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((faq) => ({
          '@type': 'Question',
          name: t(`marketing.compareIcloud.faqs.${faq}.q`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t(`marketing.compareIcloud.faqs.${faq}.a`),
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
            name: t('marketing.shared.breadcrumbCompare'),
            item: 'https://myphotomy.space/compare',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: t('marketing.compareIcloud.meta.breadcrumb'),
            item: 'https://myphotomy.space/compare/icloud',
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
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {t('marketing.compareIcloud.hero.title')}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            {t('marketing.compareIcloud.hero.subtitle')}
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {t('marketing.shared.switchToday')}
          </Link>
        </div>
      </section>

      {/* Advantages */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
          {t('marketing.compareIcloud.whyTitle')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {ADVANTAGES.map((a) => (
            <article
              key={a.key}
              className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <a.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {t(`marketing.compareIcloud.advantages.${a.key}.title`)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.compareIcloud.advantages.${a.key}.description`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            {t('marketing.shared.detailedComparison')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {t('marketing.shared.feature')}
                  </th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-center dark:border-gray-700">
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      MyPhoto
                    </span>
                  </th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    iCloud
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t(`marketing.compareIcloud.rows.${row.key}.feature`)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          row.winner === 'myphoto'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {row.winner === 'myphoto' && (
                          <Check className="h-4 w-4" />
                        )}
                        {t(`marketing.compareIcloud.rows.${row.key}.myphoto`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm ${
                          row.winner === 'icloud'
                            ? 'font-medium text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {t(`marketing.compareIcloud.rows.${row.key}.icloud`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cross-platform highlight */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">
                {t('marketing.compareIcloud.freedom.title')}
              </h2>
              <p className="mb-6 text-primary-100">
                {t('marketing.compareIcloud.freedom.text')}
              </p>
              <ul className="space-y-2">
                {FREEDOM_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary-200" />
                    {t(`marketing.compareIcloud.freedom.${point}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <Cloud className="mx-auto mb-4 h-20 w-20 text-white/80" />
              <p className="text-xl font-bold">{t('marketing.compareIcloud.freedom.line1')}</p>
              <p className="text-xl font-bold">{t('marketing.compareIcloud.freedom.line2')}</p>
              <p className="text-xl font-bold">{t('marketing.compareIcloud.freedom.line3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
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
                {t(`marketing.compareIcloud.faqs.${faq}.q`)}
                <span className="ml-4 text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {t(`marketing.compareIcloud.faqs.${faq}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">{t('marketing.compareIcloud.final.title')}</h2>
        <p className="mx-auto mb-6 max-w-md text-primary-100">
          {t('marketing.compareIcloud.final.text')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-primary-50"
          >
            {t('marketing.shared.startFree')}
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            {t('marketing.shared.seePlans')}
          </Link>
        </div>
      </section>
    </>
  );
}
