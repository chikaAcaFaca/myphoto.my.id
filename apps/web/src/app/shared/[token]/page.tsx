import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  Cloud,
  Lock,
  Zap,
  Upload,
  FolderSync,
  HardDrive,
  Shield,
  Server,
  Check,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getSharedLink(token: string) {
  const doc = await db.collection('shared').doc(token).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  if (!data.isActive) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedLink(token);

  if (!shared) {
    return {
      title: 'Link nije pronađen - MyPhoto.my.id',
    };
  }

  const title = `"${shared.fileName}" - Deljeno sa MyPhoto.my.id`;
  const description =
    'Besplatan cloud storage za vaše slike. 10GB besplatno, privatno i sigurno. Prijavite se za 30 sekundi.';
  const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://myphoto.my.id'}/api/thumbnail/${shared.fileId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: shared.width || 1200,
          height: shared.height || 630,
          alt: shared.fileName,
        },
      ],
      type: 'article',
      siteName: 'MyPhoto.my.id',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function SharedPhotoPage({ params }: PageProps) {
  const { token } = await params;
  const shared = await getSharedLink(token);

  if (!shared) {
    return <NotFoundPage />;
  }

  // Increment view count (fire-and-forget)
  db.collection('shared')
    .doc(token)
    .update({ viewCount: FieldValue.increment(1) })
    .catch(() => {});

  const isImage = shared.mimeType?.startsWith('image/');
  const imageUrl = `/api/thumbnail/${shared.fileId}?size=large`;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Section A: Shared Photo */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-8">
        <p className="mb-4 text-sm text-gray-400">
          Deljeno sa{' '}
          <Link href="/" className="text-primary-400 hover:underline">
            MyPhoto.my.id
          </Link>
        </p>

        {isImage ? (
          <div className="relative w-full max-w-5xl overflow-hidden rounded-lg shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={shared.fileName}
              className="h-auto w-full object-contain"
              style={{ maxHeight: '75vh' }}
            />
          </div>
        ) : (
          <div className="flex h-48 w-full max-w-md items-center justify-center rounded-lg bg-gray-800">
            <p className="text-gray-400">{shared.fileName}</p>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">{shared.fileName}</p>
      </section>

      {/* Section B: Viral Landing Page */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800">
        {/* Divider */}
        <div className="mx-auto h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-gray-600 to-transparent" />

        {/* Value Props */}
        <div className="mx-auto max-w-4xl px-4 py-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-white md:text-3xl">
            Čuvajte svoje slike privatno i sigurno
          </h2>
          <p className="mb-12 text-center text-gray-400">
            Besplatan cloud storage koji poštuje vašu privatnost
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <ValueProp
              icon={<div className="relative"><Cloud className="h-7 w-7 text-green-400" /><Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-green-300" /></div>}
              title="Privatno i sigurno"
              description="Vaše slike ostaju samo vaše. Ne koristimo ih za AI trening niti skeniramo za reklame."
            />
            <ValueProp
              icon={<Zap className="h-7 w-7 text-yellow-400" />}
              title="Jednostavna prijava"
              description="Google nalog ili email - registracija za 30 sekundi. Bez kreditne kartice."
            />
            <ValueProp
              icon={<Upload className="h-7 w-7 text-blue-400" />}
              title="Upload sa bilo kog uređaja"
              description="Telefon, tablet, računar - pristupite slikama sa bilo kog mesta."
            />
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mx-auto max-w-4xl px-4 pb-16">
          <h3 className="mb-6 text-center text-lg font-semibold text-gray-300">
            Uskoro
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <ComingSoonCard
              icon={<FolderSync className="h-6 w-6 text-purple-400" />}
              title="Automatska sinhronizacija foldera"
              description="Povežite foldere na uređajima - slike se automatski čuvaju u oblaku."
            />
            <ComingSoonCard
              icon={<HardDrive className="h-6 w-6 text-orange-400" />}
              title="Svi fajlovi na jednom mestu"
              description="Slike, video, dokumenti - kao Dropbox, ali sa fokusom na privatnost."
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto max-w-2xl px-4 pb-16 text-center">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-primary-500 px-10 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl"
          >
            Započni besplatno - 10GB
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            Bez kreditne kartice. Bez obaveza. Otkažite bilo kada.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 px-4 pb-12">
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Server className="h-3.5 w-3.5" />
            EU Serveri
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Shield className="h-3.5 w-3.5" />
            GDPR Compliant
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-700/50 px-4 py-2 text-xs text-gray-300">
            <Lock className="h-3.5 w-3.5" />
            Ne koristimo slike za AI trening
          </div>
        </div>

        {/* Compact Pricing */}
        <div className="mx-auto max-w-4xl px-4 pb-16">
          <h3 className="mb-8 text-center text-xl font-bold text-white">
            Fleksibilni planovi
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              storage="10 GB"
              features={['Web & mobile pristup', 'Deljenje slika']}
            />
            <PricingCard
              name="Plus + AI"
              price="$4.49"
              storage="250 GB"
              features={['Smart search', 'Face recognition', 'Family sharing']}
              highlighted
              badge="Najpopularniji"
            />
            <PricingCard
              name="Pro+ + AI"
              price="$17.99"
              storage="1.25 TB"
              features={['Unlimited AI', 'Premium support', 'API pristup']}
            />
          </div>
          <div className="mt-6 text-center">
            <Link href="/pricing" className="text-sm text-primary-400 hover:underline">
              Pogledaj sve planove &rarr;
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-700/50 py-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 md:flex-row md:justify-between">
            <NextImage
              src="/logo.png"
              alt="MyPhoto.my.id"
              width={160}
              height={48}
              className="h-10 w-auto"
            />
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <Link href="/pricing" className="hover:text-gray-300">
                Cene
              </Link>
              <Link href="/privacy" className="hover:text-gray-300">
                Privatnost
              </Link>
              <Link href="/terms" className="hover:text-gray-300">
                Uslovi
              </Link>
              <Link href="/contact" className="hover:text-gray-300">
                Kontakt
              </Link>
              <Link href="/support" className="hover:text-gray-300">
                Podrška
              </Link>
            </div>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} MyPhoto.my.id
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4 text-center">
      <div className="mb-6 text-6xl">🔗</div>
      <h1 className="mb-3 text-2xl font-bold text-white">
        Link nije pronađen
      </h1>
      <p className="mb-8 max-w-md text-gray-400">
        Ovaj link za deljenje ne postoji ili je istekao. Možda je vlasnik uklonio deljenje.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
        >
          Kreiraj nalog - 10GB besplatno
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-600 px-6 py-3 font-semibold text-gray-300 transition-colors hover:bg-gray-800"
        >
          Početna strana
        </Link>
      </div>
    </div>
  );
}

function ValueProp({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-gray-700/50 bg-gray-800/50 p-5">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="mb-1 text-sm font-semibold text-white">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
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
      className={`relative rounded-xl p-5 ${
        highlighted
          ? 'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-xl'
          : 'bg-gray-800 text-gray-200'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
          {badge}
        </div>
      )}
      <h4 className="text-sm font-semibold">{name}</h4>
      <div className="mb-1 mt-2">
        <span className="text-2xl font-bold">{price}</span>
        <span className={highlighted ? 'text-primary-100' : 'text-gray-500'}>
          /mes
        </span>
      </div>
      <p
        className={`mb-4 text-lg font-medium ${
          highlighted ? 'text-primary-100' : 'text-gray-400'
        }`}
      >
        {storage}
      </p>
      <ul className="space-y-1.5">
        {features.map((feature, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 text-xs ${
              highlighted ? 'text-primary-100' : 'text-gray-400'
            }`}
          >
            <Check
              className={`h-3.5 w-3.5 ${
                highlighted ? 'text-white' : 'text-primary-500'
              }`}
            />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
