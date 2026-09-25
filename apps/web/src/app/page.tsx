'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Cloud,
  Image,
  Shield,
  Zap,
  Lock,
  Server,
  Sparkles,
  Check,
  Search,
  Users,
  Upload,
  Brain,
  Share2,
  X,
  ArrowRight,
} from 'lucide-react';
import { STORAGE_TIERS, ALL_FEATURES } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { AnimatedSection, StaggerContainer, StaggerItem } from '@/components/landing/animated-section';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useI18n } from '@/i18n/client';

// Hero cards: skip the yearly-only storage-only tier (MyDisk Lite) — it
// has its own messaging on the full /pricing page and breaks the
// monthly-vs-yearly toggle pattern on the homepage.
const HERO_TIERS = STORAGE_TIERS.filter((t) => !t.yearlyOnly).slice(0, 3);

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ target, duration = 2, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const { intlLocale } = useI18n();
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString(intlLocale));

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionVal, target, { duration, ease: 'easeOut' });
      return controls.stop;
    }
  }, [isInView, motionVal, target, duration]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v + suffix;
    });
    return unsubscribe;
  }, [rounded, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

// ── Word-by-word hero animation ───────────────────────────────────
function AnimatedHeadline() {
  const { t } = useI18n();
  const words = [t('marketing.home.hero.word1'), t('marketing.home.hero.word2')];
  const gradientWords = [t('marketing.home.hero.gradient1'), t('marketing.home.hero.gradient2')];

  return (
    <h1 className="mb-4 text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.5 }}
          className="inline-block mr-3"
        >
          {word}
        </motion.span>
      ))}
      <br className="md:hidden" />
      {gradientWords.map((word, i) => (
        <motion.span
          key={`g-${i}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (words.length + i) * 0.15, duration: 0.5 }}
          className="inline-block mr-3 gradient-text"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

// ── Mock Gallery Grid ─────────────────────────────────────────────
function MockGallery() {
  const gradients = [
    'from-sky-400 to-blue-500',
    'from-orange-300 to-rose-400',
    'from-emerald-400 to-teal-500',
    'from-violet-400 to-purple-500',
    'from-amber-300 to-orange-400',
    'from-pink-400 to-fuchsia-500',
    'from-cyan-400 to-sky-500',
    'from-lime-300 to-green-400',
    'from-indigo-400 to-violet-500',
    'from-rose-300 to-pink-400',
    'from-teal-400 to-emerald-500',
    'from-fuchsia-400 to-purple-500',
  ];

  return (
    <div className="mx-auto mt-8 grid max-w-2xl grid-cols-4 grid-rows-3 gap-2 rounded-2xl bg-white/50 p-3 shadow-2xl backdrop-blur dark:bg-gray-800/50">
      {gradients.map((g, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + i * 0.05, duration: 0.4 }}
          className={cn(
            'aspect-square rounded-lg bg-gradient-to-br',
            g,
            i === 0 && 'col-span-2 row-span-2 aspect-auto',
          )}
        />
      ))}
    </div>
  );
}

// ── Typing animation for AI demo ──────────────────────────────────
function TypingAnimation({ text, delay = 1 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView && !started) {
      const timeout = setTimeout(() => setStarted(true), delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, delay, started]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <div ref={ref} className="flex items-center gap-3 rounded-xl border-2 border-primary-200 bg-white px-5 py-4 text-lg shadow-lg dark:border-primary-800 dark:bg-gray-800">
      <Search className="h-5 w-5 flex-shrink-0 text-primary-500" />
      <span className="text-gray-800 dark:text-gray-200">
        {displayed}
        <span className="animate-pulse text-primary-500">|</span>
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function HomePage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const fmtPrice = (n: number) =>
    new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'USD' }).format(n);
  const cell = (v: string | boolean) => (v === 'partial' ? t('marketing.home.comparison.partial') : v);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showStickyCta, setShowStickyCta] = useState(false);
  const pricingSectionRef = useRef<HTMLDivElement>(null);

  // Surface the APK download as a top banner when an Android visitor lands
  // on the home page. Hidden once they dismiss it (per session) so it doesn't
  // nag returning users.
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua) && !/wv\)/.test(ua); // exclude in-app webviews
    const dismissed = sessionStorage.getItem('myphoto-android-banner-dismissed') === '1';
    if (isAndroid && !dismissed) setShowAndroidBanner(true);
  }, []);
  const dismissAndroidBanner = () => {
    sessionStorage.setItem('myphoto-android-banner-dismissed', '1');
    setShowAndroidBanner(false);
  };

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/photos');
    }
  }, [user, isLoading, router]);

  // Show sticky CTA after scrolling past pricing
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { threshold: 0 }
    );
    const el = pricingSectionRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, []);

  const getMonthlyPrice = (tier: typeof STORAGE_TIERS[0]) => {
    return tier.priceMonthly;
  };

  const getYearlyMonthlyEquiv = (tier: typeof STORAGE_TIERS[0]) => {
    return tier.priceYearly / 12;
  };

  const getYearlyTotal = (tier: typeof STORAGE_TIERS[0]) => {
    return tier.priceYearly;
  };

  const getSavingsPercent = (tier: typeof STORAGE_TIERS[0]) => {
    const monthly = getMonthlyPrice(tier);
    if (monthly === 0) return 0;
    return Math.round((1 - getYearlyMonthlyEquiv(tier) / monthly) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* ───── Android download banner ───── */}
      {showAndroidBanner && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-green-600 px-4 py-2 text-white shadow">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">📱</span>
            <span>
              <span className="font-semibold">{t('marketing.home.androidBanner.title')}</span>{' '}
              <a href="/api/download/android" className="underline underline-offset-2">
                {t('marketing.home.androidBanner.download')}
              </a>{' '}
              ·{' '}
              <Link href="/download" className="underline underline-offset-2">
                {t('marketing.home.androidBanner.guide')}
              </Link>
            </span>
          </div>
          <button
            onClick={dismissAndroidBanner}
            aria-label={t('marketing.home.androidBanner.close')}
            className="rounded-md px-2 py-1 text-white/90 hover:bg-white/15"
          >
            ✕
          </button>
        </div>
      )}

      {/* ───── Header ───── */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <NextImage
            src="/logo.png"
            alt="MyPhoto"
            width={240}
            height={72}
            className="h-16 w-auto"
            priority
          />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login" className="btn-ghost">
              {t('marketing.home.header.login')}
            </Link>
            <Link href="/register" className="btn-primary">
              {t('marketing.home.header.startFree')}
            </Link>
          </div>
        </nav>
      </header>

      {/* ───── 1. Hero ───── */}
      <section className="container mx-auto px-4 pb-16 pt-10 text-center">
        <AnimatedHeadline />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mx-auto mb-6 max-w-xl text-lg text-gray-600 dark:text-gray-300"
        >
          {t('marketing.home.hero.subtitle')}
        </motion.p>

        {/* Social proof line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span className="flex items-center gap-1 animate-pulse-slow">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">{t('marketing.home.hero.proofStrong')}</span>{' '}
            {t('marketing.home.hero.proofRest')}
          </span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="mb-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="rounded-xl bg-primary-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl hover:shadow-primary-500/40"
          >
            {t('marketing.home.hero.ctaPrimary')}
          </Link>
          <Link
            href="#pricing"
            className="rounded-xl border-2 border-primary-300 px-8 py-4 text-lg font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            {t('marketing.home.hero.ctaSecondary')}
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="mb-4 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Shield className="h-4 w-4" />
            {t('marketing.home.hero.badgeNoAi')}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Server className="h-4 w-4" />
            {t('marketing.home.hero.badgeEu')}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Lock className="h-4 w-4" />
            {t('marketing.home.hero.badgeGdpr')}
          </span>
        </motion.div>

        {/* Mock Gallery */}
        <MockGallery />
      </section>

      {/* ───── 2. Social Proof / Logo Bar ───── */}
      <section className="border-y border-gray-200 bg-white/80 py-8 backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection>
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t('marketing.home.proof.tagline')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  <AnimatedCounter target={15} suffix="GB" />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketing.home.proof.freeLabel')}</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">0%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketing.home.proof.compressionLabel')}</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">EU</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('marketing.home.proof.euLabel')}</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 3. Comparison Table ───── */}
      <section className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">{t('marketing.home.comparison.title')}</h2>
          <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
            {t('marketing.home.comparison.subtitle')}
          </p>
        </AnimatedSection>

        <AnimatedSection direction="left" delay={0.2}>
          <div className="mx-auto max-w-4xl overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    {t('marketing.home.comparison.feature')}
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center dark:border-gray-700">
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      MyPhoto
                    </span>
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Google Photos
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    iCloud
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => {
                  const isPricePerGb = row.key === 'pricePerGb';
                  return (
                  <tr key={row.key} className={cn('border-b border-gray-100 dark:border-gray-800', isPricePerGb && 'font-semibold')}>
                    <td className={cn('px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300', isPricePerGb && 'font-bold')}>
                      {t(`marketing.home.comparison.rows.${row.key}`)}
                    </td>
                    <td className={cn('px-4 py-3 text-center', isPricePerGb && 'rounded-md bg-green-50 dark:bg-green-900/20')}>
                      {row.myphoto === true ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <span className={cn('text-sm font-medium', isPricePerGb ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400')}>{cell(row.myphoto)}</span>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 text-center', isPricePerGb && 'rounded-md bg-red-50 dark:bg-red-900/20')}>
                      {row.google === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.google === false ? (
                        <X className="mx-auto h-5 w-5 text-red-400" />
                      ) : (
                        <span className={cn('text-sm', isPricePerGb ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500')}>{cell(row.google)}</span>
                      )}
                    </td>
                    <td className={cn('px-4 py-3 text-center', isPricePerGb && 'rounded-md bg-red-50 dark:bg-red-900/20')}>
                      {row.icloud === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.icloud === false ? (
                        <X className="mx-auto h-5 w-5 text-red-400" />
                      ) : (
                        <span className={cn('text-sm', isPricePerGb ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500')}>{cell(row.icloud)}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-lg font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {t('marketing.home.comparison.cta')} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ───── 4. Features Showcase (6 cards) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">{t('marketing.home.features.title')}</h2>
            <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
              {t('marketing.home.features.subtitle')}
            </p>
          </AnimatedSection>

          <StaggerContainer className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <StaggerItem key={f.key}>
                <div className="group rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800">
                  <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br', f.gradient)}>
                    <f.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(`marketing.home.features.${f.key}.title`)}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t(`marketing.home.features.${f.key}.description`)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ───── 5. AI Demo (interactive) ───── */}
      <section className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h2 className="mb-2 text-center text-3xl font-bold md:text-4xl">
            {t('marketing.home.aiDemo.titleStart')} <span className="gradient-text">{t('marketing.home.aiDemo.titleGradient')}</span>
          </h2>
          <p className="mb-10 text-center text-gray-600 dark:text-gray-300">
            {t('marketing.home.aiDemo.subtitle')}
          </p>
        </AnimatedSection>

        <div className="mx-auto max-w-2xl">
          <TypingAnimation text={t('marketing.home.aiDemo.query')} delay={0.5} />

          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4" staggerDelay={0.2}>
            {AI_DEMO_RESULTS.map((r) => (
              <StaggerItem key={r.key}>
                <div className={cn('aspect-video rounded-xl bg-gradient-to-br p-4 flex items-end', r.gradient)}>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                    {t(`marketing.home.aiDemo.results.${r.key}`)}
                  </span>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <AnimatedSection delay={0.6}>
            <div className="mt-8 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl"
              >
                <Sparkles className="h-5 w-5" />
                {t('marketing.home.aiDemo.cta')}
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 6. How It Works (3 steps) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">{t('marketing.home.steps.title')}</h2>
            <p className="mb-16 text-center text-gray-600 dark:text-gray-300">
              {t('marketing.home.steps.subtitle')}
            </p>
          </AnimatedSection>

          <div className="relative mx-auto max-w-4xl">
            {/* Connector line */}
            <div className="absolute left-1/2 top-12 hidden h-0.5 w-[60%] -translate-x-1/2 bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300 md:block" />

            <StaggerContainer className="grid gap-8 md:grid-cols-3" staggerDelay={0.15}>
              {STEPS.map((step) => (
                <StaggerItem key={step.number}>
                  <div className="relative text-center">
                    <div className="relative z-10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-2xl font-bold text-white shadow-lg shadow-primary-500/30">
                      {step.number}
                    </div>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
                      <step.icon className="h-8 w-8 text-primary-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{t(`marketing.home.steps.${step.key}.title`)}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{t(`marketing.home.steps.${step.key}.description`)}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>

          <AnimatedSection delay={0.4}>
            <div className="mt-12 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl"
              >
                {t('marketing.home.steps.cta')} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 7. Pricing ───── */}
      <section id="pricing" ref={pricingSectionRef} className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">{t('marketing.home.pricing.title')}</h2>
          <p className="mb-8 text-center text-gray-600 dark:text-gray-300">
            {t('marketing.home.pricing.subtitle')}
          </p>
        </AnimatedSection>

        {/* Billing Toggle */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {t('marketing.home.pricing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              {t('marketing.home.pricing.yearly')}
              <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {t('marketing.home.pricing.twoMonthsFree')}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <StaggerContainer className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {HERO_TIERS.map((tier) => {
            const monthlyPrice = getMonthlyPrice(tier);
            const yearlyEquiv = getYearlyMonthlyEquiv(tier);
            const yearlyTotal = getYearlyTotal(tier);
            const savings = getSavingsPercent(tier);
            const isPopular = tier.isPopular;
            const isFree = tier.tier === 0;

            return (
              <StaggerItem key={tier.tier}>
                <div
                  className={cn(
                    'relative rounded-2xl p-6 text-left transition-all duration-300 hover:scale-105',
                    isPopular
                      ? 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-xl ring-4 ring-primary-200 dark:ring-primary-800'
                      : 'bg-white shadow-lg dark:bg-gray-800'
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                      {t('marketing.home.pricing.mostPopular')}
                    </div>
                  )}

                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className={cn('text-2xl font-medium', isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300')}>
                    {tier.storageDisplay}
                  </p>

                  <div className="mt-3 mb-4">
                    {isFree ? (
                      <p className="text-3xl font-bold">{t('marketing.home.pricing.free')}</p>
                    ) : billingCycle === 'monthly' ? (
                      <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                        {fmtPrice(monthlyPrice)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {t('marketing.home.pricing.perMonth')}
                        </span>
                      </p>
                    ) : (
                      <div>
                        <p className={cn('text-lg line-through', isPopular ? 'text-primary-200' : 'text-gray-400')}>
                          {fmtPrice(monthlyPrice)}{t('marketing.home.pricing.perMonth')}
                        </p>
                        <p className="text-3xl font-bold text-green-500">
                          {fmtPrice(yearlyEquiv)}
                          <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                            {t('marketing.home.pricing.perMonth')}
                          </span>
                        </p>
                        <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          {fmtPrice(yearlyTotal)}{t('marketing.home.pricing.perYear')}
                          {savings > 0 && (
                            <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                              -{savings}%
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <ul className="mb-6 space-y-1.5">
                    {tier.features.slice(0, 3).map((feature, i) => (
                      <li key={i} className={cn('flex items-center gap-2 text-sm', isPopular ? 'text-primary-50' : 'text-gray-600 dark:text-gray-300')}>
                        <Check className={cn('h-4 w-4 flex-shrink-0', isPopular ? 'text-primary-100' : 'text-primary-500')} />
                        {tier.features === ALL_FEATURES ? t(`marketing.home.pricing.tierFeatures.${TIER_FEATURE_KEYS[i]}`) : feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={isFree ? '/register' : `/checkout?tier=${tier.tier}&period=${billingCycle}`}
                    className={cn(
                      'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                      isPopular
                        ? 'bg-white text-primary-600 hover:bg-primary-50'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    )}
                  >
                    {isFree ? t('marketing.home.pricing.startFree') : t('marketing.home.pricing.choosePlan')}
                  </Link>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-primary-500 hover:underline">
            {t('marketing.home.pricing.seeAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ───── 8. Why MyPhoto (honest benefits) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">{t('marketing.home.why.title')}</h2>
            <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
              {t('marketing.home.why.subtitle')}
            </p>
          </AnimatedSection>

          <StaggerContainer className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            {WHY_MYPHOTO.map((item) => (
              <StaggerItem key={item.key}>
                <div className="h-full rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{t(`marketing.home.why.${item.key}.title`)}</h3>
                  <p className="leading-relaxed text-gray-600 dark:text-gray-300">{t(`marketing.home.why.${item.key}.text`)}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <AnimatedSection delay={0.3}>
            <div className="mt-10 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl"
              >
                {t('marketing.home.why.cta')}
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 9. Final CTA ───── */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <AnimatedSection>
            <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
              {t('marketing.home.finalCta.title')}
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-primary-100">
              {t('marketing.home.finalCta.subtitle')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary-600 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
              >
                {t('marketing.home.finalCta.start')}
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border-2 border-white/50 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t('marketing.home.finalCta.compare')}
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 10. Footer ───── */}
      <footer className="border-t border-gray-200 bg-white py-16 dark:border-gray-700 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* Logo + description */}
            <div className="lg:col-span-2">
              <NextImage
                src="/logo.png"
                alt="MyPhoto"
                width={180}
                height={54}
                className="mb-4 h-12 w-auto"
              />
              <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                {t('marketing.home.footer.description')}
              </p>
            </div>

            {/* Proizvod */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                {t('marketing.home.footer.product')}
              </h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.pricing')}</Link></li>
                <li><Link href="/register" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.register')}</Link></li>
                <li><Link href="/login" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.login')}</Link></li>
              </ul>
            </div>

            {/* Podrška */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                {t('marketing.home.footer.support')}
              </h4>
              <ul className="space-y-2">
                <li><Link href="/support" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.help')}</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.contact')}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                {t('marketing.home.footer.legal')}
              </h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.privacy')}</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">{t('marketing.home.footer.terms')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} {t('marketing.home.footer.rights')}
            </p>
          </div>
        </div>
      </footer>

      {/* ───── Sticky Mobile CTA ───── */}
      <div
        className={cn(
          'sticky-cta-bar md:hidden',
          showStickyCta && 'visible'
        )}
      >
        <Link
          href="/register"
          className="block w-full rounded-lg bg-primary-500 py-3 text-center font-semibold text-white"
        >
          {t('marketing.home.stickyCta')}
        </Link>
      </div>
    </div>
  );
}

// ── Static Data ───────────────────────────────────────────────────
// Labels live in the i18n dictionary (marketing.home.*); only keys, icons,
// styling and raw figures stay here. 'partial' is translated at render time.

// First three lines of ALL_FEATURES, as shown on the homepage pricing cards.
const TIER_FEATURE_KEYS = ['backup', 'myspace', 'ai'] as const;

const COMPARISON_ROWS: {
  key: 'original' | 'eu' | 'gdpr' | 'noAi' | 'starter' | 'pricePerGb' | 'family';
  myphoto: boolean | string;
  google: boolean | string;
  icloud: boolean | string;
}[] = [
  { key: 'original', myphoto: true, google: false, icloud: true },
  { key: 'eu', myphoto: true, google: false, icloud: false },
  { key: 'gdpr', myphoto: true, google: 'partial', icloud: 'partial' },
  { key: 'noAi', myphoto: true, google: false, icloud: true },
  { key: 'starter', myphoto: '150 GB — €2.49', google: '100 GB — €2.10', icloud: '50 GB — €0.99' },
  { key: 'pricePerGb', myphoto: '€0.017/GB', google: '€0.021/GB', icloud: '€0.020/GB' },
  { key: 'family', myphoto: true, google: true, icloud: true },
];

const FEATURES = [
  { icon: Cloud, key: 'cloud', gradient: 'from-sky-400 to-blue-500' },
  { icon: Image, key: 'original', gradient: 'from-orange-400 to-rose-500' },
  { icon: Shield, key: 'gdpr', gradient: 'from-emerald-400 to-teal-500' },
  { icon: Brain, key: 'ai', gradient: 'from-purple-400 to-violet-500' },
  { icon: Users, key: 'family', gradient: 'from-pink-400 to-fuchsia-500' },
  { icon: Zap, key: 'sync', gradient: 'from-amber-400 to-orange-500' },
] as const;

const AI_DEMO_RESULTS = [
  { key: 'dubrovnik', gradient: 'from-orange-400 to-rose-500' },
  { key: 'zlatniRat', gradient: 'from-cyan-400 to-blue-500' },
  { key: 'montenegro', gradient: 'from-amber-300 to-orange-400' },
  { key: 'zadar', gradient: 'from-violet-400 to-purple-600' },
] as const;

const STEPS = [
  { number: 1, icon: Upload, key: 'upload' },
  { number: 2, icon: Brain, key: 'organize' },
  { number: 3, icon: Share2, key: 'share' },
] as const;

// Honest, verifiable product benefits — replaces fabricated testimonials.
const WHY_MYPHOTO = [
  { icon: Image, key: 'original' },
  { icon: Shield, key: 'private' },
  { icon: Brain, key: 'ai' },
  { icon: Share2, key: 'sharing' },
] as const;
