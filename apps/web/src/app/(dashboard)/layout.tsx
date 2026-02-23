'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/lib/stores';
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
  const { isSidebarOpen, isSidebarCollapsed } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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
          isSidebarOpen ? (isSidebarCollapsed ? 'ml-20' : 'ml-64') : 'ml-0'
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
