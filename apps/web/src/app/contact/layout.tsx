import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt',
  description:
    'Kontaktirajte MyPhoto tim — pitanja o privatnom cloud storage-u, planovima, GDPR-u i podršci. Odgovaramo brzo, na srpskom i engleskom.',
  alternates: { canonical: 'https://myphotomy.space/contact' },
  openGraph: {
    title: 'Kontakt | MyPhoto',
    description: 'Pitanja o privatnom cloud storage-u, planovima i podršci. Javite nam se.',
    url: 'https://myphotomy.space/contact',
  },
};

export default function ContactLayout({ children }: { children: any }) {
  return children;
}
