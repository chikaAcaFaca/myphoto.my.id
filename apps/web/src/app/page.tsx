'use client';

import { useEffect } from 'react';
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
  Users
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

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

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
          Vaše slike.
          <br />
          <span className="text-primary-500">Samo vaše.</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Cloud storage koji poštuje vašu privatnost, nudi AI funkcije za svakoga,
          i ne kompromituje kvalitet vaših uspomena.
        </p>

        {/* Trust Badges */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Shield className="h-4 w-4" />
            <span>Ne koristimo slike za AI trening</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Server className="h-4 w-4" />
            <span>EU Serveri</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Lock className="h-4 w-4" />
            <span>GDPR Compliant</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/register" className="btn-primary px-8 py-3 text-lg">
            Započni besplatno - 10GB
          </Link>
          <Link href="/pricing" className="btn-secondary px-8 py-3 text-lg">
            Pogledaj planove
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
                Smart Search - "slike sa plaže"
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

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="mb-4 text-center text-3xl font-bold">Fleksibilni planovi</h2>
        <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
          Izaberite Standard ili AI Powered verziju
        </p>
        <div className="mb-8 flex justify-center gap-4">
          <span className="rounded-full bg-gray-200 px-4 py-1 text-sm dark:bg-gray-700">
            Standard - od $2.49/mes
          </span>
          <span className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-1 text-sm text-white">
            AI Powered - od $2.99/mes
          </span>
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          <PricingCard
            name="Free"
            price="$0"
            storage="10 GB"
            features={['AI demo (50 slika/mes)', 'Web & mobile pristup', 'Deljenje albuma']}
          />
          <PricingCard
            name="Plus + AI"
            price="$4.49"
            storage="250 GB"
            features={['Smart search', 'Auto-tagging', 'Face recognition', 'Family sharing']}
            highlighted
            badge="Najpopularniji"
          />
          <PricingCard
            name="Pro+ + AI"
            price="$17.99"
            storage="1.25 TB"
            features={['Unlimited AI', 'Premium support', 'API pristup', 'Priority processing']}
          />
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 text-primary-500 hover:underline">
            Pogledaj sve planove
            <span>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="bg-primary-500 py-12 text-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xl font-medium">
            "Vaše uspomene zaslužuju privatnost i kvalitet koji veliki tech giganti ne nude."
          </p>
          <p className="mt-4 text-primary-100">
            Pridružite se korisnicima koji čuvaju svoje slike privatno i sigurno.
          </p>
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
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} MyPhoto. Sva prava zadržana.
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

function PricingCard({
  name,
  price,
  storage,
  features,
  highlighted,
  badge,
}: {
  name: string;
  price: string;
  storage: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative rounded-xl p-6 ${
        highlighted
          ? 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-xl'
          : 'bg-white shadow-lg dark:bg-gray-800'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
          {badge}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className={highlighted ? 'text-primary-100' : 'text-gray-500'}>/mes</span>
      </div>
      <p className={`mb-6 text-2xl font-medium ${highlighted ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'}`}>
        {storage}
      </p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-sm ${
              highlighted ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <Check className={`h-4 w-4 ${highlighted ? 'text-white' : 'text-primary-500'}`} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
