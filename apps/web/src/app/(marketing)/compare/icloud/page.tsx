import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Cloud,
  Lock,
  Server,
  Check,
  Smartphone,
  Zap,
} from 'lucide-react';

export function generateMetadata(): Metadata {
  return {
    title: 'MyPhoto vs iCloud: Cross-Platform Freedom | MyPhoto',
    description:
      'Compare MyPhoto with iCloud Photos. Cross-platform freedom, better pricing per GB, EU servers, and no vendor lock-in. The best iCloud alternative for photos.',
    alternates: {
      canonical: 'https://myphotomy.space/compare/icloud',
    },
    openGraph: {
      title: 'MyPhoto vs iCloud: Cross-Platform Freedom | MyPhoto',
      description:
        'Compare MyPhoto with iCloud Photos. Cross-platform support, EU servers, better per-GB pricing.',
      url: 'https://myphotomy.space/compare/icloud',
      siteName: 'MyPhoto',
      type: 'website',
      locale: 'sr_RS',
      images: [
        {
          url: 'https://myphotomy.space/og-image.png',
          width: 1200,
          height: 630,
          alt: 'MyPhoto vs iCloud Comparison',
        },
      ],
    },
  };
}

const FAQS = [
  {
    q: 'Can I use MyPhoto on both Android and iPhone?',
    a: 'Yes! Unlike iCloud which is limited to Apple devices, MyPhoto works on Android, iOS (web), and any device with a web browser. True cross-platform freedom.',
  },
  {
    q: 'Is MyPhoto cheaper than iCloud?',
    a: 'MyPhoto offers €0.017/GB compared to iCloud at €0.020/GB. Plus, MyPhoto provides more flexible storage tiers from 150GB to 10TB, while iCloud jumps from 50GB to 200GB with fewer options.',
  },
  {
    q: 'Can I transfer my photos from iCloud to MyPhoto?',
    a: 'Yes! Download your photos from iCloud (via icloud.com or Apple Data & Privacy) and upload them to MyPhoto. All originals are preserved without quality loss.',
  },
  {
    q: 'Does MyPhoto work on Windows and Linux?',
    a: 'Yes! MyPhoto has a full web app that works perfectly on Windows, Linux, macOS, and any modern browser. No Apple device required.',
  },
  {
    q: 'What happens if I switch from iPhone to Android?',
    a: 'With iCloud, switching to Android means losing easy access to your photos. With MyPhoto, your photos are always accessible from any device, making platform switches seamless.',
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
          name: 'vs iCloud',
          item: 'https://myphotomy.space/compare/icloud',
        },
      ],
    },
  ],
};

const COMPARISON_ROWS = [
  {
    feature: 'Cross-platform podrška',
    myphoto: 'Android, Web, svi pregledači',
    icloud: 'Samo Apple uređaji',
    winner: 'myphoto',
  },
  {
    feature: 'Cena po GB',
    myphoto: '€0.017/GB',
    icloud: '€0.020/GB',
    winner: 'myphoto',
  },
  {
    feature: 'Početni plan',
    myphoto: '150 GB — €2.49/mes',
    icloud: '50 GB — €0.99/mes',
    winner: 'tie',
  },
  {
    feature: 'Lokacija servera',
    myphoto: 'EU (Frankfurt)',
    icloud: 'SAD / globalno',
    winner: 'myphoto',
  },
  {
    feature: 'GDPR usklađenost',
    myphoto: 'Potpuna',
    icloud: 'Delimična',
    winner: 'myphoto',
  },
  {
    feature: 'Privatnost — AI trening',
    myphoto: 'Nikad za AI trening',
    icloud: 'Ne koristi za AI trening',
    winner: 'tie',
  },
  {
    feature: 'Kvalitet čuvanja',
    myphoto: 'Original kvalitet',
    icloud: 'Original kvalitet',
    winner: 'tie',
  },
  {
    feature: 'Vendor lock-in',
    myphoto: 'Nema — export jednim klikom',
    icloud: 'Vezan za Apple ekosistem',
    winner: 'myphoto',
  },
  {
    feature: 'Family sharing',
    myphoto: 'Da (do 5 članova)',
    icloud: 'Da (do 5 članova)',
    winner: 'tie',
  },
  {
    feature: 'Windows / Linux pristup',
    myphoto: 'Da (pun web app)',
    icloud: 'Ograničen (samo web)',
    winner: 'myphoto',
  },
];

const ADVANTAGES = [
  {
    icon: Smartphone,
    title: 'Radi na svim uređajima',
    description:
      'Pristupite svojim slikama sa Android-a, Windows-a, Linux-a ili bilo kog pregledača. Bez Apple ograničenja.',
  },
  {
    icon: Lock,
    title: 'Bez vendor lock-in',
    description:
      'Promenite telefon, operativni sistem ili platformu kada god želite. Vaše slike su uvek dostupne.',
  },
  {
    icon: Server,
    title: 'EU serveri',
    description:
      'Podaci na serverima u Frankfurt-u, zaštićeni GDPR regulativom. iCloud čuva podatke pretežno u SAD.',
  },
  {
    icon: Zap,
    title: 'Bolja cena po GB',
    description:
      'MyPhoto nudi €0.017 po GB, u poređenju sa iCloud-ovih €0.020 po GB. Više prostora za vaš novac.',
  },
];

export default function CompareICloudPage() {
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
            MyPhoto vs iCloud: Cross-Platform Freedom
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-600 dark:text-gray-300">
            Oslobodite se Apple ekosistema. Pristupite vašim slikama sa bilo
            kog uređaja, uz bolju cenu i EU zaštitu podataka.
          </p>
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            Prebacite se danas
          </Link>
        </div>
      </section>

      {/* Advantages */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-900 dark:text-white">
          Zašto izabrati MyPhoto umesto iCloud-a?
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {ADVANTAGES.map((a) => (
            <article
              key={a.title}
              className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <a.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                {a.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {a.description}
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
                    iCloud
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
                          row.winner === 'icloud'
                            ? 'font-medium text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {row.icloud}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Cross-platform highlight */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-3xl font-bold">
                Sloboda bez ograničenja
              </h2>
              <p className="mb-6 text-primary-100">
                Sa iCloud-om, vaše slike su zaključane u Apple ekosistemu.
                Prelazak na Android znači komplikovan transfer i gubitak
                pristupa. Sa MyPhoto-om, vaše slike su uvek dostupne sa
                bilo kog uređaja.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary-200" />
                  Android aplikacija
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary-200" />
                  Pun web app (Windows, Linux, macOS)
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary-200" />
                  Export svih podataka jednim klikom
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary-200" />
                  Bez ugovorne obaveze
                </li>
              </ul>
            </div>
            <div className="text-center">
              <Cloud className="mx-auto mb-4 h-20 w-20 text-white/80" />
              <p className="text-xl font-bold">Bilo koji uređaj.</p>
              <p className="text-xl font-bold">Bilo kad.</p>
              <p className="text-xl font-bold">Bilo gde.</p>
            </div>
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
          Oslobodite vaše slike iz Apple ekosistema. Cross-platform pristup,
          EU serveri, do 15GB besplatno.
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
