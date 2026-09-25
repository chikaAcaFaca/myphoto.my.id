import { Metadata } from 'next';
import Link from 'next/link';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('marketing.download.meta.title'),
    description: t('marketing.download.meta.description'),
  };
}

// Microsoft Store listing URL — set this once the app is published to the
// Store, then the Store button appears (Store installs skip SmartScreen).
const STORE_URL = '';

export default async function DownloadPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">{t('marketing.download.title')}</h1>
        <p className="mt-4 text-lg text-gray-600">
          {t('marketing.download.subtitle')}
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {/* Windows */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🖥️
          </div>
          <h2 className="text-xl font-bold">Windows</h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('marketing.download.windows.description')}
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>{t('marketing.download.windows.f1')}</li>
            <li>{t('marketing.download.windows.f2')}</li>
            <li>{t('marketing.download.windows.f3')}</li>
            <li>{t('marketing.download.windows.f4')}</li>
          </ul>
          <a
            href="/api/download/desktop"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t('marketing.download.windows.button')}
          </a>
          {/* Microsoft Store button — only rendered once the app is published
              (set STORE_URL). Store installs skip the SmartScreen warning. */}
          {STORE_URL ? (
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 px-6 py-3 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
               Microsoft Store
            </a>
          ) : (
            <p className="mt-3 text-xs text-gray-400"> {t('marketing.download.windows.storeSoon')}</p>
          )}
          <p className="mt-2 text-xs text-gray-400">{t('marketing.download.windows.requirements')}</p>
          <p className="mt-1 text-xs text-gray-400">
            {t('marketing.download.windows.smartscreen')}
          </p>
        </div>

        {/* Android */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
            📱
          </div>
          <h2 className="text-xl font-bold">Android</h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('marketing.download.android.description')}
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>{t('marketing.download.android.f1')}</li>
            <li>{t('marketing.download.android.f2')}</li>
            <li>{t('marketing.download.android.f3')}</li>
            <li>{t('marketing.download.android.f4')}</li>
          </ul>
          <a
            href="/api/download/android"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
          >
            {t('marketing.download.android.button')}
          </a>
          <p className="mt-2 text-xs text-gray-400">
            {t('marketing.download.android.requirements')}{' '}
            <span className="text-green-600">{t('marketing.download.android.playSoon')}</span>
          </p>

          {/* Install instructions — APK is sideloaded, not from Play Store */}
          <details className="mt-4 text-left text-xs text-gray-600">
            <summary className="cursor-pointer text-green-700 hover:underline">
              {t('marketing.download.android.howTo')}
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t('marketing.download.android.step1Before')}<strong>{t('marketing.download.android.step1Strong')}</strong>{t('marketing.download.android.step1After')}</li>
              <li>{t('marketing.download.android.step2Before')}<em>{t('marketing.download.android.step2Em')}</em>{t('marketing.download.android.step2After')}</li>
              <li>{t('marketing.download.android.step3Before')}<strong>{t('marketing.download.android.step3Strong')}</strong>
                {t('marketing.download.android.step3After')}</li>
              <li>{t('marketing.download.android.step4Before')}<strong>{t('marketing.download.android.step4Strong')}</strong>{t('marketing.download.android.step4After')}</li>
              <li>{t('marketing.download.android.step5')}</li>
            </ol>
            <p className="mt-2 text-gray-500">
              {t('marketing.download.android.note')}
            </p>
          </details>
        </div>

        {/* Web / PWA */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-3xl">
            🌐
          </div>
          <h2 className="text-xl font-bold">{t('marketing.download.web.title')}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('marketing.download.web.description')}
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>{t('marketing.download.web.f1')}</li>
            <li>{t('marketing.download.web.f2')}</li>
            <li>{t('marketing.download.web.f3')}</li>
            <li>{t('marketing.download.web.f4')}</li>
          </ul>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
          >
            {t('marketing.download.web.button')}
          </Link>
          <p className="mt-2 text-xs text-gray-400">{t('marketing.download.web.note')}</p>
        </div>
      </div>

      {/* How sync works */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold">{t('marketing.download.how.title')}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">1</div>
            <h3 className="font-semibold">{t('marketing.download.how.s1Title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('marketing.download.how.s1Text')}</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">2</div>
            <h3 className="font-semibold">{t('marketing.download.how.s2Title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('marketing.download.how.s2Text')}</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">3</div>
            <h3 className="font-semibold">{t('marketing.download.how.s3Title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('marketing.download.how.s3Text')}</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">4</div>
            <h3 className="font-semibold">{t('marketing.download.how.s4Title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('marketing.download.how.s4Text')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
