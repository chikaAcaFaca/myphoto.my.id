import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'MyPhoto.my.id — Private Cloud Photo Storage & Backup',
    template: '%s | MyPhoto.my.id',
  },
  description:
    'Free private photo storage with auto backup. Store photos in original quality on EU servers with GDPR protection. Google Photos alternative with no AI training on your data. 5GB free.',
  keywords: [
    'google photos alternative',
    'photo backup app',
    'best free photo storage',
    'auto backup photos to cloud',
    'private photo storage',
    'GDPR photo storage',
    'cloud storage za slike',
    'privatni photo storage',
    'backup slika',
    'bekap slika sa telefona',
    'čuvanje slika u oblaku',
    'privatno skladište za slike',
    'automatski backup fotografija',
  ],
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: 'https://myphoto.my.id',
    siteName: 'MyPhoto.my.id',
    title: 'MyPhoto.my.id — Private Cloud Photo Storage & Backup',
    description:
      'Free private photo storage with auto backup. Original quality, EU servers, GDPR protection. No AI training on your photos. 5GB free.',
    images: [
      {
        url: 'https://myphoto.my.id/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MyPhoto.my.id — Private Cloud Photo Storage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyPhoto.my.id — Private Cloud Photo Storage & Backup',
    description:
      'Free private photo storage with auto backup. Original quality, EU servers, GDPR protection. 5GB free.',
    images: ['https://myphoto.my.id/og-image.png'],
  },
  alternates: {
    canonical: 'https://myphoto.my.id',
    languages: {
      'sr': 'https://myphoto.my.id',
      'en': 'https://myphoto.my.id',
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'MyPhoto.my.id',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web, Android',
      offers: [
        {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: '5GB free storage with auto backup',
        },
        {
          '@type': 'Offer',
          price: '2.49',
          priceCurrency: 'USD',
          description: '150GB Starter plan',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            billingDuration: 'P1M',
          },
        },
      ],
      description:
        'Private cloud photo storage with auto backup, original quality, EU servers, and GDPR protection. Google Photos alternative.',
      url: 'https://myphoto.my.id',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1200',
      },
      featureList: 'Auto backup, Original quality, EU servers, GDPR compliance, AI search, Album sharing',
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
