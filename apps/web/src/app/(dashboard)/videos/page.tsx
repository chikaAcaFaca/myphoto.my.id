'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Play, Grid, List, Trash2, Share2, FolderPlus } from 'lucide-react';
import { useFiles, useUploadFile, useBulkDeleteFiles } from '@/lib/hooks';
import { useShareFile } from '@/lib/hooks/use-share';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { SelectionBar } from '@/components/gallery/selection-bar';
import { AddToAlbumModal } from '@/components/modals/add-to-album-modal';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/client';

export default function VideosPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    type: 'video',
    isTrashed: false,
    isArchived: false,
  });
  const { viewMode, setViewMode } = useUIStore();
  const { selectedFiles, deselectAll } = useFilesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadFile } = useUploadFile();
  const { mutate: bulkDelete } = useBulkDeleteFiles();
  const { mutate: shareFile, isPending: isSharing } = useShareFile();
  const { addNotification } = useUIStore();
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const t = useT();

  const handleBulkDelete = () => {
    const ids = Array.from(selectedFiles);
    bulkDelete(ids, {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: t('dashboard.shared.movedToTrash'),
          message: t('dashboard.shared.movedToTrashMsg', { count: ids.length }),
        });
        deselectAll();
      },
    });
  };

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles) return;
      for (const file of Array.from(selectedFiles)) {
        uploadFile(file, {
          onSuccess: () => {
            addNotification({
              type: 'success',
              title: t('dashboard.videos.uploaded'),
              message: t('dashboard.videos.uploadedMsg', { name: file.name }),
            });
          },
          onError: (error) => {
            addNotification({
              type: 'error',
              title: t('dashboard.videos.uploadFailed'),
              message: error.message,
            });
          },
        });
      }
      e.target.value = '';
    },
    [uploadFile, addNotification, t]
  );

  // Intersection observer for infinite scroll
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        const observer = new IntersectionObserver(observerCallback, {
          rootMargin: '200px',
        });
        observer.observe(node);
        return () => observer.disconnect();
      }
    },
    [observerCallback]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.videos.title')}</h1>
          <p className="text-sm text-gray-500">
            {t(files.length === 1 ? 'dashboard.videos.countOne' : 'dashboard.videos.countMany', { count: files.length })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('dashboard.photos.upload')}
          </button>

          <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              aria-label={t('dashboard.photos.gridView')}
              className={cn(
                'rounded-md p-1.5',
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label={t('dashboard.photos.listView')}
              className={cn(
                'rounded-md p-1.5',
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Video grid */}
      <PhotoGrid files={files} isLoading={isLoading} />

      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={observerRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          ) : (
            <button onClick={() => fetchNextPage()} className="btn-secondary">
              {t('dashboard.shared.loadMore')}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-6 rounded-full bg-primary-50 p-6 dark:bg-primary-900/20">
            <Video className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">{t('dashboard.videos.emptyTitle')}</h2>
          <p className="mt-2 max-w-md text-gray-500">
            {t('dashboard.videos.emptyText')}
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-6">
            <Upload className="mr-2 h-4 w-4" />
            {t('dashboard.videos.uploadVideo')}
          </button>
        </motion.div>
      )}
      <SelectionBar
        actions={[
          {
            label: t('dashboard.shared.share'),
            icon: <Share2 className="h-4 w-4" />,
            onClick: () => {
              const ids = Array.from(selectedFiles);
              if (ids.length === 1) {
                shareFile(ids[0], {
                  onSuccess: async (data) => {
                    const fullUrl = `${window.location.origin}${data.shareUrl}`;
                    try { await navigator.clipboard.writeText(fullUrl); addNotification({ type: 'success', title: t('dashboard.shared.linkCopied') }); } catch { addNotification({ type: 'error', title: t('dashboard.shared.copyFailed') }); }
                  },
                });
              } else {
                addNotification({ type: 'info', title: t('dashboard.shared.shareMultipleHint') });
              }
            },
            disabled: isSharing,
            variant: 'primary',
          },
          {
            label: t('dashboard.shared.album'),
            icon: <FolderPlus className="h-4 w-4" />,
            onClick: () => setShowAlbumModal(true),
          },
          {
            label: t('dashboard.shared.delete'),
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: 'danger',
          },
        ]}
      />
      <AddToAlbumModal
        open={showAlbumModal}
        onClose={() => setShowAlbumModal(false)}
        fileIds={Array.from(selectedFiles)}
        onSuccess={() => { deselectAll(); setShowAlbumModal(false); }}
      />
    </motion.div>
  );
}
