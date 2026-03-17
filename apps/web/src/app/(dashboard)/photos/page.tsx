'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, Grid, List, Trash2, Share2, FolderPlus } from 'lucide-react';
import { useFiles, useUploadFile, useBulkDeleteFiles } from '@/lib/hooks';
import { useShareFile } from '@/lib/hooks/use-share';
import { useAlbums, useAddFilesToAlbum } from '@/lib/hooks/use-albums';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { SelectionBar } from '@/components/gallery/selection-bar';
import { StorageBonusCard } from '@/components/onboarding/storage-bonus-card';
import { StorageLimitBanner } from '@/components/onboarding/storage-limit-banner';
import { SavingsBadge } from '@/components/dashboard/savings-badge';
import { AddToAlbumModal } from '@/components/modals/add-to-album-modal';
import { ALL_SUPPORTED_TYPES } from '@myphoto/shared';
import { cn } from '@/lib/utils';

export default function PhotosPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    isTrashed: false,
    isArchived: false,
  });
  const { viewMode, setViewMode, addNotification } = useUIStore();
  const { selectedFiles, deselectAll } = useFilesStore();
  const { mutate: uploadFile } = useUploadFile();
  const { mutate: bulkDelete } = useBulkDeleteFiles();
  const { mutate: shareFile, isPending: isSharing } = useShareFile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);

  const handleBulkShare = async () => {
    const ids = Array.from(selectedFiles);
    if (ids.length === 1) {
      // Single file - share directly
      shareFile(ids[0], {
        onSuccess: async (data) => {
          const fullUrl = `${window.location.origin}${data.shareUrl}`;
          if (navigator.share) {
            try {
              await navigator.share({ title: 'MyPhoto', url: fullUrl });
              return;
            } catch {}
          }
          try {
            await navigator.clipboard.writeText(fullUrl);
            addNotification({ type: 'success', title: 'Link kopiran!' });
          } catch {
            addNotification({ type: 'error', title: 'Kopiranje nije uspelo' });
          }
        },
        onError: () => {
          addNotification({ type: 'error', title: 'Greška pri deljenju' });
        },
      });
    } else {
      addNotification({
        type: 'info',
        title: 'Saveti',
        message: 'Za deljenje više fajlova, dodajte ih u album pa podelite album.',
      });
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedFiles);
    bulkDelete(ids, {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Premesteno u korpu',
          message: `${ids.length} fajlova premesteno u korpu`,
        });
        deselectAll();
      },
    });
  };

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  // Direct file input handler for Upload button
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles) return;
      for (const file of Array.from(selectedFiles)) {
        uploadFile(file, {
          onSuccess: () => {
            addNotification({
              type: 'success',
              title: 'Upload complete',
              message: `${file.name} has been uploaded`,
            });
          },
          onError: (error) => {
            addNotification({
              type: 'error',
              title: 'Upload failed',
              message: error.message,
            });
          },
        });
      }
      // Reset input so the same files can be selected again
      e.target.value = '';
    },
    [uploadFile, addNotification]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        uploadFile(file, {
          onSuccess: () => {
            addNotification({
              type: 'success',
              title: 'Upload complete',
              message: `${file.name} has been uploaded`,
            });
          },
          onError: (error) => {
            addNotification({
              type: 'error',
              title: 'Upload failed',
              message: error.message,
            });
          },
        });
      }
    },
    [uploadFile, addNotification]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALL_SUPPORTED_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<string, string[]>
    ),
    noClick: true,
  });

  // Intersection observer for infinite scroll
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  // Set up intersection observer
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
    <div
      {...getRootProps()}
      className={cn(
        'min-h-full rounded-xl transition-colors',
        isDragActive && 'bg-primary-50 ring-2 ring-primary-500 ring-inset dark:bg-primary-900/20'
      )}
    >
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <input {...getInputProps()} />

      {/* Hidden file input for direct upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Storage limit banner + bonus card + savings */}
      <StorageLimitBanner />
      <SavingsBadge />
      <StorageBonusCard />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Slike</h1>
          <p className="text-sm text-gray-500">
            {files.length} {files.length === 1 ? 'slika' : 'slika'}
          </p>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </button>

          <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
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

      {/* Drag overlay */}
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
            <Upload className="mx-auto mb-4 h-12 w-12 text-primary-500" />
            <p className="text-lg font-medium">Prevucite fajlove za upload</p>
            <p className="text-sm text-gray-500">Otpustite da započnete upload</p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <PhotoGrid files={files} isLoading={isLoading} />

      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={observerRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="btn-secondary"
            >
              Učitaj još
            </button>
          )}
        </div>
      )}

      {/* Empty state with upload hint */}
      {!isLoading && files.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-6 rounded-full bg-primary-50 p-6 dark:bg-primary-900/20">
            <Upload className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">Nema slika</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Prevucite slike ovde ili kliknite dugme Upload. Vaše uspomene vas čekaju!
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-6">
            <Upload className="mr-2 h-4 w-4" />
            Upload slika
          </button>
        </motion.div>
      )}
      <SelectionBar
        actions={[
          {
            label: 'Podeli',
            icon: <Share2 className="h-4 w-4" />,
            onClick: handleBulkShare,
            disabled: isSharing,
            variant: 'primary',
          },
          {
            label: 'Album',
            icon: <FolderPlus className="h-4 w-4" />,
            onClick: () => setShowAlbumModal(true),
          },
          {
            label: 'Obriši',
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
        onSuccess={() => {
          deselectAll();
          setShowAlbumModal(false);
        }}
      />
    </motion.div>
    </div>
  );
}
