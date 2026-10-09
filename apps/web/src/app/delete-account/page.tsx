import type { Metadata } from 'next';
import Link from 'next/link';
import { Cloud, ArrowLeft, Trash2 } from 'lucide-react';
import { getT } from '@/i18n/server';
import { DeleteAccountAction } from './delete-account-action';

// Public account-deletion page. Google Play requires a URL, reachable without
// installing the app, that explains how to delete an account and its data.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.deleteAccount.meta.title'),
    description: t('pages.deleteAccount.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/delete-account' },
  };
}

export default async function DeleteAccountPage() {
  const t = await getT();
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">{t('pages.deleteAccount.title')}</h1>
        </div>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800">
          <p>
            {t('pages.deleteAccount.appliesBefore')}<strong>MyPhoto</strong>{t('pages.deleteAccount.appliesMiddle')}{' '}
            <strong>NKNET CONSULTING DOO</strong>.
          </p>

          <h2 className="pt-2 text-base font-semibold">{t('pages.deleteAccount.howTitle')}</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>{t('pages.deleteAccount.howApp')} <em>{t('pages.deleteAccount.howAppPath')}</em>.</li>
            <li>{t('pages.deleteAccount.howWeb')} <em>{t('pages.deleteAccount.howWebPath')}</em>{t('pages.deleteAccount.howWebAfter')}</li>
            <li>
              {t('pages.deleteAccount.howEmail')}{' '}
              <a href="mailto:support@myphotomy.space?subject=Account%20deletion" className="text-primary-500 hover:underline">
                support@myphotomy.space
              </a>{' '}
              {t('pages.deleteAccount.howEmailAfter')}
            </li>
          </ol>

          <h2 className="pt-2 text-base font-semibold">{t('pages.deleteAccount.deletedTitle')}</h2>
          <p>{t('pages.deleteAccount.deletedText')}</p>

          <h2 className="pt-2 text-base font-semibold">{t('pages.deleteAccount.keptTitle')}</h2>
          <p>{t('pages.deleteAccount.keptText')}</p>

          <div className="pt-4">
            <DeleteAccountAction />
          </div>
        </section>
      </main>
    </div>
  );
}
