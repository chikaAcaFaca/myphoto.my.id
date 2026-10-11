'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Upload,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  Settings,
  User,
  Download,
} from 'lucide-react';
import { useAuthStore, useUIStore, useFilesStore } from '@/lib/stores';
import { usePWA } from '@/lib/hooks/use-pwa';
import { useInboxBadge } from '@/lib/hooks/use-inbox';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/client';
import { LanguageSwitcher } from './language-switcher';

export function Header() {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { searchQuery, setSearchQuery, openSearch, closeSearch, isSearchOpen } = useUIStore();
  const { isDarkMode, toggleDarkMode, openUploadModal, toggleSidebar, isSidebarOpen } = useUIStore();
  const { user, signOut } = useAuthStore();
  const { selectedFiles, deselectAll } = useFilesStore();
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const router = useRouter();
  const unread = useInboxBadge((s) => s.activity + s.messages);
  const t = useT();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape' && isSearchFocused) {
        searchRef.current?.blur();
        setSearchQuery('');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused, setSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-canvas-light px-4 dark:bg-canvas-dark lg:h-16 lg:border-b lg:border-gray-200 lg:bg-white lg:dark:border-gray-700 lg:dark:bg-gray-800">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          aria-label={t('components.header.menu')}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Selection mode */}
        {selectedFiles.size > 0 ? (
          <div className="flex items-center gap-4">
            <button
              onClick={deselectAll}
              aria-label={t('components.header.clearSelection')}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium">
              {t('components.header.selectedCount', { count: selectedFiles.size })}
            </span>
          </div>
        ) : (
          <>
          {/* Phones: the app's wordmark; search lives under Slike */}
          <Link href="/meme-wall" className="font-display text-[24px] font-extrabold tracking-tight text-ink dark:text-white md:hidden">
            MyPhoto
          </Link>
          {/* Search */}
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder={t('components.header.searchPlaceholder')}
              className={cn(
                'w-64 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm transition-all focus:w-96 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-700 dark:focus:bg-gray-600',
                isSearchFocused && 'w-96'
              )}
            />
            {!isSearchFocused && (
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-gray-300 bg-gray-100 px-1.5 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 lg:inline-block">
                Ctrl+K
              </kbd>
            )}
          </form>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Mobile search button — hidden, bottom nav handles search */}
        <button
          onClick={openSearch}
          aria-label={t('components.header.search')}
          className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Upload button */}
        <button
          onClick={openUploadModal}
          className="btn-primary hidden sm:flex"
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('components.header.upload')}
        </button>
        <button
          onClick={openUploadModal}
          aria-label={t('components.header.upload')}
          className="hidden rounded-lg bg-primary-500 p-2 text-white hover:bg-primary-600"
        >
          <Upload className="h-5 w-5" />
        </button>

        {/* Install PWA button */}
        {isInstallable && !isInstalled && (
          <button
            onClick={() => {
              if (isIOS) {
                // iOS: redirect to settings which has install instructions
                router.push('/settings');
              } else {
                installApp();
              }
            }}
            className="hidden items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-all hover:bg-primary-100 active:scale-95 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400 sm:flex"
            title={t('components.header.installApp')}
          >
            <Download className="h-3.5 w-3.5" />
            {t('components.header.install')}
          </button>
        )}

        <div className="hidden lg:block">
          <LanguageSwitcher />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="hidden rounded-lg p-2 lg:inline-flex text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={isDarkMode ? t('components.header.lightMode') : t('components.header.darkMode')}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        {/* Inbox (phones use the tab bar) */}
        <Link href="/inbox" aria-label={t('components.header.notifications')} className="relative hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:inline-flex">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative hidden lg:block" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white py-2 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  {t('components.header.settings')}
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/settings');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <User className="h-4 w-4" />
                  {t('components.header.account')}
                </button>
              </div>
              <div className="border-t border-gray-100 py-1 dark:border-gray-700">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  {t('components.header.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
