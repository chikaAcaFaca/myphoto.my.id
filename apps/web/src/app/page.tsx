'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Star,
  Upload,
  Brain,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';
import { AnimatedSection, StaggerContainer, StaggerItem } from '@/components/landing/animated-section';

const HERO_TIERS = STORAGE_TIERS.slice(0, 3);

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedCounter({ target, duration = 2, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v).toLocaleString());

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
  const words = ['Vaše', 'slike.'];
  const gradientWords = ['Samo', 'vaše.'];

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
  const [planType, setPlanType] = useState<'standard' | 'ai'>('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showStickyCta, setShowStickyCta] = useState(false);
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  const testimonialRef = useRef<HTMLDivElement>(null);

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
    return planType === 'ai' ? tier.priceMonthlyAI : tier.priceMonthly;
  };

  const getYearlyMonthlyEquiv = (tier: typeof STORAGE_TIERS[0]) => {
    return planType === 'ai' ? tier.priceYearlyAI / 12 : tier.priceYearly / 12;
  };

  const getYearlyTotal = (tier: typeof STORAGE_TIERS[0]) => {
    return planType === 'ai' ? tier.priceYearlyAI : tier.priceYearly;
  };

  const getSavingsPercent = (tier: typeof STORAGE_TIERS[0]) => {
    const monthly = getMonthlyPrice(tier);
    if (monthly === 0) return 0;
    return Math.round((1 - getYearlyMonthlyEquiv(tier) / monthly) * 100);
  };

  // Testimonial carousel
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const nextTestimonial = useCallback(() => {
    setTestimonialIndex((i) => (i + 1) % TESTIMONIALS.length);
  }, []);
  const prevTestimonial = useCallback(() => {
    setTestimonialIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* ───── Header ───── */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <NextImage
            src="/logo.png"
            alt="MyPhoto.my.id"
            width={240}
            height={72}
            className="h-16 w-auto"
            priority
          />
          <div className="flex items-center gap-4">
            <Link href="/login" className="btn-ghost">
              Prijava
            </Link>
            <Link href="/register" className="btn-primary">
              Započni besplatno
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
          Privatni cloud storage sa AI funkcijama. Bez kompresije, bez kompromisa.
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
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              <AnimatedCounter target={1200} suffix="+" />
            </span>{' '}
            korisnika čuva uspomene privatno
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
            Započni besplatno — 10GB
          </Link>
          <Link
            href="#pricing"
            className="rounded-xl border-2 border-primary-300 px-8 py-4 text-lg font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            Pogledaj planove
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
            Ne koristimo slike za AI trening
          </span>
          <span className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Server className="h-4 w-4" />
            EU Serveri
          </span>
          <span className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Lock className="h-4 w-4" />
            GDPR Compliant
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
              Koriste fotografski timovi, porodice i profesionalci širom Evrope
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  <AnimatedCounter target={50000} suffix="+" />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">sačuvanih slika</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  <AnimatedCounter target={1200} suffix="+" />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">aktivnih korisnika</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">99.9%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">uptime</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 3. Comparison Table ───── */}
      <section className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Zašto MyPhoto?</h2>
          <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
            Uporedite nas sa konkurencijom
          </p>
        </AnimatedSection>

        <AnimatedSection direction="left" delay={0.2}>
          <div className="mx-auto max-w-4xl overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Funkcija
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
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.feature} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.myphoto === true ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{row.myphoto}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.google === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.google === false ? (
                        <X className="mx-auto h-5 w-5 text-red-400" />
                      ) : (
                        <span className="text-sm text-gray-500">{row.google}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.icloud === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.icloud === false ? (
                        <X className="mx-auto h-5 w-5 text-red-400" />
                      ) : (
                        <span className="text-sm text-gray-500">{row.icloud}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-lg font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Prebacite se danas <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ───── 4. Features Showcase (6 cards) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Sve što vam treba</h2>
            <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
              Vaše uspomene nisu naš proizvod
            </p>
          </AnimatedSection>

          <StaggerContainer className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="group rounded-2xl bg-white p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-800">
                  <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br', f.gradient)}>
                    <f.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{f.description}</p>
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
            Pretražite slike <span className="gradient-text">rečima</span>
          </h2>
          <p className="mb-10 text-center text-gray-600 dark:text-gray-300">
            AI pretraga razume prirodni jezik — opišite sliku i pronađite je
          </p>
        </AnimatedSection>

        <div className="mx-auto max-w-2xl">
          <TypingAnimation text="zalazak sunca na moru" delay={0.5} />

          <StaggerContainer className="mt-6 grid grid-cols-2 gap-4" staggerDelay={0.2}>
            {AI_DEMO_RESULTS.map((r) => (
              <StaggerItem key={r.label}>
                <div className={cn('aspect-video rounded-xl bg-gradient-to-br p-4 flex items-end', r.gradient)}>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                    {r.label}
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
                Probajte AI — besplatno
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 6. How It Works (3 steps) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Kako funkcioniše?</h2>
            <p className="mb-16 text-center text-gray-600 dark:text-gray-300">
              Tri jednostavna koraka do sigurnog čuvanja
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
                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
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
                Započnite za 30 sekundi <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ───── 7. Pricing ───── */}
      <section id="pricing" ref={pricingSectionRef} className="container mx-auto px-4 py-20">
        <AnimatedSection>
          <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Izaberite plan</h2>
          <p className="mb-8 text-center text-gray-600 dark:text-gray-300">
            Započnite besplatno, nadogradite kad poželite
          </p>
        </AnimatedSection>

        {/* Toggles */}
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            <button
              onClick={() => setPlanType('standard')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                planType === 'standard'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <Image className="h-4 w-4" />
              Standard
            </button>
            <button
              onClick={() => setPlanType('ai')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                planType === 'ai'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <Sparkles className="h-4 w-4" />
              AI Powered
            </button>
          </div>

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
              {BILLING_PERIODS.monthly.label}
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
              {BILLING_PERIODS.yearly.label}
              <span className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                2 mes. gratis
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
                      NAJPOPULARNIJI
                    </div>
                  )}

                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className={cn('text-2xl font-medium', isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300')}>
                    {tier.storageDisplay}
                  </p>

                  <div className="mt-3 mb-4">
                    {isFree ? (
                      <p className="text-3xl font-bold">Besplatno</p>
                    ) : billingCycle === 'monthly' ? (
                      <p className={cn('text-3xl font-bold', isPopular ? '' : 'text-gray-900 dark:text-white')}>
                        ${monthlyPrice.toFixed(2)}
                        <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          /mes
                        </span>
                      </p>
                    ) : (
                      <div>
                        <p className={cn('text-lg line-through', isPopular ? 'text-primary-200' : 'text-gray-400')}>
                          ${monthlyPrice.toFixed(2)}/mes
                        </p>
                        <p className="text-3xl font-bold text-green-500">
                          ${yearlyEquiv.toFixed(2)}
                          <span className={cn('text-sm font-normal', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                            /mes
                          </span>
                        </p>
                        <p className={cn('text-sm', isPopular ? 'text-primary-100' : 'text-gray-500')}>
                          ${yearlyTotal.toFixed(2)}/god
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
                        {feature}
                      </li>
                    ))}
                    {planType === 'ai' && tier.aiFeatures && tier.aiFeatures.slice(0, 2).map((feature, i) => (
                      <li key={`ai-${i}`} className={cn('flex items-center gap-2 text-sm', isPopular ? 'text-primary-50' : 'text-purple-600 dark:text-purple-400')}>
                        <Sparkles className={cn('h-4 w-4 flex-shrink-0', isPopular ? 'text-yellow-300' : 'text-purple-500')} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={isFree ? '/register' : `/register?tier=${tier.tier}&ai=${planType === 'ai'}&period=${billingCycle}`}
                    className={cn(
                      'block w-full rounded-lg py-3 text-center font-semibold transition-colors',
                      isPopular
                        ? 'bg-white text-primary-600 hover:bg-primary-50'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    )}
                  >
                    {isFree ? 'Započni besplatno' : 'Izaberi plan'}
                  </Link>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-primary-500 hover:underline">
            Pogledaj sve planove <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ───── 8. Testimonials (carousel) ───── */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">Šta kažu naši korisnici</h2>
            <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
              Pridružite se korisnicima koji čuvaju svoje uspomene privatno i sigurno
            </p>
          </AnimatedSection>

          {/* Carousel */}
          <div ref={testimonialRef} className="relative mx-auto max-w-4xl">
            <div className="overflow-hidden">
              <motion.div
                className="flex gap-6"
                animate={{ x: `calc(-${testimonialIndex * 100}% - ${testimonialIndex * 24}px)` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              >
                {TESTIMONIALS.map((t) => (
                  <div
                    key={t.name}
                    className="w-full flex-shrink-0 rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800 md:w-[calc(50%-12px)]"
                  >
                    <div className="mb-4 flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.avatarImg}
                        alt={t.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-primary-200"
                      />
                      <div>
                        <p className="font-semibold text-lg">{t.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
                      </div>
                    </div>
                    <div className="mb-4 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < t.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 leading-relaxed dark:text-gray-300">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prevTestimonial}
              className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 hidden md:block"
              aria-label="Prethodni"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute -right-4 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 hidden md:block"
              aria-label="Sledeći"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="mt-6 flex justify-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTestimonialIndex(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === testimonialIndex ? 'w-6 bg-primary-500' : 'w-2 bg-gray-300 dark:bg-gray-600'
                  )}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <AnimatedSection delay={0.3}>
            <div className="mt-10 text-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl"
              >
                Pridružite se — besplatno
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
              Započnite za 30 sekundi
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-primary-100">
              10GB besplatno. Bez kreditne kartice. Bez obaveza.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-primary-600 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
              >
                Započni besplatno
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border-2 border-white/50 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
              >
                Uporedi planove
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
                alt="MyPhoto.my.id"
                width={180}
                height={54}
                className="mb-4 h-12 w-auto"
              />
              <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
                Privatni cloud storage za vaše slike i video zapise. Bez kompresije, sa AI funkcijama i GDPR zaštitom.
              </p>
            </div>

            {/* Proizvod */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                Proizvod
              </h4>
              <ul className="space-y-2">
                <li><Link href="/pricing" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Cene</Link></li>
                <li><Link href="/register" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Registracija</Link></li>
                <li><Link href="/login" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Prijava</Link></li>
              </ul>
            </div>

            {/* Podrška */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                Podrška
              </h4>
              <ul className="space-y-2">
                <li><Link href="/support" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Pomoć</Link></li>
                <li><Link href="/contact" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Kontakt</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
                Legal
              </h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Privatnost</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-600 hover:text-primary-500 dark:text-gray-400">Uslovi korišćenja</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} MyPhoto.my.id — Sva prava zadržana.
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
          Započni besplatno — 10GB
        </Link>
      </div>
    </div>
  );
}

// ── Static Data ───────────────────────────────────────────────────

const COMPARISON_ROWS: { feature: string; myphoto: boolean | string; google: boolean | string; icloud: boolean | string }[] = [
  { feature: 'Original kvalitet (bez kompresije)', myphoto: true, google: false, icloud: true },
  { feature: 'EU serveri', myphoto: true, google: false, icloud: false },
  { feature: 'GDPR usklađenost', myphoto: true, google: 'Delimično', icloud: 'Delimično' },
  { feature: 'Bez AI treninga na vašim slikama', myphoto: true, google: false, icloud: true },
  { feature: 'Cena za 250GB', myphoto: '$3.49/mes', google: '$2.99/mes', icloud: '$2.99/mes' },
  { feature: 'Family sharing', myphoto: true, google: true, icloud: true },
];

const FEATURES = [
  {
    icon: Cloud,
    title: 'Siguran Cloud Storage',
    description: 'Vaši fajlovi su enkriptovani i čuvani na enterprise-grade infrastrukturi u EU.',
    gradient: 'from-sky-400 to-blue-500',
  },
  {
    icon: Image,
    title: 'Original Kvalitet',
    description: 'Bez kompresije. Svaki piksel sačuvan. RAW format podrška.',
    gradient: 'from-orange-400 to-rose-500',
  },
  {
    icon: Shield,
    title: 'GDPR Compliant',
    description: 'Podaci na EU serverima. Pravo na brisanje garantovano.',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Brain,
    title: 'AI Pretraga',
    description: 'Pretražujte slike prirodnim jezikom. "Plaža u Hrvatskoj" — AI pronalazi.',
    gradient: 'from-purple-400 to-violet-500',
  },
  {
    icon: Users,
    title: 'Family Sharing',
    description: 'Delite storage sa porodicom. Svako ima privatni prostor.',
    gradient: 'from-pink-400 to-fuchsia-500',
  },
  {
    icon: Zap,
    title: 'Brza Sinhronizacija',
    description: 'Upload i pristup slikama munjevitom brzinom sa bilo kog uređaja.',
    gradient: 'from-amber-400 to-orange-500',
  },
];

const AI_DEMO_RESULTS = [
  { label: 'Zalazak sunca — Dubrovnik', gradient: 'from-orange-400 to-rose-500' },
  { label: 'More — Zlatni rat', gradient: 'from-cyan-400 to-blue-500' },
  { label: 'Plaža — Crna Gora', gradient: 'from-amber-300 to-orange-400' },
  { label: 'Sumrak — Zadar', gradient: 'from-violet-400 to-purple-600' },
];

const STEPS = [
  {
    number: 1,
    icon: Upload,
    title: 'Upload',
    description: 'Prevucite slike ili koristite auto-sync. Sve u originalnom kvalitetu.',
  },
  {
    number: 2,
    icon: Brain,
    title: 'AI Organizuje',
    description: 'AI automatski taguje, prepoznaje lica i kategorizuje vaše slike.',
  },
  {
    number: 3,
    icon: Share2,
    title: 'Delite & Čuvajte',
    description: 'Sigurno deljenje sa porodicom. Vaše uspomene, zauvek sačuvane.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Marko P.',
    role: 'Fotograf',
    avatarImg: 'https://i.pravatar.cc/150?img=12',
    quote: 'Konačno servis koji ne kompresuje moje slike. Original kvalitet, EU serveri, i niko ne koristi moje fotke za AI trening. Tačno ono što sam tražio.',
    rating: 5,
  },
  {
    name: 'Ana S.',
    role: 'Mama dvoje dece',
    avatarImg: 'https://i.pravatar.cc/150?img=5',
    quote: 'Family sharing je savršen — muž i ja delimo storage, a slike ostaju privatne. Deca odrastaju, a uspomene su na sigurnom.',
    rating: 5,
  },
  {
    name: 'Nikola D.',
    role: 'Softverski inženjer',
    avatarImg: 'https://i.pravatar.cc/150?img=68',
    quote: 'AI pretraga je neverovatna — kucam "zalazak sunca na moru" i nađe tačno te slike. A cena? Jeftiniji od Google One za istu količinu prostora.',
    rating: 5,
  },
  {
    name: 'Jelena M.',
    role: 'Dizajner',
    avatarImg: 'https://i.pravatar.cc/150?img=9',
    quote: 'Prešla sam sa Google Photos-a jer su počeli da kompresuju slike. Ovde imam pun kvalitet, GDPR zaštitu i lepši interfejs.',
    rating: 4,
  },
];
