import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'MyPhoto.my.id — Privatni Cloud za Vaše Slike',
  description:
    'Čuvajte, organizujte i delite slike i video zapise u privatnom cloud-u sa AI funkcijama. Bez kompresije, EU serveri, GDPR zaštita. 10GB besplatno.',
  keywords: [
    'cloud storage za slike',
    'privatni photo storage',
    'backup slika',
    'deljenje slika',
    'privatnost fotografija',
    'AI pretraga slika',
    'GDPR cloud storage',
    'EU serveri za slike',
  ],
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: 'https://myphoto.my.id',
    siteName: 'MyPhoto.my.id',
    title: 'MyPhoto.my.id — Privatni Cloud za Vaše Slike',
    description:
      'Čuvajte slike u originalnom kvalitetu. AI pretraga, EU serveri, GDPR zaštita. 10GB besplatno.',
    images: [
      {
        url: 'https://myphoto.my.id/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MyPhoto.my.id — Privatni Cloud za Vaše Slike',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyPhoto.my.id — Privatni Cloud za Vaše Slike',
    description:
      'Čuvajte slike u originalnom kvalitetu. AI pretraga, EU serveri, GDPR zaštita. 10GB besplatno.',
    images: ['https://myphoto.my.id/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'MyPhoto.my.id',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: '10GB besplatno, bez kreditne kartice',
      },
      description:
        'Privatni cloud storage za slike sa AI pretragom, originalnim kvalitetom i GDPR zaštitom.',
      url: 'https://myphoto.my.id',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1200',
      },
    },
    {
      '@type': 'Organization',
      name: 'MyPhoto.my.id',
      url: 'https://myphoto.my.id',
      logo: 'https://myphoto.my.id/logo.png',
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: 'https://myphoto.my.id/support',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
