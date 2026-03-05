import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Server,
  Eye,
  Check,
  Cloud,
  Zap,
} from 'lucide-react';

export function generateMetadata(): Metadata {
  return {
    title: 'Your Photos, Your Privacy | MyPhoto.my.id',
    description:
      'Private photo storage with GDPR compliance, EU servers, and encryption. Your photos are never used for AI training. Secure, private cloud storage for your memories.',
    alternates: {
      canonical: 'https://myphoto.my.id/features/private-storage',
    },
    openGraph: {
      title: 'Your Photos, Your Privacy | MyPhoto.my.id',
      description:
        'Private photo storage with GDPR compliance, EU servers, and encryption. Your photos are never used for AI training.',
      url: 'https://myphoto.my.id/features/private-storage',
      siteName: 'MyPhoto.my.id',
      type: 'website',
      locale: 'sr_RS',
      images: [
        {
          url: 'https://myphoto.my.id/og-image.png',
          width: 1200,
          height: 630,
          alt: 'MyPhoto.my.id - Private Photo Storage',
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
        'Private and secure photo storage with GDPR compliance, EU servers, and end-to-end encryption.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      url: 'https://myphoto.my.id',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Are my photos used for AI training?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. MyPhoto never uses your photos for AI model training. Your data is yours and is only used for the features you choose to enable.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where are my photos stored?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'All data is stored on servers located in the European Union (Frankfurt, Germany), fully compliant with GDPR regulations.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is MyPhoto GDPR compliant?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. MyPhoto is fully GDPR compliant. You have the right to access, export, and permanently delete all your data at any time.',
          },
        },
        {
          '@type': 'Question',
          name: 'What encryption does MyPhoto use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'MyPhoto uses TLS encryption for data in transit and AES-256 encryption for data at rest. Zero-knowledge encryption is available for premium users.',
          },
        },
      ],
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
          name: 'Private Storage',
          item: 'https://myphoto.my.id/features/private-storage',
        },
      ],
    },
  ],
};

const PRIVACY_FEATURES = [
  {
    icon: Eye,
    title: 'Bez AI treninga na vašim slikama',
    description:
      'Vaše slike se nikada ne koriste za treniranje AI modela. Ne skeniramo sadržaj za reklame ili profilisanje.',
  },
  {
    icon: Server,
    title: 'EU serveri (Frankfurt)',
    description:
      'Svi podaci se čuvaju isključivo na serverima u Evropskoj Uniji, u skladu sa GDPR regulativom.',
  },
  {
    icon: Lock,
    title: 'AES-256 enkripcija',
    description:
      'Vaši podaci su enkriptovani TLS-om u prenosu i AES-256 enkripcijom na serveru. Zero-knowledge opcija dostupna.',
  },
  {
    icon: Shield,
    title: 'GDPR usklađenost',
    description:
      'Puno pravo na pristup, export i trajno brisanje svih vaših podataka u bilo kom trenutku.',
  },
  {
    icon: Cloud,
    title: 'Bez deljenja sa trećim stranama',
    description:
      'Vaši podaci se nikada ne dele sa trećim stranama. Bez reklamnih partnera, bez data brokera.',
  },
  {
    icon: Zap,
    title: 'Transparentna politika privatnosti',
    description:
      'Jasna i razumljiva politika privatnosti. Bez skrivenih klauzula ili sitnih slova.',
  },
];

const FAQS = [
  {
    q: 'Da li se moje slike koriste za trening AI modela?',
    a: 'Ne. MyPhoto nikada ne koristi vaše slike za treniranje AI modela. Vaši podaci su vaši i služe isključivo za funkcije koje vi koristite.',
  },
  {
    q: 'Gde se čuvaju moji podaci?',
    a: 'Svi podaci se čuvaju na serverima u Evropskoj Uniji (Frankfurt, Nemačka), u potpunosti u skladu sa GDPR regulativom.',
  },
  {
    q: 'Da li je MyPhoto GDPR usklađen?',
    a: 'Da. MyPhoto je u potpunosti GDPR usklađen. Imate pravo na pristup, export i trajno brisanje svih vaših podataka u bilo kom trenutku.',
  },
  {
    q: 'Kakvu enkripciju koristi MyPhoto?',
    a: 'Koristimo TLS enkripciju za podatke u prenosu i AES-256 enkripciju za podatke na serveru. Zero-knowledge enkripcija je dostupna za premium korisnike.',
  },
  {
    q: 'Mogu li obrisati sve svoje podatke?',
    a: 'Da. U bilo kom trenutku možete obrisati sve svoje podatke jednim klikom. Brisanje je trajno i nepovratno, u skladu sa GDPR pravom na brisanje.',
  },
];

const TRUST_POINTS = [
  'Ne koristimo slike za AI trening',
  'Ne skeniramo sadržaj za reklame',
  'Ne delimo podatke sa trećim stranama',
  'Ne profilišemo korisnike',
  'EU serveri, GDPR zaštita',
  'Export svih podataka jednim klikom',
];

export default function PrivateStoragePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Your Photos, Your Privacy
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            Vaše slike zaslužuju privatnost. MyPhoto čuva vaše uspomene na EU
            serverima sa GDPR zaštitom, bez kompromisa.
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            Započnite besplatno
          </Link>
        </div>
      </section>

      {/* Trust section */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Naše obećanje privatnosti
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          Vaše uspomene nisu naš proizvod
        </p>
        <div className="mx-auto max-w-2xl">
          <ul className="grid gap-3 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-900/10"
              >
                <Check className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Privacy features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Kako štitimo vaše podatke
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PRIVACY_FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <f.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
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

      {/* GDPR Compliance */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Potpuna GDPR usklađenost
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              MyPhoto je dizajniran od temelja sa privatnošću na prvom mestu.
              Svaka funkcija je usklađena sa GDPR regulativom Evropske Unije.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Pravo na pristup svim vašim podacima
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Pravo na brisanje (pravo da budete zaboravljeni)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Pravo na portabilnost podataka (export jednim klikom)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  DPA (Data Processing Agreement) dostupan
                </span>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-8 text-center dark:from-green-900/20 dark:to-emerald-900/20">
            <Shield className="mx-auto mb-4 h-16 w-16 text-green-600 dark:text-green-400" />
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">
              GDPR Compliant
            </p>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              EU serveri &bull; AES-256 &bull; Zero-knowledge opcija
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Pitanja o privatnosti
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
      <section className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold">
          Zaštitite vaše uspomene danas
        </h2>
        <p className="mx-auto mb-6 max-w-md text-green-100">
          Privatni cloud storage sa GDPR zaštitom. Do 15GB besplatno.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-green-700 hover:bg-green-50"
        >
          Započnite besplatno
        </Link>
      </section>
    </>
  );
}
