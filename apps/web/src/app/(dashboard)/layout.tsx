'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useUIStore, useFilesStore } from '@/lib/stores';
import { useIsMobile } from '@/lib/hooks';
import { getIdToken } from '@/lib/firebase';
import { syncSettingsToIDB, refreshStaleTokens, requestBackgroundSync } from '@/lib/upload-queue';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { UploadModal } from '@/components/modals/upload-modal';
import { CreateAlbumModal } from '@/components/modals/create-album-modal';
import { PhotoLightbox } from '@/components/gallery/photo-lightbox';
import { Notifications } from '@/components/ui/notifications';
import { UploadToast } from '@/components/upload/upload-toast';
import { PWAPrompt } from '@/components/pwa/pwa-prompt';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuthStore();
  const { isSidebarOpen, isSidebarCollapsed, setSidebarOpen } = useUIStore();
  const { clearLocalThumbnails } = useFilesStore();
  const isMobile = useIsMobile();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Auto-open sidebar on desktop, keep closed on mobile
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile, setSidebarOpen]);

  // Cleanup local thumbnails on unmount
  useEffect(() => {
    return () => clearLocalThumbnails();
  }, [clearLocalThumbnails]);

  // Sync user settings to IndexedDB for SW access
  useEffect(() => {
    if (!user?.settings) return;
    const { syncMode, allowRoaming, autoBackup } = user.settings;
    syncSettingsToIDB({ syncMode, allowRoaming, autoBackup });
  }, [user?.settings]);

  // Listen for background-upload-complete events from SW
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    };
    window.addEventListener('background-upload-complete', handler);
    return () => window.removeEventListener('background-upload-complete', handler);
  }, [queryClient]);

  // On visibility change, refresh stale tokens and re-trigger sync
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const updated = await refreshStaleTokens(token);
        if (updated) {
          await requestBackgroundSync();
        }
      } catch {
        // Non-fatal
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
          isMobile ? 'ml-0' : isSidebarOpen ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : 'ml-0'
        }`}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Modals */}
      <UploadModal />
      <CreateAlbumModal />
      <PhotoLightbox />

      {/* Upload progress toast */}
      <UploadToast />

      {/* Notifications */}
      <Notifications />

      {/* PWA install prompt & offline indicator */}
      <PWAPrompt />
    </div>
  );
}
