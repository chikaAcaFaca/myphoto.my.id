'use client';

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Upload, Play, Grid, List } from 'lucide-react';
import { useFiles, useUploadFile } from '@/lib/hooks';
import { useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { cn } from '@/lib/utils';

export default function VideosPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    type: 'video',
    isTrashed: false,
    isArchived: false,
  });
  const { viewMode, setViewMode } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: uploadFile } = useUploadFile();
  const { addNotification } = useUIStore();

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
              title: 'Video uploadovan',
              message: `${file.name} je uploadovan`,
            });
          },
          onError: (error) => {
            addNotification({
              type: 'error',
              title: 'Upload neuspešan',
              message: error.message,
            });
          },
        });
      }
      e.target.value = '';
    },
    [uploadFile, addNotification]
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
          <h1 className="text-2xl font-bold">Video zapisi</h1>
          <p className="text-sm text-gray-500">
            {files.length} {files.length === 1 ? 'video' : 'video zapisa'}
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Video grid */}
      <PhotoGrid files={files} isLoading={isLoading} />

      {/* Load more trigger */}
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
          <div className="mb-6 rounded-full bg-primary-50 p-6 dark:bg-primary-900/20">
            <Video className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">Nema video zapisa</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Uploadujte video zapise da ih čuvate sigurno u oblaku. Podržani formati: MP4, MOV, WebM, AVI.
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-6">
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
