import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Upload,
  Cloud,
  Shield,
  Smartphone,
  Check,
  Zap,
  Lock,
  Server,
} from 'lucide-react';

export function generateMetadata(): Metadata {
  return {
    title: 'Auto Backup All Your Photos & Videos | MyPhoto.my.id',
    description:
      'Automatic photo backup app that saves all your photos and videos to a secure cloud. Auto backup photos to cloud with original quality, no compression. EU servers, GDPR compliant.',
    alternates: {
      canonical: 'https://myphoto.my.id/features/photo-backup',
    },
    openGraph: {
      title: 'Auto Backup All Your Photos & Videos | MyPhoto.my.id',
      description:
        'Automatic photo backup app that saves all your photos and videos to a secure cloud. Original quality, EU servers.',
      url: 'https://myphoto.my.id/features/photo-backup',
      siteName: 'MyPhoto.my.id',
      type: 'website',
      locale: 'sr_RS',
      images: [
        {
          url: 'https://myphoto.my.id/og-image.png',
          width: 1200,
          height: 630,
          alt: 'MyPhoto.my.id - Auto Photo Backup',
        },
      ],
    },
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'MyPhoto.my.id',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Android, Web',
      description:
        'Automatic photo backup app with secure cloud storage. Original quality, EU servers, GDPR compliant.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: 'https://myphoto.my.id',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Pocetna',
          item: 'https://myphoto.my.id',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Features',
          item: 'https://myphoto.my.id/features',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Photo Backup',
          item: 'https://myphoto.my.id/features/photo-backup',
        },
      ],
    },
  ],
};

const STEPS = [
  {
    icon: Smartphone,
    title: 'Instalirajte aplikaciju',
    description:
      'Preuzmite MyPhoto aplikaciju sa Google Play Store-a i prijavite se na svoj nalog.',
  },
  {
    icon: Upload,
    title: 'Uključite auto backup',
    description:
      'Jednim klikom aktivirajte automatski backup svih slika i videa sa vašeg telefona.',
  },
  {
    icon: Cloud,
    title: 'Uživajte u sigurnosti',
    description:
      'Vaše slike se automatski čuvaju u originalnom kvalitetu na sigurnim EU serverima.',
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'Automatski u pozadini',
    description:
      'Backup se pokreće automatski kada ste na Wi-Fi mreži. Bez baterijske potrošnje.',
  },
  {
    icon: Shield,
    title: 'Original kvalitet',
    description:
      'Svaki piksel sačuvan. Bez kompresije, bez gubitka kvaliteta. RAW podrška.',
  },
  {
    icon: Lock,
    title: 'Enkripcija u prenosu',
    description:
      'TLS enkripcija tokom prenosa i AES-256 enkripcija na serveru.',
  },
  {
    icon: Server,
    title: 'EU serveri',
    description:
      'Podaci se čuvaju isključivo na serverima u Evropskoj Uniji (Frankfurt).',
  },
  {
    icon: Smartphone,
    title: 'Višestruki uređaji',
    description:
      'Backup sa svih vaših uređaja na jedan nalog. Telefon, tablet, desktop.',
  },
  {
    icon: Cloud,
    title: 'Pristup svuda',
    description:
      'Pristupite svim slikama sa bilo kog uređaja putem web pregledača ili aplikacije.',
  },
];

const FAQS = [
  {
    q: 'Da li backup troši puno baterije?',
    a: 'Ne. MyPhoto koristi optimizovane pozadinske procese koji minimalno utiču na bateriju. Backup se podrazumevano pokreće samo na Wi-Fi mreži.',
  },
  {
    q: 'Da li se slike kompresuju prilikom backup-a?',
    a: 'Ne. Sve slike i videi se čuvaju u originalnom kvalitetu, bez ikakve kompresije ili smanjenja rezolucije.',
  },
  {
    q: 'Šta se dešava ako izgubim telefon?',
    a: 'Sve vaše slike su sigurno sačuvane u cloud-u. Prijavite se na novi uređaj i pristupite svim uspomenama.',
  },
  {
    q: 'Koliko prostora dobijem besplatno?',
    a: 'Besplatni plan počinje sa 1GB, a instalacijom aplikacije i uključivanjem backup-a dobijate ukupno 5GB. Pozivanjem prijatelja možete dobiti do 15GB besplatno.',
  },
];

export default function PhotoBackupPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Auto Backup All Your Photos &amp; Videos
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            Nikad više ne brinite o izgubljenim slikama. MyPhoto automatski
            čuva svaki momenat u originalnom kvalitetu na sigurnim EU serverima.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
            >
              Započnite besplatno
            </Link>
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <Smartphone className="h-5 w-5" />
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Kako funkcioniše?
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          Tri jednostavna koraka do potpune sigurnosti vaših uspomena
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <article
              key={step.title}
              className="relative rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-gray-800"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-xl font-bold text-white">
                {i + 1}
              </div>
              <step.icon className="mx-auto mb-3 h-8 w-8 text-primary-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Zašto izabrati MyPhoto za backup?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <f.icon className="mb-3 h-8 w-8 text-primary-500" />
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {f.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Android App CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white md:p-12">
          <Smartphone className="mx-auto mb-4 h-12 w-12" />
          <h2 className="mb-2 text-3xl font-bold">
            Preuzmite Android aplikaciju
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-primary-100">
            Instalirajte MyPhoto na vaš Android telefon i aktivirajte automatski
            backup za sve vaše slike i video zapise.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://play.google.com/store"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-primary-50"
            >
              Preuzmite sa Google Play
            </a>
            <Link
              href="/register"
              className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Ili započnite na webu
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Često postavljana pitanja
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900 dark:text-white">
                {faq.q}
                <span className="ml-4 text-gray-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/50">
        <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Sačuvajte vaše uspomene danas
        </h2>
        <p className="mx-auto mb-6 max-w-md text-gray-600 dark:text-gray-300">
          Do 15GB besplatno. Bez kreditne kartice. Bez obaveza.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
        >
          Započnite besplatno
        </Link>
      </section>
    </>
  );
}
