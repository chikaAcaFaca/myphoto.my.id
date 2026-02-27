'use client';

import { useEffect } from 'react';
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
  FileText,
  Shield,
  Download,
  Crown,
  X,
} from 'lucide-react';
import { useUIStore, useAuthStore } from '@/lib/stores';
import { useStorage, usePWA, useIsMobile } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const mainNav = [
  { name: 'Slike', href: '/photos', icon: Image },
  { name: 'Video', href: '/videos', icon: Video },
  { name: 'Albumi', href: '/albums', icon: FolderOpen },
  { name: 'Omiljeno', href: '/favorites', icon: Heart },
  { name: 'Arhiva', href: '/archive', icon: Archive },
  { name: 'Uspomene', href: '/memories', icon: Clock },
];

const secondaryNav = [
  { name: 'Pretraga', href: '/search', icon: Search },
  { name: 'Osobe', href: '/people', icon: Users },
  { name: 'Duplikati', href: '/duplicates', icon: Copy },
];

const bottomNav = [
  { name: 'Podešavanja', href: '/settings', icon: Settings },
  { name: 'Pomoć', href: '/help', icon: HelpCircle },
  { name: 'Privatnost', href: '/privacy', icon: Shield },
  { name: 'Uslovi', href: '/terms', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, isSidebarCollapsed, setSidebarCollapsed, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { data: storage } = useStorage();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const isMobile = useIsMobile();

  // Auto-close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isCollapsed = isMobile ? false : isSidebarCollapsed;
  const showExpanded = !isCollapsed;

  // Mobile floating toggle button
  if (!isSidebarOpen && isMobile) {
    return (
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed left-0 top-1/2 z-40 -translate-y-1/2 rounded-r-lg bg-white p-2 shadow-lg dark:bg-gray-800 lg:hidden"
      >
        <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
    );
  }

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-gray-800',
          isMobile ? 'w-64' : isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          <Link href="/photos" className="flex items-center">
            {isCollapsed ? (
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
          {isMobile ? (
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
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
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={pathname === item.href}
                isCollapsed={isCollapsed}
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
                isCollapsed={isCollapsed}
              />
            ))}
          </div>

          <div className="my-4 h-px bg-gray-200 dark:bg-gray-700" />

          <NavItem
            item={{ name: 'Korpa', href: '/trash', icon: Trash2 }}
            isActive={pathname === '/trash'}
            isCollapsed={isCollapsed}
          />
        </nav>

        {/* Storage Usage */}
        {showExpanded && storage && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Skladište</span>
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
              {storage.usedFormatted} od {storage.limitFormatted}
            </p>
            {user?.subscriptionIds?.length === 0 ? (
              storage.percentage >= 70 ? (
                <Link
                  href="/checkout?tier=1&ai=false&period=monthly"
                  className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  <Crown className="h-4 w-4 flex-shrink-0" />
                  <span>Ostalo vam je {storage.remainingFormatted} — nadogradite od $2.49/mes</span>
                </Link>
              ) : (
                <Link
                  href="/checkout?tier=1&ai=false&period=monthly"
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary-500 hover:underline"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Nadogradi — 15x više prostora od $2.49/mes
                </Link>
              )
            ) : (
              <Link
                href="/settings/storage"
                className="mt-2 block text-xs text-primary-500 hover:underline"
              >
                Nadogradi skladište
              </Link>
            )}
          </div>
        )}

        {/* Upgrade hint (collapsed sidebar - desktop only) */}
        {isCollapsed && storage && user?.subscriptionIds?.length === 0 && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <Link
              href="/checkout?tier=1&ai=false&period=monthly"
              className="flex items-center justify-center rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              title="Nadogradi — 15x više prostora od $2.49/mes"
            >
              <Crown className="h-5 w-5" />
            </Link>
          </div>
        )}

        {/* PWA Install */}
        {isInstallable && !isInstalled && (
          <div className="border-t border-gray-200 p-4 dark:border-gray-700">
            <button
              onClick={() => {
                if (isIOS) {
                  window.location.href = '/settings';
                } else {
                  installApp();
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-100 active:scale-[0.97] dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30',
                isCollapsed && 'justify-center'
              )}
              title="Instaliraj aplikaciju"
            >
              <Download className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>Instaliraj</span>}
            </button>
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
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </div>
      </aside>
    </>
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
