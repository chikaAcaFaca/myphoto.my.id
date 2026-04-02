import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'MyPhoto — Private Cloud Photo Storage & Backup',
    template: '%s | MyPhoto',
  },
  description:
    'Free private photo storage with auto backup. Store photos in original quality on EU servers with GDPR protection. Google Photos alternative with no AI training on your data. Up to 15GB free.',
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
    url: 'https://myphotomy.space',
    siteName: 'MyPhoto',
    title: 'MyPhoto — Private Cloud Photo Storage & Backup',
    description:
      'Free private photo storage with auto backup. Original quality, EU servers, GDPR protection. No AI training on your photos. Up to 15GB free.',
    images: [
      {
        url: 'https://myphotomy.space/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MyPhoto — Private Cloud Photo Storage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MyPhoto — Private Cloud Photo Storage & Backup',
    description:
      'Free private photo storage with auto backup. Original quality, EU servers, GDPR protection. Up to 15GB free.',
    images: ['https://myphotomy.space/og-image.png'],
  },
  alternates: {
    canonical: 'https://myphotomy.space',
    languages: {
      'sr': 'https://myphotomy.space',
      'en': 'https://myphotomy.space',
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
      name: 'MyPhoto',
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Web, Android',
      offers: [
        {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Up to 15GB free storage with auto backup',
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
      url: 'https://myphotomy.space',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1200',
      },
      featureList: 'Auto backup, Original quality, EU servers, GDPR compliance, AI search, Album sharing',
    },
    {
      '@type': 'Organization',
      name: 'MyPhoto',
      url: 'https://myphotomy.space',
      logo: 'https://myphotomy.space/logo.png',
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: 'https://myphotomy.space/support',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: any;
}) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
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
