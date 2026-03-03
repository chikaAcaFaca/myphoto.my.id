'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { useFiles, useBulkDeleteFiles } from '@/lib/hooks';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { SelectionBar } from '@/components/gallery/selection-bar';

export default function FavoritesPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    isFavorite: true,
    isTrashed: false,
  });
  const { selectedFiles, deselectAll } = useFilesStore();
  const { addNotification } = useUIStore();
  const { mutate: bulkDelete } = useBulkDeleteFiles();

  const files = data?.pages.flatMap((page) => page.files) ?? [];

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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Omiljeno</h1>
        <p className="text-sm text-gray-500">
          {files.length} {files.length === 1 ? 'fajl' : 'fajlova'}
        </p>
      </div>

      {/* Content */}
      {!isLoading && files.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-6 rounded-full bg-red-50 p-6 dark:bg-red-900/20">
            <Heart className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">Nema omiljenih</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Označite omiljene slike i video zapise klikom na ikonu srca
          </p>
        </motion.div>
      ) : (
        <PhotoGrid files={files} isLoading={isLoading} />
      )}

      {/* Load more */}
      {hasNextPage && (
        <div ref={observerRef} className="flex justify-center py-8">
          {isFetchingNextPage && (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          )}
        </div>
      )}
      <SelectionBar
        actions={[
          {
            label: 'Obrisi',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: 'danger',
          },
        ]}
      />
    </motion.div>
  );
}
