import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Podrška i pomoć',
  description:
    'Pomoć i podrška za MyPhoto — uputstva za backup fotografija, deljenje albuma, plaćanje i privatnost. Pronađite odgovore ili kontaktirajte naš tim.',
  alternates: { canonical: 'https://myphotomy.space/support' },
  openGraph: {
    title: 'Podrška i pomoć | MyPhoto',
    description: 'Uputstva za backup, deljenje albuma, plaćanje i privatnost. Tu smo da pomognemo.',
    url: 'https://myphotomy.space/support',
  },
};

export default function SupportLayout({ children }: { children: any }) {
  return children;
}
