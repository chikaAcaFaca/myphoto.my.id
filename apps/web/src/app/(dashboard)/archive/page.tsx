'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Archive } from 'lucide-react';
import { useFiles } from '@/lib/hooks';
import { PhotoGrid } from '@/components/gallery/photo-grid';

export default function ArchivePage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    isArchived: true,
    isTrashed: false,
  });

  const files = data?.pages.flatMap((page) => page.files) ?? [];

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
        <h1 className="text-2xl font-bold">Arhiva</h1>
        <p className="text-sm text-gray-500">
          {files.length} arhiviran{files.length === 1 ? '' : 'ih'} fajlov{files.length === 1 ? '' : 'a'}
        </p>
      </div>

      {/* Grid */}
      <PhotoGrid files={files} isLoading={isLoading} />

      {/* Load more */}
      {hasNextPage && (
        <div ref={observerRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          ) : (
            <button onClick={() => fetchNextPage()} className="btn-secondary">
              Učitaj još
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
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <Archive className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Arhiva je prazna</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Arhivirane slike i video zapisi se čuvaju ovde. Koristite arhivu da sklonite
            fajlove iz glavnog prikaza bez brisanja.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
