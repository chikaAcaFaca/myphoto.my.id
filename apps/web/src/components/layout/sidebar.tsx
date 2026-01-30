'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Image,
  Video,
  FolderOpen,
  Heart,
  Trash2,
  Archive,
  Clock,
  Users,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
} from 'lucide-react';
import { useUIStore, useAuthStore } from '@/lib/stores';
import { useStorage } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const mainNav = [
  { name: 'Photos', href: '/photos', icon: Image },
  { name: 'Videos', href: '/videos', icon: Video },
  { name: 'Albums', href: '/albums', icon: FolderOpen },
  { name: 'Favorites', href: '/favorites', icon: Heart },
  { name: 'Archive', href: '/archive', icon: Archive },
  { name: 'Memories', href: '/memories', icon: Clock },
];

const secondaryNav = [
  { name: 'Search', href: '/search', icon: Search },
  { name: 'People', href: '/people', icon: Users },
  { name: 'Duplicates', href: '/duplicates', icon: Copy },
];

const bottomNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, isSidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { user } = useAuthStore();
  const { data: storage } = useStorage();

  if (!isSidebarOpen) return null;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800',
        isSidebarCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <Link href="/photos" className="flex items-center">
          {isSidebarCollapsed ? (
            <NextImage
              src="/logo.png"
              alt="MyPhoto"
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          ) : (
            <NextImage
              src="/logo.png"
              alt="MyPhoto.my.id"
              width={225}
              height={60}
              className="h-14 w-auto"
            />
          )}
        </Link>
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {mainNav.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
        </div>

        <div className="my-4 h-px bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-1">
          {secondaryNav.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
        </div>

        <div className="my-4 h-px bg-gray-200 dark:bg-gray-700" />

        <NavItem
          item={{ name: 'Trash', href: '/trash', icon: Trash2 }}
          isActive={pathname === '/trash'}
          isCollapsed={isSidebarCollapsed}
        />
      </nav>

      {/* Storage Usage */}
      {!isSidebarCollapsed && storage && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Storage</span>
            <span className="font-medium">{storage.percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                storage.percentage > 90
                  ? 'bg-red-500'
                  : storage.percentage > 70
                  ? 'bg-yellow-500'
                  : 'bg-primary-500'
              )}
              style={{ width: `${storage.percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {storage.usedFormatted} of {storage.limitFormatted} used
          </p>
          <Link
            href="/settings/storage"
            className="mt-2 block text-xs text-primary-500 hover:underline"
          >
            Upgrade storage
          </Link>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="space-y-1">
          {bottomNav.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  item,
  isActive,
  isCollapsed,
}: {
  item: { name: string; href: string; icon: any };
  isActive: boolean;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
        isCollapsed && 'justify-center'
      )}
      title={isCollapsed ? item.name : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span>{item.name}</span>}
    </Link>
  );
}
