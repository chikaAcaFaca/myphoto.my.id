import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.support.meta.title'),
    description: t('pages.support.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/support' },
    openGraph: {
      title: t('pages.support.meta.ogTitle'),
      description: t('pages.support.meta.ogDescription'),
      url: 'https://myphotomy.space/support',
    },
  };
}

export default function SupportLayout({ children }: { children: any }) {
  return children;
}
