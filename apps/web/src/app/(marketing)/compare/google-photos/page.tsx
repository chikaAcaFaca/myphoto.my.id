import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Cloud,
  Lock,
  Server,
  Check,
  Eye,
  Zap,
} from 'lucide-react';

export function generateMetadata(): Metadata {
  return {
    title: 'MyPhoto vs Google Photos: Why Switch? | MyPhoto',
    description:
      'Compare MyPhoto with Google Photos. Better privacy, EU servers, no AI training on your photos, original quality storage, and competitive pricing. The best Google Photos alternative.',
    alternates: {
      canonical: 'https://myphotomy.space/compare/google-photos',
    },
    openGraph: {
      title: 'MyPhoto vs Google Photos: Why Switch? | MyPhoto',
      description:
        'Compare MyPhoto with Google Photos. Better privacy, EU servers, original quality, and competitive pricing.',
      url: 'https://myphotomy.space/compare/google-photos',
      siteName: 'MyPhoto',
      type: 'website',
      locale: 'sr_RS',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: 'MyPhoto vs Google Photos Comparison',
        },
      ],
    },
  };
}

const FAQS = [
  {
    q: 'Why should I switch from Google Photos to MyPhoto?',
    a: 'MyPhoto offers genuine privacy - your photos are never used for AI training, stored on EU servers with GDPR compliance, and saved in original quality without compression. Google Photos compresses images in free tier and uses your data for advertising purposes.',
  },
  {
    q: 'Is MyPhoto cheaper than Google Photos?',
    a: 'MyPhoto offers competitive per-GB pricing at €0.017/GB compared to Google One at €0.021/GB. Our 150GB plan starts at €2.49/month, while Google offers 100GB for €2.10/month - making MyPhoto a better value per gigabyte.',
  },
  {
    q: 'Does Google Photos use my photos for AI training?',
    a: 'Google uses your data to improve their services, including AI models. MyPhoto never uses your photos for AI training. Your data remains yours and is only processed for features you explicitly enable.',
  },
  {
    q: 'Can I import my photos from Google Photos to MyPhoto?',
    a: 'Yes! You can export your photos from Google Takeout and upload them to MyPhoto. All photos are preserved in their original quality during the transfer process.',
  },
  {
    q: 'Does MyPhoto have AI features like Google Photos?',
    a: 'Yes! MyPhoto offers AI-powered smart search, auto-tagging, and face recognition - all available as an optional AI plan addon. The difference is that your photos are never used to train these models.',
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a,
        },
      })),
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
          name: 'Compare',
          item: 'https://myphotomy.space/compare',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'vs Google Photos',
          item: 'https://myphotomy.space/compare/google-photos',
        },
      ],
    },
  ],
};

const COMPARISON_ROWS = [
  {
    feature: 'Privatnost slika',
    myphoto: 'Nikad za AI trening',
    google: 'Koristi za poboljšanje servisa',
    winner: 'myphoto',
  },
  {
    feature: 'Lokacija servera',
    myphoto: 'EU (Frankfurt)',
    google: 'SAD (globalno)',
    winner: 'myphoto',
  },
  {
    feature: 'GDPR usklađenost',
    myphoto: 'Potpuna',
    google: 'Delimična',
    winner: 'myphoto',
  },
  {
    feature: 'Kvalitet čuvanja',
    myphoto: 'Original (bez kompresije)',
    google: 'Kompresovan u besplatnom planu',
    winner: 'myphoto',
  },
  {
    feature: 'Cena po GB',
    myphoto: '€0.017/GB',
    google: '€0.021/GB',
    winner: 'myphoto',
  },
  {
    feature: 'Besplatan plan',
    myphoto: 'Do 15 GB',
    google: '15 GB (deljen sa Gmail-om)',
    winner: 'google',
  },
  {
    feature: 'AI pretraga',
    myphoto: 'Da (opcioni AI plan)',
    google: 'Da (uključeno)',
    winner: 'tie',
  },
  {
    feature: 'Prepoznavanje lica',
    myphoto: 'Da (opcioni AI plan)',
    google: 'Da',
    winner: 'tie',
  },
  {
    feature: 'Family sharing',
    myphoto: 'Da (do 5 članova)',
    google: 'Da (do 5 članova)',
    winner: 'tie',
  },
  {
    feature: 'Skeniranje za reklame',
    myphoto: 'Ne',
    google: 'Da',
    winner: 'myphoto',
  },
];

const REASONS = [
  {
    icon: Shield,
    title: 'Privatnost na prvom mestu',
    description:
      'Google koristi vaše podatke za personalizaciju reklama. MyPhoto nikada ne skenira vaše slike niti deli podatke sa oglasivcima.',
  },
  {
    icon: Server,
    title: 'EU serveri, ne američki',
    description:
      'Vaši podaci su na serverima u Frankfurt-u, zaštićeni GDPR regulativom, a ne na US serverima podložnim CLOUD Act-u.',
  },
  {
    icon: Eye,
    title: 'Bez kompresije',
    description:
      'Google Photos kompresuje slike u besplatnom planu. MyPhoto čuva svaki piksel u originalnom kvalitetu.',
  },
  {
    icon: Zap,
    title: 'Bolja cena po GB',
    description:
      'MyPhoto nudi €0.017 po GB u odnosu na Google-ovih €0.021 po GB. Više prostora za manje novca.',
  },
];

export default function CompareGooglePhotosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            MyPhoto vs Google Photos: Why Switch?
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            Uporedite MyPhoto i Google Photos. Saznajte zašto sve više
            korisnika prelazi na privatniju alternativu.
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            Prebacite se danas
          </Link>
        </div>
      </section>

      {/* Why switch */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Zašto preći sa Google Photos-a?
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {REASONS.map((r) => (
            <article
              key={r.title}
              className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <r.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {r.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {r.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Detaljno poređenje
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Funkcija
                  </th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-center dark:border-gray-700">
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      MyPhoto
                    </span>
                  </th>
                  <th className="border-b-2 border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    Google Photos
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-gray-100 dark:border-gray-800"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          row.winner === 'myphoto'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {row.winner === 'myphoto' && (
                          <Check className="h-4 w-4" />
                        )}
                        {row.myphoto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm ${
                          row.winner === 'google'
                            ? 'font-medium text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {row.google}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
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
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-16 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">Prebacite se danas</h2>
        <p className="mx-auto mb-6 max-w-md text-primary-100">
          Pridružite se korisnicima koji su prešli sa Google Photos-a na
          privatniju alternativu. Do 15GB besplatno, bez obaveza.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-primary-50"
          >
            Započnite besplatno
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Pogledajte planove
          </Link>
        </div>
      </section>
    </>
  );
}
