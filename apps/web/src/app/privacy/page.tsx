import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { Cloud, ArrowLeft, Shield, Server, Lock, Check, Scale } from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import { INTL_LOCALE } from '@/i18n/config';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.privacy.meta.title'),
    description: t('pages.privacy.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/privacy' },
    openGraph: {
      title: t('pages.privacy.meta.ogTitle'),
      description: t('pages.privacy.meta.ogDescription'),
      url: 'https://myphotomy.space/privacy',
    },
  };
}

/** Renders `**bold**` as <strong> and `[[email]]` as a mailto link. */
function rich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const email = part.slice(2, -2);
      return (
        <a key={i} href={`mailto:${email}`} className="text-primary-500 hover:underline">
          {email}
        </a>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default async function PrivacyPage() {
  const t = await getT();
  const locale = await getLocale();
  const lastUpdated = new Date().toLocaleDateString(INTL_LOCALE[locale], { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('pages.privacy.home')}
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">{t('pages.privacy.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('pages.privacy.lastUpdated', { date: lastUpdated })}
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Scale className="h-4 w-4" />
            <span>{t('pages.privacy.laws')}</span>
          </div>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Shield className="h-4 w-4" />
              {t('pages.privacy.badges.noAi')}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Server className="h-4 w-4" />
              {t('pages.privacy.badges.euServers')}
            </div>
            <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <Lock className="h-4 w-4" />
              {t('pages.privacy.badges.compliant')}
            </div>
          </div>

          {/* ═══════════════ BLOK 1: OSNOVE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s1.title')}</h2>
            <p>{t('pages.privacy.s1.p1')}</p>
            <p className="mt-2">{t('pages.privacy.s1.p2')}</p>
            <div className="mt-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                {t('pages.privacy.s1.philosophyTitle')}
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                {t('pages.privacy.s1.philosophyText')}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s2.title')}</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.personalData'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.specialCategories'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.controller'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.processor'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.processing'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s2.dpo'))}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s3.title')}</h2>
            <p>{t('pages.privacy.s3.intro')}</p>
            <div className="mt-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p><strong>MyPhoto.com</strong></p>
              <p className="mt-1">{t('pages.privacy.s3.email')} <a href="mailto:legal@myphotomy.space" className="text-primary-500 hover:underline">legal@myphotomy.space</a></p>
              <p>{t('pages.privacy.s3.dpo')} <a href="mailto:dpo@myphotomy.space" className="text-primary-500 hover:underline">dpo@myphotomy.space</a></p>
            </div>
            <p className="mt-3">{t('pages.privacy.s3.outro')}</p>
          </section>

          {/* ═══════════════ BLOK 2: PRIKUPLJANJE PODATAKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s4.title')}</h2>
            <p className="mb-3">{t('pages.privacy.s4.intro')}</p>

            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s4.account.title')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.account.email')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.account.name')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.account.photo')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.account.password')}</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s4.content.title')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.content.files')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.content.exif')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.content.albums')}</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s4.technical.title')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.technical.ip')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.technical.browser')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.technical.usage')}</span>
              </li>
            </ul>

            <p className="mt-4 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s4.payment.title')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s4.payment.processor'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{t('pages.privacy.s4.payment.stored')}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s5.title')}</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s5.direct'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s5.auto'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s5.thirdParty'))}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s6.title')}</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-3 font-semibold text-blue-800 dark:text-blue-400">
                {t('pages.privacy.s6.intro')}
              </p>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s6.contract'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s6.consent'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s6.legitimate'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s6.legal'))}</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">{t('pages.privacy.s6.withdraw')}</p>
          </section>

          {/* ═══════════════ BLOK 3: KORIŠĆENJE I DELJENJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s7.title')}</h2>
            <p className="mb-3">{t('pages.privacy.s7.intro')}</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.service')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.ai')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.thumbnails')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.notifications')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.support')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.security')}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                {t('pages.privacy.s7.legal')}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s8.title')}</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                {t('pages.privacy.s8.boxTitle')}
              </p>
              <p className="mt-2 text-green-700 dark:text-green-300">
                {t('pages.privacy.s8.boxText')}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s8.smartSearch'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s8.face'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s8.noSale'))}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s9.title')}</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">
                {t('pages.privacy.s9.boxTitle')}
              </p>
            </div>
            <p className="mt-3">{t('pages.privacy.s9.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s9.cloud'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s9.payment'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s9.email'))}</span>
              </li>
            </ul>
            <p className="mt-3">{t('pages.privacy.s9.disclosure')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s10.title')}</h2>
            <p>{rich(t('pages.privacy.s10.intro'))}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s10.neverOutside'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s10.scc'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Server className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{t('pages.privacy.s10.adequacy')}</span>
              </li>
            </ul>
            <p className="mt-3">{t('pages.privacy.s10.serbia')}</p>
          </section>

          {/* ═══════════════ BLOK 4: ZAŠTITA I ČUVANJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s11.title')}</h2>
            <p>{t('pages.privacy.s11.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s11.transit'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s11.rest'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s11.access'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s11.passwords'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s11.incident'))}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s12.title')}</h2>
            <p>{t('pages.privacy.s12.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s12.account'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s12.files'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s12.logs'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s12.payment'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s12.ai'))}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s13.title')}</h2>
            <p>{rich(t('pages.privacy.s13.intro'))}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s13.session'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s13.csrf'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s13.prefs'))}</span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s13.notUsed')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                {t('pages.privacy.s13.advertising')}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                {t('pages.privacy.s13.tracking')}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                {t('pages.privacy.s13.social')}
              </li>
            </ul>
            <p className="mt-3">{t('pages.privacy.s13.analytics')}</p>
          </section>

          {/* ═══════════════ BLOK 5: PRAVA KORISNIKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s14.title')}</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-3 font-semibold text-blue-800 dark:text-blue-400">
                {t('pages.privacy.s14.intro')}
              </p>
              <ul className="space-y-2 text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.access'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.rectification'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.erasure'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.portability'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.restriction'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.objection'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.withdraw'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t('pages.privacy.s14.automated'))}</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">{t('pages.privacy.s14.complaint')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s15.title')}</h2>
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="mb-3 font-semibold text-purple-800 dark:text-purple-400">
                {t('pages.privacy.s15.intro')}
              </p>
              <ul className="space-y-2 text-purple-700 dark:text-purple-300">
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span>{rich(t('pages.privacy.s15.zzpl'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span>{rich(t('pages.privacy.s15.commissioner'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span>{rich(t('pages.privacy.s15.court'))}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                  <span>{rich(t('pages.privacy.s15.damages'))}</span>
                </li>
              </ul>
            </div>
            <p className="mt-3">{rich(t('pages.privacy.s15.contact'))}</p>
            <p className="mt-2">{t('pages.privacy.s15.higher')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s16.title')}</h2>
            <p className="font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s16.ccpaTitle')}</p>
            <p className="mt-1">{t('pages.privacy.s16.ccpaIntro')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s16.know'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s16.delete'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s16.optOut'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s16.nonDiscrimination'))}</span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s16.coppaTitle')}</p>
            <p className="mt-1">{rich(t('pages.privacy.s16.coppa'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s17.title')}</h2>
            <p>{t('pages.privacy.s17.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s17.how'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s17.deadline'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s17.verification'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s17.free'))}</span>
              </li>
            </ul>
          </section>

          {/* ═══════════════ BLOK 6: POSEBNE SITUACIJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s18.title')}</h2>
            <p>{rich(t('pages.privacy.s18.intro'))}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>{rich(t('pages.privacy.s18.gdpr'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>{rich(t('pages.privacy.s18.coppa'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                <span>{rich(t('pages.privacy.s18.zzpl'))}</span>
              </li>
            </ul>
            <p className="mt-3">{t('pages.privacy.s18.outro')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s19.title')}</h2>
            <p>{t('pages.privacy.s19.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s19.immediately'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s19.days30'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s19.days90'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s19.exceptions'))}</span>
              </li>
            </ul>
            <p className="mt-3">{rich(t('pages.privacy.s19.before'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s20.title')}</h2>
            <p>{t('pages.privacy.s20.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s20.material'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s20.minor'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span>{rich(t('pages.privacy.s20.date'))}</span>
              </li>
            </ul>
            <p className="mt-3">{t('pages.privacy.s20.outro')}</p>
          </section>

          {/* ═══════════════ BLOK 7: KONTAKT ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.privacy.s21.title')}</h2>
            <p>{t('pages.privacy.s21.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s21.dpo'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s21.privacy'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s21.legal'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{rich(t('pages.privacy.s21.form'))}{' '}
                  <Link href="/contact" className="text-primary-500 hover:underline">
                    myphotomy.space/contact
                  </Link>
                </span>
              </li>
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.privacy.s21.authorities')}</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span>{rich(t('pages.privacy.s21.serbia'))}</span>
              </li>
              <li className="flex items-start gap-2">
                <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span>{rich(t('pages.privacy.s21.eu'))}</span>
              </li>
            </ul>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">{t('pages.privacy.cta.title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            {t('pages.privacy.cta.text')}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            {t('pages.privacy.cta.button')}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto mt-16 border-t border-gray-200 px-4 py-8 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary-500" />
            <span className="font-semibold">MyPhoto</span>
          </div>
          <p className="text-sm text-gray-500">
            {t('pages.privacy.footer.rights', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">{t('pages.privacy.footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-primary-500">{t('pages.privacy.footer.terms')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.privacy.footer.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
