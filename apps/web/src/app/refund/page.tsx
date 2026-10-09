import type { Metadata } from 'next';
import Link from 'next/link';
import { Cloud, ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import { INTL_LOCALE } from '@/i18n/config';

// Public refund policy. Required by the payment provider (Creem) review and
// linked from every footer next to Privacy/Terms.

/** Render `**bold**` spans from a translated string as <strong>. */
function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.refund.meta.title'),
    description: t('pages.refund.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/refund' },
    openGraph: {
      title: `${t('pages.refund.meta.title')} | MyPhoto`,
      description: t('pages.refund.meta.description'),
      url: 'https://myphotomy.space/refund',
    },
  };
}

export default async function RefundPage() {
  const t = await getT();
  const locale = await getLocale();
  const lastUpdated = new Date('2026-10-09').toLocaleDateString(INTL_LOCALE[locale], { year: 'numeric', month: 'long', day: 'numeric' });

  const list = (section: 'guarantee' | 'how' | 'cancel', keys: readonly string[]) => (
    <ul className="mt-3 space-y-2">
      {keys.map((k) => (
        <li key={k} className="flex items-start gap-2">
          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
          <span>{rich(t(`pages.refund.${section}.${k}` as never))}</span>
        </li>
      ))}
    </ul>
  );
  const h2 = 'mb-3 text-2xl font-bold text-gray-900 dark:text-white';

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('pages.shell.home')}
          </Link>
        </nav>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <RotateCcw className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">{t('pages.refund.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t('pages.refund.lastUpdated', { date: lastUpdated })}</p>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <p>{t('pages.refund.intro')}</p>

          <section>
            <h2 className={h2}>{t('pages.refund.mor.title')}</h2>
            <p>{rich(t('pages.refund.mor.text'))}</p>
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.guarantee.title')}</h2>
            {list('guarantee', ['i1', 'i2', 'i3', 'i4'])}
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.how.title')}</h2>
            {list('how', ['i1', 'i2'])}
            <p className="mt-3">{rich(t('pages.refund.how.outro'))}</p>
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.cancel.title')}</h2>
            {list('cancel', ['i1', 'i2', 'i3'])}
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.after.title')}</h2>
            <p>{rich(t('pages.refund.after.text'))}</p>
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.abuse.title')}</h2>
            <p>{t('pages.refund.abuse.text')}</p>
          </section>

          <section>
            <h2 className={h2}>{t('pages.refund.contact.title')}</h2>
            <p>
              {t('pages.refund.contact.text')}{' '}
              <a href="mailto:support@myphotomy.space?subject=Refund%20request" className="text-primary-500 hover:underline">
                support@myphotomy.space
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 dark:border-gray-700">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary-500" />
            <span className="font-semibold">MyPhoto</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">{t('pages.shell.privacy')}</Link>
            <Link href="/terms" className="hover:text-primary-500">{t('pages.shell.terms')}</Link>
            <Link href="/refund" className="hover:text-primary-500">{t('pages.shell.refund')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.shell.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
