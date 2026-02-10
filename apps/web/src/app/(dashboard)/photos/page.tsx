'use client';

import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Grid, List } from 'lucide-react';
import { useFiles, useUploadFile } from '@/lib/hooks';
import { useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { ALL_SUPPORTED_TYPES } from '@myphoto/shared';
import { cn } from '@/lib/utils';

export default function PhotosPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useFiles({
    isTrashed: false,
    isArchived: false,
  });
  const { viewMode, setViewMode, addNotification } = useUIStore();
  const { mutate: uploadFile } = useUploadFile();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photos</h1>
          <p className="text-sm text-gray-500">
            {files.length} {files.length === 1 ? 'photo' : 'photos'}
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

      {/* Drag overlay */}
      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm">
          <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-800">
            <Upload className="mx-auto mb-4 h-12 w-12 text-primary-500" />
            <p className="text-lg font-medium">Drop files to upload</p>
            <p className="text-sm text-gray-500">Release to start uploading</p>
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
              Load more
            </button>
          )}
        </div>
      )}

      {/* Empty state with upload hint */}
      {!isLoading && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-primary-50 p-6 dark:bg-primary-900/20">
            <Upload className="h-12 w-12 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold">No photos yet</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Drag and drop photos here, or click the Upload button to get started.
            Your memories are waiting!
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="btn-primary mt-6">
            <Upload className="mr-2 h-4 w-4" />
            Upload Photos
          </button>
        </div>
      )}
    </div>
  );
}
