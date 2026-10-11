'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/client';

const LIBRARIES = [
  { href: '/photos', label: 'components.sidebar.photos' },
  { href: '/albums', label: 'components.sidebar.albums' },
  { href: '/myspace', label: 'components.sidebar.mySpace' },
] as const;

/** Phones: Slike | Albumi | MySpace under the Slike tab, as in the app. */
export function LibrarySwitcher() {
  const pathname = usePathname() || '';
  const t = useT();
  if (!LIBRARIES.some((l) => pathname === l.href)) return null;
  return (
    <div className="px-3 pb-2 lg:hidden">
      <div className="flex gap-1 rounded-full bg-[#F0F0EC] p-1 dark:bg-[#1B1D21]">
        {LIBRARIES.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-full text-sm font-bold transition-colors',
                active ? 'bg-white text-ink shadow-sm dark:bg-[#2A2D33] dark:text-white' : 'text-[#5E6470] dark:text-[#A3A7B0]'
              )}
            >
              {t(l.label)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
