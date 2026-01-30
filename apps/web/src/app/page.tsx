'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import Link from 'next/link';
import NextImage from 'next/image';
import { Cloud, Image, Shield, Zap } from 'lucide-react';

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
              Log in
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
          Your memories,
          <br />
          <span className="text-primary-500">safely stored</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
          Store all your photos and videos securely in the cloud. Access them anywhere, anytime.
          Smart AI features help you find and organize your memories.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/register" className="btn-primary px-8 py-3 text-lg">
            Start Free - 10GB Storage
          </Link>
          <Link href="/pricing" className="btn-secondary px-8 py-3 text-lg">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Cloud className="h-8 w-8 text-primary-500" />}
            title="Secure Cloud Storage"
            description="Your files are encrypted and stored securely in our enterprise-grade cloud infrastructure."
          />
          <FeatureCard
            icon={<Image className="h-8 w-8 text-primary-500" />}
            title="Smart Organization"
            description="AI automatically organizes your photos by faces, places, and things. Find any photo instantly."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary-500" />}
            title="Private & Secure"
            description="Your photos are yours. We don't sell your data or use it for advertising."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary-500" />}
            title="Fast & Reliable"
            description="Upload and access your photos at lightning speed from anywhere in the world."
          />
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-4 text-center text-3xl font-bold">Simple, transparent pricing</h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          Start free, upgrade when you need more space
        </p>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          <PricingCard
            name="Free"
            price="$0"
            storage="10 GB"
            features={['Basic AI features', 'Web & mobile access', 'Share albums']}
          />
          <PricingCard
            name="Pro"
            price="$11.99"
            storage="1 TB"
            features={['All AI features', 'Priority support', 'Family sharing']}
            highlighted
          />
          <PricingCard
            name="Business"
            price="$45.99"
            storage="5 TB"
            features={['Team management', 'Admin dashboard', 'Audit logs']}
          />
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-primary-500 hover:underline">
            View all plans &rarr;
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
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/privacy" className="hover:text-primary-500">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-primary-500">
                Terms
              </Link>
              <Link href="/support" className="hover:text-primary-500">
                Support
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} MyPhoto. All rights reserved.
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
}: {
  name: string;
  price: string;
  storage: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-6 ${
        highlighted
          ? 'bg-primary-500 text-white shadow-lg'
          : 'bg-white shadow-sm dark:bg-gray-800'
      }`}
    >
      <h3 className="mb-2 text-lg font-semibold">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className={highlighted ? 'text-primary-100' : 'text-gray-500'}>/month</span>
      </div>
      <p className={`mb-6 text-2xl font-medium ${highlighted ? 'text-primary-100' : ''}`}>
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
            <span className={highlighted ? 'text-white' : 'text-primary-500'}>✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
