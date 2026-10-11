'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flame, Images, Plus, MessageCircle, UserRound, type LucideIcon } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { useInboxBadge } from '@/lib/hooks/use-inbox';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/client';

const PHOTO_ROUTES = ['/photos', '/albums', '/myspace', '/videos', '/favorites', '/people', '/memories', '/search', '/duplicates', '/trash', '/archive'];

/**
 * The app's tab bar on phones: Mimovi · Slike · [+] · Inbox · Ja.
 * `dark` is the Meme Wall variant (over the black feed). On the Meme Wall the
 * + makes a meme; everywhere else it uploads.
 */
export function MobileBottomNav({ dark = false }: { dark?: boolean }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { openUploadModal } = useUIStore();
  const unread = useInboxBadge((s) => s.activity + s.messages);
  const t = useT();

  const isMeme = pathname.startsWith('/meme-wall') || pathname.startsWith('/meme-creator');

  const tab = (href: string, label: string, Icon: LucideIcon, active: boolean, opts: { flame?: boolean; badge?: number } = {}) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="relative flex min-w-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1"
    >
      <span className="relative">
        <Icon
          className={cn(
            'h-6 w-6',
            opts.flame
              ? 'text-flame'
              : active
                ? dark ? 'text-white' : 'text-primary-500 dark:text-[#7B98FF]'
                : dark ? 'text-[#A3A7B0]' : 'text-[#8A8F99]'
          )}
          strokeWidth={active ? 2.4 : 2}
          fill={opts.flame && active ? 'currentColor' : 'none'}
        />
        {opts.badge ? (
          <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10px] font-bold leading-none text-white">
            {opts.badge > 99 ? '99+' : opts.badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-[11px]',
          active ? 'font-bold' : 'font-medium',
          active
            ? opts.flame ? 'text-flame' : dark ? 'text-white' : 'text-primary-500 dark:text-[#7B98FF]'
            : dark ? 'text-[#A3A7B0]' : 'text-[#8A8F99]'
        )}
      >
        {label}
      </span>
    </Link>
  );

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t pb-[env(safe-area-inset-bottom)] lg:hidden',
        dark ? 'z-50' : 'z-40',
        dark
          ? 'border-white/10 bg-[#111214]'
          : 'border-[#E7E7E3] bg-white dark:border-white/10 dark:bg-[#1B1D21]'
      )}
    >
      <div className="mx-auto flex h-[60px] max-w-xl items-center px-1">
        {tab('/meme-wall', t('pages.inbox.tabs.feed'), Flame, isMeme, { flame: true })}
        {tab('/photos', t('pages.inbox.tabs.photos'), Images, PHOTO_ROUTES.some((r) => pathname.startsWith(r)))}

        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={() => (dark ? router.push('/meme-creator') : openUploadModal())}
            aria-label={dark ? t('pages.inbox.create') : t('pages.inbox.tabs.upload')}
            className={cn(
              'flex h-10 w-14 items-center justify-center rounded-2xl transition-transform active:scale-95',
              dark ? 'bg-white text-[#111214]' : 'bg-[#16181D] text-white dark:bg-white dark:text-[#111214]'
            )}
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </button>
        </div>

        {tab('/inbox', t('pages.inbox.tabs.inbox'), MessageCircle, pathname.startsWith('/inbox'), { badge: unread })}
        {tab('/settings', t('pages.inbox.tabs.me'), UserRound, pathname.startsWith('/settings'))}
      </div>
    </nav>
  );
}
