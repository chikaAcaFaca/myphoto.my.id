'use client';

import { useEffect, useState } from 'react';
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
  Download,
  Server,
  Sparkles,
  Check,
  Brain,
  Search,
  Users,
  Star,
} from 'lucide-react';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import { cn } from '@/lib/utils';

const HERO_TIERS = STORAGE_TIERS.slice(0, 3); // Free, Starter, Plus

export default function HomePage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const [planType, setPlanType] = useState<'standard' | 'ai'>('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/photos');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const getMonthlyPrice = (tier: typeof STORAGE_TIERS[0]) => {
    if (planType === 'ai') return tier.priceMonthlyAI;
    return tier.priceMonthly;
  };

  const getYearlyMonthlyEquiv = (tier: typeof STORAGE_TIERS[0]) => {
    if (planType === 'ai') return tier.priceYearlyAI / 12;
    return tier.priceYearly / 12;
  };

  const getYearlyTotal = (tier: typeof STORAGE_TIERS[0]) => {
    if (planType === 'ai') return tier.priceYearlyAI;
    return tier.priceYearly;
  };

  const getSavingsPercent = (tier: typeof STORAGE_TIERS[0]) => {
    const monthly = getMonthlyPrice(tier);
    if (monthly === 0) return 0;
    const equiv = getYearlyMonthlyEquiv(tier);
    return Math.round((1 - equiv / monthly) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
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

      {/* Hero with Interactive Pricing */}
      <section className="container mx-auto px-4 py-10 text-center">
        <h1 className="mb-3 text-4xl font-bold leading-tight md:text-5xl">
          Vaše slike.{' '}
          <span className="text-primary-500">Samo vaše.</span>
        </h1>
        <p className="mx-auto mb-6 max-w-xl text-gray-600 dark:text-gray-300">
          Privatni cloud storage sa AI funkcijama. Bez kompresije, bez kompromisa.
        </p>

        {/* Trust Badges - compact */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Shield className="h-3.5 w-3.5" />
            Ne koristimo slike za AI trening
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Server className="h-3.5 w-3.5" />
            EU Serveri
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Lock className="h-3.5 w-3.5" />
            GDPR
          </span>
        </div>

        {/* Toggles */}
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          {/* Standard / AI toggle */}
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

          {/* Monthly / Yearly toggle */}
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
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {HERO_TIERS.map((tier) => {
            const monthlyPrice = getMonthlyPrice(tier);
            const yearlyEquiv = getYearlyMonthlyEquiv(tier);
            const yearlyTotal = getYearlyTotal(tier);
            const savings = getSavingsPercent(tier);
            const isPopular = tier.isPopular;
            const isFree = tier.tier === 0;

            return (
              <div
                key={tier.tier}
                className={cn(
                  'relative rounded-2xl p-6 text-left transition-transform hover:scale-105',
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
                <p className={cn(
                  'text-2xl font-medium',
                  isPopular ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'
                )}>
                  {tier.storageDisplay}
                </p>

                {/* Pricing */}
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

                {/* Features */}
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
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-primary-500 hover:underline">
            Pogledaj sve planove
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Why MyPhoto - Main Value Props */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-4 text-center text-3xl font-bold">Zašto MyPhoto?</h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          Vaše uspomene nisu naš proizvod
        </p>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Privacy */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Shield className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Privatnost na prvom mestu</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                Ne koristimo vaše slike za AI trening
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                Ne skeniramo sadržaj za reklame
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                Zero-knowledge enkripcija dostupna
              </li>
            </ul>
          </div>

          {/* AI for Everyone */}
          <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white shadow-lg">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">AI za svakoga</h3>
            <p className="mb-3 text-purple-100">
              AI funkcije od $2.99/mesečno - ne samo za premium korisnike
            </p>
            <ul className="space-y-2 text-purple-100">
              <li className="flex items-start gap-2">
                <Search className="mt-1 h-4 w-4 flex-shrink-0" />
                Smart Search - &quot;slike sa plaže&quot;
              </li>
              <li className="flex items-start gap-2">
                <Users className="mt-1 h-4 w-4 flex-shrink-0" />
                Face Recognition
              </li>
              <li className="flex items-start gap-2">
                <Brain className="mt-1 h-4 w-4 flex-shrink-0" />
                AI Photo Assistant
              </li>
            </ul>
          </div>

          {/* Your Control */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Download className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Vaša kontrola. Uvek.</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Export sve jednim klikom
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Bez ugovorne obaveze
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                Otkažite bilo kada
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Sve što vam treba</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Cloud className="h-8 w-8 text-primary-500" />}
              title="Siguran Cloud Storage"
              description="Vaši fajlovi su enkriptovani i čuvani na enterprise-grade infrastrukturi u EU."
            />
            <FeatureCard
              icon={<Image className="h-8 w-8 text-primary-500" />}
              title="Original Kvalitet"
              description="Bez kompresije. Svaki piksel sačuvan. RAW format podrška."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary-500" />}
              title="GDPR Compliant"
              description="Podaci na EU serverima. Pravo na brisanje garantovano."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary-500" />}
              title="Brzo & Pouzdano"
              description="Upload i pristup slikama munjevitom brzinom sa bilo kog mesta."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-16 dark:bg-gray-900/50">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Šta kažu naši korisnici</h2>
          <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
            Pridružite se korisnicima koji čuvaju svoje uspomene privatno i sigurno.
          </p>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-4 text-3xl font-bold">Spremni da započnete?</h2>
        <p className="mx-auto mb-8 max-w-xl text-gray-600 dark:text-gray-300">
          10GB besplatno. Bez kreditne kartice. Bez obaveza.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-primary-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Započni besplatno
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border-2 border-primary-500 px-8 py-3 font-semibold text-primary-500 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            Uporedi planove
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-10 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <NextImage
              src="/logo.png"
              alt="MyPhoto.my.id"
              width={180}
              height={54}
              className="h-12 w-auto"
            />
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/pricing" className="hover:text-primary-500">
                Cene
              </Link>
              <Link href="/privacy" className="hover:text-primary-500">
                Privatnost
              </Link>
              <Link href="/terms" className="hover:text-primary-500">
                Uslovi
              </Link>
              <Link href="/support" className="hover:text-primary-500">
                Podrška
              </Link>
              <Link href="/contact" className="hover:text-primary-500">
                Kontakt
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} MyPhoto.my.id - Sva prava zadržana.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

const TESTIMONIALS = [
  {
    name: 'Marko P.',
    role: 'Fotograf',
    initials: 'MP',
    gradient: 'from-blue-500 to-cyan-500',
    avatarImg: 'https://i.pravatar.cc/150?img=12',
    quote: 'Konačno servis koji ne kompresuje moje slike. Original kvalitet, EU serveri, i niko ne koristi moje fotke za AI trening. Tačno ono što sam tražio.',
    rating: 5,
  },
  {
    name: 'Ana S.',
    role: 'Mama dvoje dece',
    initials: 'AS',
    gradient: 'from-pink-500 to-rose-500',
    avatarImg: 'https://i.pravatar.cc/150?img=5',
    quote: 'Family sharing je savršen — muž i ja delimo storage, a slike ostaju privatne. Deca odrastaju, a uspomene su na sigurnom.',
    rating: 5,
  },
  {
    name: 'Nikola D.',
    role: 'Softverski inženjer',
    initials: 'ND',
    gradient: 'from-green-500 to-emerald-500',
    avatarImg: 'https://i.pravatar.cc/150?img=68',
    quote: 'AI pretraga je neverovatna — kucam "zalazak sunca na moru" i nađe tačno te slike. A cena? Jeftiniji od Google One za istu količinu prostora.',
    rating: 5,
  },
  {
    name: 'Jelena M.',
    role: 'Dizajner',
    initials: 'JM',
    gradient: 'from-purple-500 to-violet-500',
    avatarImg: 'https://i.pravatar.cc/150?img=9',
    quote: 'Prešla sam sa Google Photos-a jer su počeli da kompresuju slike. Ovde imam pun kvalitet, GDPR zaštitu i lepši interfejs.',
    rating: 4,
  },
];

function TestimonialCard({ testimonial }: { testimonial: typeof TESTIMONIALS[number] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={testimonial.avatarImg}
          alt={testimonial.name}
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold">{testimonial.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
        </div>
      </div>
      <div className="mb-3 flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              i < testimonial.rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200 dark:fill-gray-600 dark:text-gray-600'
            )}
          />
        ))}
      </div>
      <p className="text-gray-600 dark:text-gray-300">&quot;{testimonial.quote}&quot;</p>
    </div>
  );
}
