import type { Metadata } from 'next';
import Link from 'next/link';
import { Cloud, ArrowLeft, Trash2 } from 'lucide-react';
import { DeleteAccountAction } from './delete-account-action';

// Public account-deletion page. Google Play requires a URL, reachable without
// installing the app, that explains how to delete an account and its data.
export const metadata: Metadata = {
  title: 'Delete account / Brisanje naloga',
  description: 'How to permanently delete your MyPhoto account and all associated data.',
  alternates: { canonical: 'https://myphotomy.space/delete-account' },
};

export default function DeleteAccountPage() {
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
            Home
          </Link>
        </nav>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Delete your MyPhoto account</h1>
          <p className="text-gray-500">Brisanje MyPhoto naloga</p>
        </div>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800">
          <p>
            This page applies to the <strong>MyPhoto</strong> app (Android, web and desktop) published by{' '}
            <strong>NASRM Kapetan Bogdan Studio</strong>.
          </p>

          <h2 className="pt-2 text-base font-semibold">How to delete your account</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>In the Android app: <em>Settings → Delete account</em>.</li>
            <li>On the web: <em>Settings → Privacy → Delete account and all data</em>, or use the button below.</li>
            <li>
              If you can no longer sign in, email{' '}
              <a href="mailto:support@myphotomy.space?subject=Account%20deletion" className="text-primary-500 hover:underline">
                support@myphotomy.space
              </a>{' '}
              from the address registered on your account. We complete these requests within 30 days.
            </li>
          </ol>

          <h2 className="pt-2 text-base font-semibold">What is deleted</h2>
          <p>
            Immediately and permanently: all photos, videos and files (originals and thumbnails), albums, MySpace folders,
            memes and comments, share links, device registrations, AI tags and face groups, your profile and your login.
          </p>

          <h2 className="pt-2 text-base font-semibold">What is kept</h2>
          <p>
            Payment and invoice records are held by our payment provider (merchant of record) for the period required by tax
            law. We keep an anonymous log entry (no name, email or content) that a deletion took place. Encrypted backups
            roll over and are fully purged within 30 days.
          </p>

          <div className="pt-4">
            <DeleteAccountAction />
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-base font-semibold">Srpski</h2>
          <p className="mt-2">
            Nalog možete obrisati u aplikaciji (<em>Podešavanja → Obriši nalog</em>), na sajtu (<em>Podešavanja → Privatnost</em>)
            ili dugmetom iznad. Ako ne možete da se prijavite, pišite na support@myphotomy.space sa adrese naloga. Brišu se
            sve fotografije, fajlovi, albumi, memovi, linkovi i sam nalog. Evidencija plaćanja ostaje kod platnog provajdera
            koliko zakon nalaže.
          </p>
        </section>
      </main>
    </div>
  );
}
