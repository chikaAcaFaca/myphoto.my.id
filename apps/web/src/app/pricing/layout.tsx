import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cenovnik i planovi',
  description:
    'MyPhoto planovi za privatni cloud storage fotografija — od 2,5GB besplatno do 2TB. Original kvalitet, EU serveri, GDPR zaštita. Bez ugovora, otkaži bilo kada.',
  alternates: { canonical: 'https://myphotomy.space/pricing' },
  openGraph: {
    title: 'Cenovnik i planovi | MyPhoto',
    description:
      'Privatni cloud storage od 2,5GB besplatno do 2TB. Original kvalitet, EU serveri, GDPR. Bez ugovora.',
    url: 'https://myphotomy.space/pricing',
  },
};

export default function PricingLayout({ children }: { children: any }) {
  return children;
}
