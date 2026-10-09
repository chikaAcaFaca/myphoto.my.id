import type { Metadata } from 'next';
import Link from 'next/link';
import { Cloud, ArrowLeft, FileText, Check, Scale } from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import { INTL_LOCALE } from '@/i18n/config';

/** Render `**bold**` spans from a translated string as <strong>. */
function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.terms.meta.title'),
    description: t('pages.terms.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/terms' },
    openGraph: {
      title: t('pages.terms.meta.ogTitle'),
      description: t('pages.terms.meta.ogDescription'),
      url: 'https://myphotomy.space/terms',
    },
  };
}

export default async function TermsPage() {
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
            {t('pages.terms.home')}
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">{t('pages.terms.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('pages.terms.lastUpdated', { date: lastUpdated })}
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Scale className="h-4 w-4" />
            <span>{t('pages.terms.lawBadge')}</span>
          </div>
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">

          {/* ═══════════════ BLOK 1: OSNOVE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s1.title')}</h2>
            <p>{t('pages.terms.s1.p1')}</p>
            <p className="mt-2">{t('pages.terms.s1.p2')}</p>
            <p className="mt-2">{rich(t('pages.terms.s1.p3'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s2.title')}</h2>
            <ul className="space-y-2">
              {(['i1', 'i2', 'i3', 'i4', 'i5', 'i6'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t(`pages.terms.s2.${k}`))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s3.title')}</h2>
            <p>{t('pages.terms.s3.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3', 'i4', 'i5'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t(`pages.terms.s3.${k}`)}
                </li>
              ))}
            </ul>
          </section>

          {/* ═══════════════ BLOK 2: NALOG I KORIŠĆENJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s4.title')}</h2>
            <p>{t('pages.terms.s4.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3', 'i4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t(`pages.terms.s4.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s4.outro')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s5.title')}</h2>
            <p className="mb-3">{t('pages.terms.s5.intro')}</p>
            <ul className="space-y-2">
              {(['i1', 'i2', 'i3', 'i4', 'i5', 'i6'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                  {t(`pages.terms.s5.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s5.outro')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s6.title')}</h2>
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-400">{t('pages.terms.s6.boxTitle')}</p>
              <p className="mt-2 text-green-700 dark:text-green-300">{t('pages.terms.s6.boxText')}</p>
            </div>
            <p className="mt-3">{t('pages.terms.s6.intro')}</p>
            <ul className="mt-2 space-y-2">
              {(['i1', 'i2', 'i3', 'i4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t(`pages.terms.s6.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s6.outro')}</p>
          </section>

          {/* ═══════════════ BLOK 3: US COMPLIANCE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s7.title')}</h2>
            <p>{t('pages.terms.s7.intro')}</p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.terms.s7.noticeTitle')}</p>
            <ul className="mt-2 space-y-2">
              {(['n1', 'n2', 'n3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {rich(t(`pages.terms.s7.${k}`))}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.terms.s7.counterTitle')}</p>
            <p className="mt-1">{t('pages.terms.s7.counterText')}</p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.terms.s7.repeatTitle')}</p>
            <p className="mt-1">{t('pages.terms.s7.repeatText')}</p>
          </section>

          {/* ═══════════════ BLOK 4: ZAŠTITA PODATAKA ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s8.title')}</h2>
            <p>{t('pages.terms.s8.intro')}</p>
            <p className="mt-3 font-semibold text-gray-900 dark:text-white">{t('pages.terms.s8.basisTitle')}</p>
            <ul className="mt-2 space-y-2">
              {(['b1', 'b2', 'b3', 'b4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t(`pages.terms.s8.${k}`))}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">{rich(t('pages.terms.s8.location'))}</p>
            <p className="mt-2">
              {t('pages.terms.s8.moreBefore')}{' '}
              <Link href="/privacy" className="text-primary-500 hover:underline">
                {t('pages.terms.s8.moreLink')}
              </Link>.
              {' '}{t('pages.terms.s8.dpo')} <strong>dpo@myphotomy.space</strong>
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s9.title')}</h2>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="font-semibold text-blue-800 dark:text-blue-400">{t('pages.terms.s9.boxTitle')}</p>
              <ul className="mt-3 space-y-2 text-blue-700 dark:text-blue-300">
                {(['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                    <span>{rich(t(`pages.terms.s9.${k}`))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3">{rich(t('pages.terms.s9.outro'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s10.title')}</h2>
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
              <p className="font-semibold text-purple-800 dark:text-purple-400">{t('pages.terms.s10.boxTitle')}</p>
              <ul className="mt-3 space-y-2 text-purple-700 dark:text-purple-300">
                {(['l1', 'l2', 'l3', 'l4'] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-purple-500" />
                    <span>{rich(t(`pages.terms.s10.${k}`))}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3">{rich(t('pages.terms.s10.outro'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s11.title')}</h2>
            <p>{rich(t('pages.terms.s11.intro'))}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {t(`pages.terms.s11.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s11.outro')}</p>
          </section>

          {/* ═══════════════ BLOK 5: PLAĆANJE ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s12.title')}</h2>
            <p>{t('pages.terms.s12.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3', 'i4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {rich(t(`pages.terms.s12.${k}`))}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s13.title')}</h2>
            <p>{t('pages.terms.s13.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3', 'i4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {rich(t(`pages.terms.s13.${k}`))}
                </li>
              ))}
            </ul>
          </section>

          {/* ═══════════════ BLOK 5.5: AI MEME GENERATOR ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s14.title')}</h2>
            <p>{t('pages.terms.s14.intro')}</p>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h1')}</h3>
            <ul className="mt-2 space-y-2">
              {(['a1', 'a2', 'a3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t(`pages.terms.s14.${k}`))}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h2')}</h3>
            <p className="mt-2">{rich(t('pages.terms.s14.prohibitedIntro'))}</p>
            <ul className="mt-2 space-y-2">
              {(['p1', 'p2', 'p3', 'p4', 'p5'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-red-500" />
                  <span>{rich(t(`pages.terms.s14.${k}`))}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h3')}</h3>
            <p className="mt-2">{t('pages.terms.s14.moderationIntro')}</p>
            <ul className="mt-2 space-y-2">
              {(['m1', 'm2', 'm3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t(`pages.terms.s14.${k}`))}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h4')}</h3>
            <ul className="mt-2 space-y-2">
              {(['r1', 'r2', 'r3', 'r4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <span>{rich(t(`pages.terms.s14.${k}`))}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h5')}</h3>
            <p className="mt-2">{rich(t('pages.terms.s14.disclaimerIntro'))}</p>
            <ul className="mt-2 space-y-2">
              {(['d1', 'd2', 'd3', 'd4'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span>{rich(t(`pages.terms.s14.${k}`))}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t('pages.terms.s14.h6')}</h3>
            <p className="mt-2">
              {t('pages.terms.s14.limitsBefore')}{' '}
              <Link href="/pricing" className="text-primary-500 underline hover:text-primary-600">{t('pages.terms.s14.limitsLink')}</Link>
              {t('pages.terms.s14.limitsAfter') ? ` ${t('pages.terms.s14.limitsAfter')}` : '.'}
            </p>
          </section>

          {/* ═══════════════ BLOK 6: ODGOVORNOST ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s15.title')}</h2>
            <p>{rich(t('pages.terms.s15.p1'))}</p>
            <p className="mt-2">{rich(t('pages.terms.s15.p2'))}</p>
            <p className="mt-2">{t('pages.terms.s15.p3')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s16.title')}</h2>
            <p>{t('pages.terms.s16.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Scale className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span>{rich(t(`pages.terms.s16.${k}`))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s17.title')}</h2>
            <p>{t('pages.terms.s17.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span className="mt-1 h-4 w-4 flex-shrink-0 text-center text-red-500">✕</span>
                  {t(`pages.terms.s17.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s17.outro')}</p>
          </section>

          {/* ═══════════════ BLOK 7: PREKID I SPOROVI ═══════════════ */}

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s18.title')}</h2>
            <p>{rich(t('pages.terms.s18.intro'))}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {rich(t(`pages.terms.s18.${k}`))}
                </li>
              ))}
            </ul>
            <p className="mt-3">{rich(t('pages.terms.s18.outro'))}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s19.title')}</h2>
            <p>{rich(t('pages.terms.s19.intro'))}</p>
            <ul className="mt-3 space-y-3">
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">{t('pages.terms.s19.euTitle')}</p>
                <p className="mt-1">{t('pages.terms.s19.euText')}</p>
              </li>
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">{t('pages.terms.s19.usTitle')}</p>
                <p className="mt-1">{rich(t('pages.terms.s19.usText'))}</p>
                <p className="mt-1 font-semibold text-gray-900 dark:text-white">{t('pages.terms.s19.classTitle')}</p>
                <p className="mt-1">{t('pages.terms.s19.classText')}</p>
              </li>
              <li>
                <p className="font-semibold text-gray-900 dark:text-white">{t('pages.terms.s19.rsTitle')}</p>
                <p className="mt-1">{t('pages.terms.s19.rsText')}</p>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s20.title')}</h2>
            <p>{t('pages.terms.s20.intro')}</p>
            <ul className="mt-3 space-y-2">
              {(['i1', 'i2', 'i3'] as const).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                  {rich(t(`pages.terms.s20.${k}`))}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t('pages.terms.s20.outro')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s21.title')}</h2>
            <p>{t('pages.terms.s21.text')}</p>
          </section>

          <section>
            <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t('pages.terms.s22.title')}</h2>
            <p>{t('pages.terms.s22.intro')}</p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>{t('pages.terms.s22.general')}</strong> <a href="mailto:legal@myphotomy.space" className="text-primary-500 hover:underline">legal@myphotomy.space</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>{t('pages.terms.s22.dpo')}</strong> <a href="mailto:dpo@myphotomy.space" className="text-primary-500 hover:underline">dpo@myphotomy.space</a></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>{t('pages.terms.s22.dmca')}</strong> <a href="mailto:legal@myphotomy.space" className="text-primary-500 hover:underline">legal@myphotomy.space</a> {t('pages.terms.s22.dmcaSubject')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span><strong>{t('pages.terms.s22.form')}</strong>{' '}
                  <Link href="/contact" className="text-primary-500 hover:underline">
                    myphotomy.space/contact
                  </Link>
                </span>
              </li>
            </ul>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">{t('pages.terms.cta.title')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            {t('pages.terms.cta.subtitle')}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            {t('pages.terms.cta.button')}
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
            {t('pages.terms.footer.rights', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">{t('pages.terms.footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-primary-500">{t('pages.terms.footer.terms')}</Link>
            <Link href="/refund" className="hover:text-primary-500">{t('pages.shell.refund')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.terms.footer.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
