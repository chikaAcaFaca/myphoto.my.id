import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

// Transactional page — should not be indexed by search engines.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.checkout.meta.title'),
    description: t('pages.checkout.meta.description'),
    robots: { index: false, follow: false },
    alternates: { canonical: 'https://myphotomy.space/checkout' },
  };
}

export default function CheckoutLayout({ children }: { children: any }) {
  return children;
}
