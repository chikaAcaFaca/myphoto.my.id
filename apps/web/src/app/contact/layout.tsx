import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('pages.contact.meta.title'),
    description: t('pages.contact.meta.description'),
    alternates: { canonical: 'https://myphotomy.space/contact' },
    openGraph: {
      title: t('pages.contact.meta.ogTitle'),
      description: t('pages.contact.meta.ogDescription'),
      url: 'https://myphotomy.space/contact',
    },
  };
}

export default function ContactLayout({ children }: { children: any }) {
  return children;
}
