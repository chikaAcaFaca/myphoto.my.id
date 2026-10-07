import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.pricing.meta.title'),
    description: t('pages.pricing.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/pricing' },
    openGraph: {
      title: t('pages.pricing.meta.ogTitle'),
      description: t('pages.pricing.meta.ogDescription'),
      url: 'https://myphotomy.space/pricing',
    },
  };
}

export default function PricingLayout({ children }: { children: any }) {
  return children;
}
