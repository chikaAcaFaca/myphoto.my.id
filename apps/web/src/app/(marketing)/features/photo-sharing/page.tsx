import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Share2,
  Lock,
  Shield,
  Check,
  Eye,
  Cloud,
  Smartphone,
  Zap,
} from 'lucide-react';

export function generateMetadata(): Metadata {
  return {
    title: 'Share Albums Securely | MyPhoto',
    description:
      'Easy and secure photo sharing with password-protected albums, expiring links, and family sharing. Share your photos without compromising privacy.',
    alternates: {
      canonical: 'https://myphotomy.space/features/photo-sharing',
    },
    openGraph: {
      title: 'Share Albums Securely | MyPhoto',
      description:
        'Easy and secure photo sharing with password-protected albums, expiring links, and family sharing.',
      url: 'https://myphotomy.space/features/photo-sharing',
      siteName: 'MyPhoto',
      type: 'website',
      locale: 'sr_RS',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: 'MyPhoto - Secure Photo Sharing',
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
      name: 'MyPhoto',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Android, Web',
      description:
        'Secure photo sharing with password-protected albums, expiring links, and family sharing features.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
      url: 'https://myphotomy.space',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Pocetna',
          item: 'https://myphotomy.space',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Features',
          item: 'https://myphotomy.space/features',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Photo Sharing',
          item: 'https://myphotomy.space/features/photo-sharing',
        },
      ],
    },
  ],
};

const SHARING_FEATURES = [
  {
    icon: Share2,
    title: 'Deljenje albuma jednim klikom',
    description:
      'Kreirajte link za deljenje albuma sa porodicom i prijateljima. Bez potrebe da imaju nalog.',
  },
  {
    icon: Lock,
    title: 'Zaštita lozinkom',
    description:
      'Postavite lozinku na deljene albume za dodatni sloj sigurnosti i kontrole pristupa.',
  },
  {
    icon: Eye,
    title: 'Linkovi sa istekom',
    description:
      'Kreirajte linkove koji automatski ističu posle određenog vremena. Vi kontrolišete pristup.',
  },
  {
    icon: Shield,
    title: 'Kontrola pristupa',
    description:
      'Odredite ko može da pregleda, preuzme ili komentariše vaše slike. Potpuna kontrola u vašim rukama.',
  },
  {
    icon: Cloud,
    title: 'Deljenje u originalnom kvalitetu',
    description:
      'Slike se dele u punom, originalnom kvalitetu. Bez kompresije, bez gubitka detalja.',
  },
  {
    icon: Smartphone,
    title: 'Pregled na svim uređajima',
    description:
      'Deljeni albumi se prikazuju savršeno na telefonu, tabletu i desktop-u.',
  },
];

const FAMILY_FEATURES = [
  'Dodajte do 5 članova porodice',
  'Svako ima privatni prostor za slike',
  'Deljeni porodični album',
  'Jednostavno upravljanje članovima',
  '€2/mesečno po dodatnom članu',
  'Zajednički storage pool',
];

const SHARING_STEPS = [
  {
    step: 1,
    title: 'Izaberite slike ili album',
    description: 'Odaberite slike koje želite da podelite ili kreirajte novi album.',
  },
  {
    step: 2,
    title: 'Podesite pristup',
    description: 'Odaberite ko može da vidi slike, postavite lozinku ili istek linka.',
  },
  {
    step: 3,
    title: 'Podelite link',
    description: 'Pošaljite link putem poruke, emaila ili društvenih mreža.',
  },
];

export default function PhotoSharingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <Share2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Share Albums Securely
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            Delite vaše najlepše trenutke sa porodicom i prijateljima, bez
            kompromisa oko privatnosti i kvaliteta.
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            Započnite besplatno
          </Link>
        </div>
      </section>

      {/* How sharing works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Kako funkcioniše deljenje?
        </h2>
        <p className="mb-12 text-center text-gray-600 dark:text-gray-300">
          Tri jednostavna koraka do sigurnog deljenja
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {SHARING_STEPS.map((s) => (
            <article
              key={s.step}
              className="rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-gray-800"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-xl font-bold text-white">
                {s.step}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {s.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {s.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Sharing features */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Funkcije deljenja
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SHARING_FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <f.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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

      {/* Family sharing */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Porodično deljenje
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Pozovite članove porodice da dele storage dok svako zadržava
              privatnost svojih slika. Zajednički porodični album za
              najlepše momente.
            </p>
            <ul className="space-y-3">
              {FAMILY_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3"
                >
                  <Check className="h-5 w-5 flex-shrink-0 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100 p-8 text-center dark:from-blue-900/20 dark:to-sky-900/20">
            <Zap className="mx-auto mb-4 h-16 w-16 text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
              Family Sharing
            </p>
            <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
              Do 5 članova &bull; Privatni prostori &bull; Zajednički album
            </p>
          </div>
        </div>
      </section>

      {/* Access control */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
            Potpuna kontrola pristupa
          </h2>
          <p className="mb-12 text-gray-600 dark:text-gray-300">
            Vi odlučujete ko vidi vaše slike i koliko dugo
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Lock className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Zaštita lozinkom
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Samo osobe sa lozinkom mogu pristupiti deljenom albumu.
                Lozinku možete promeniti ili ukloniti u bilo kom trenutku.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Eye className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Istek linka
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Linkovi za deljenje mogu imati datum isteka. Posle tog
                datuma, link prestaje da radi automatski.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Shield className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Dozvole za preuzimanje
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Kontrolišite da li primaoci mogu da preuzmu originalne
                slike ili samo da ih pregledaju online.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 text-left shadow-md dark:bg-gray-800">
              <Share2 className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                Opoziv pristupa
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Opozovite pristup bilo kada jednim klikom. Deljeni link
                odmah prestaje da radi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-blue-500 to-sky-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold">
          Počnite da delite uspomene
        </h2>
        <p className="mx-auto mb-6 max-w-md text-blue-100">
          Sigurno deljenje slika sa porodicom i prijateljima. Do 15GB besplatno.
        </p>
        <Link
          href="/register"
          className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
        >
          Započnite besplatno
        </Link>
      </section>
    </>
  );
}
