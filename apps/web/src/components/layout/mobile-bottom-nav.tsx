'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Settings, CloudUpload } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Home', href: '/photos', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  // Upload FAB goes here (index 2)
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openUploadModal } = useUIStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-700 dark:bg-gray-800 lg:hidden">
      <div className="flex h-[60px] items-center justify-around px-4">
        {/* Home */}
        <button
          onClick={() => router.push(tabs[0].href)}
          className="flex flex-col items-center gap-1"
        >
          <Home
            className={cn(
              'h-6 w-6',
              pathname === '/photos' || pathname === '/'
                ? 'text-primary-500'
                : 'text-gray-400'
            )}
          />
          <span
            className={cn(
              'text-[10px] font-medium',
              pathname === '/photos' || pathname === '/'
                ? 'text-primary-500'
                : 'text-gray-400'
            )}
          >
            Home
          </span>
        </button>

        {/* Search */}
        <button
          onClick={() => router.push(tabs[1].href)}
          className="flex flex-col items-center gap-1"
        >
          <Search
            className={cn(
              'h-6 w-6',
              pathname === '/search' ? 'text-primary-500' : 'text-gray-400'
            )}
          />
          <span
            className={cn(
              'text-[10px] font-medium',
              pathname === '/search' ? 'text-primary-500' : 'text-gray-400'
            )}
          >
            Search
          </span>
        </button>

        {/* Upload FAB */}
        <button
          onClick={openUploadModal}
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-transform active:scale-95"
        >
          <CloudUpload className="h-7 w-7" />
        </button>

        {/* Settings */}
        <button
          onClick={() => router.push(tabs[2].href)}
          className="flex flex-col items-center gap-1"
        >
          <Settings
            className={cn(
              'h-6 w-6',
              pathname?.startsWith('/settings')
                ? 'text-primary-500'
                : 'text-gray-400'
            )}
          />
          <span
            className={cn(
              'text-[10px] font-medium',
              pathname?.startsWith('/settings')
                ? 'text-primary-500'
                : 'text-gray-400'
            )}
          >
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
}
