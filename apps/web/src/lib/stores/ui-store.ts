import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  // Sidebar
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;

  // Modals
  isUploadModalOpen: boolean;
  isCreateAlbumModalOpen: boolean;
  isShareModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isDeleteConfirmModalOpen: boolean;
  isPricingModalOpen: boolean;

  // Lightbox
  lightboxFileId: string | null;
  isLightboxOpen: boolean;

  // Theme
  isDarkMode: boolean;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;

  // Notifications
  notifications: Notification[];

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  openUploadModal: () => void;
  closeUploadModal: () => void;
  openCreateAlbumModal: () => void;
  closeCreateAlbumModal: () => void;
  openShareModal: () => void;
  closeShareModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openDeleteConfirmModal: () => void;
  closeDeleteConfirmModal: () => void;
  openPricingModal: () => void;
  closePricingModal: () => void;

  openLightbox: (fileId: string) => void;
  closeLightbox: () => void;
  setLightboxFile: (fileId: string) => void;

  setDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  createdAt: Date;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      isSidebarOpen: true,
      isSidebarCollapsed: false,
      isUploadModalOpen: false,
      isCreateAlbumModalOpen: false,
      isShareModalOpen: false,
      isSettingsModalOpen: false,
      isDeleteConfirmModalOpen: false,
      isPricingModalOpen: false,
      lightboxFileId: null,
      isLightboxOpen: false,
      isDarkMode: false,
      isSearchOpen: false,
      searchQuery: '',
      notifications: [],

      // Sidebar actions
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

      // Modal actions
      openUploadModal: () => set({ isUploadModalOpen: true }),
      closeUploadModal: () => set({ isUploadModalOpen: false }),
      openCreateAlbumModal: () => set({ isCreateAlbumModalOpen: true }),
      closeCreateAlbumModal: () => set({ isCreateAlbumModalOpen: false }),
      openShareModal: () => set({ isShareModalOpen: true }),
      closeShareModal: () => set({ isShareModalOpen: false }),
      openSettingsModal: () => set({ isSettingsModalOpen: true }),
      closeSettingsModal: () => set({ isSettingsModalOpen: false }),
      openDeleteConfirmModal: () => set({ isDeleteConfirmModalOpen: true }),
      closeDeleteConfirmModal: () => set({ isDeleteConfirmModalOpen: false }),
      openPricingModal: () => set({ isPricingModalOpen: true }),
      closePricingModal: () => set({ isPricingModalOpen: false }),

      // Lightbox actions
      openLightbox: (fileId) => set({ lightboxFileId: fileId, isLightboxOpen: true }),
      closeLightbox: () => set({ isLightboxOpen: false, lightboxFileId: null }),
      setLightboxFile: (fileId) => set({ lightboxFileId: fileId }),

      // Theme actions
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Search actions
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Notification actions
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              ...notification,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
            },
          ],
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'myphoto-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
