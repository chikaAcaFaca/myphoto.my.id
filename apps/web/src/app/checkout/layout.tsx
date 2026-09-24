import type { Metadata } from 'next';

// Transactional page — should not be indexed by search engines.
export const metadata: Metadata = {
  title: 'Plaćanje',
  description: 'Bezbedno dovršite kupovinu MyPhoto plana.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://myphotomy.space/checkout' },
};

export default function CheckoutLayout({ children }: { children: any }) {
  return children;
}
