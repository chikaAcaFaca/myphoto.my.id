import Link from 'next/link';
import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('marketing.memeWallStart.meta.title'),
    description: t('marketing.memeWallStart.meta.description'),
    alternates: { canonical: '/meme-wall/start' },
    openGraph: {
      title: t('marketing.memeWallStart.meta.ogTitle'),
      description: t('marketing.memeWallStart.meta.ogDescription'),
      url: 'https://myphotomy.space/meme-wall/start',
    },
  };
}

const PLAY_STORE = 'https://play.google.com/store/apps/details?id=id.my.myphoto';

const FEATURES = [
  { icon: '🎨', key: 'create' },
  { icon: '❤️', key: 'likes' },
  { icon: '🔁', key: 'repost' },
] as const;

export default async function MemeWallLandingPage() {
  const t = await getT();
  return (
    <div className="bg-white dark:bg-black">
      {/* Hero — Apple-style: airy, centered, oversized type */}
      <section className="mx-auto max-w-4xl px-6 pt-24 pb-20 text-center sm:pt-32">
        <p className="text-base font-semibold tracking-tight text-orange-500">MemeWall</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-7xl">
          {t('marketing.memeWallStart.hero.line1')}<br />{t('marketing.memeWallStart.hero.line2')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-xl font-medium text-gray-500 dark:text-gray-400 sm:text-2xl">
          {t('marketing.memeWallStart.hero.subtitle')}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <a
            href={PLAY_STORE}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-blue-600 px-8 py-3.5 text-lg font-medium text-white transition hover:bg-blue-700"
          >
            {t('marketing.memeWallStart.hero.getApp')}
          </a>
          <Link
            href="/meme-wall"
            className="text-lg font-medium text-blue-600 transition hover:text-blue-700 dark:text-blue-400"
          >
            {t('marketing.memeWallStart.hero.browse')}
          </Link>
        </div>
        <p className="mt-5 text-sm text-gray-400">{t('marketing.memeWallStart.hero.note')}</p>
      </section>

      {/* Big statement band */}
      <section className="bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
            {t('marketing.memeWallStart.band.line1')}<br />
            <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('marketing.memeWallStart.band.line2')}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl font-medium text-gray-500 dark:text-gray-400">
            {t('marketing.memeWallStart.band.text')}
          </p>
        </div>
      </section>

      {/* Feature trio */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="grid grid-cols-1 gap-12 text-center sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.key}>
              <div className="mb-4 text-5xl">{f.icon}</div>
              <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">{t(`marketing.memeWallStart.features.${f.key}.title`)}</h3>
              <p className="mx-auto mt-2 max-w-xs text-base text-gray-500 dark:text-gray-400">{t(`marketing.memeWallStart.features.${f.key}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA — dramatic dark band */}
      <section className="bg-black">
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            {t('marketing.memeWallStart.closing.title')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-xl font-medium text-gray-400">
            {t('marketing.memeWallStart.closing.text')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
            <a
              href={PLAY_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-8 py-3.5 text-lg font-medium text-black transition hover:bg-gray-200"
            >
              {t('marketing.memeWallStart.closing.getApp')}
            </a>
            <Link
              href="/register"
              className="text-lg font-medium text-blue-400 transition hover:text-blue-300"
            >
              {t('marketing.memeWallStart.closing.register')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
