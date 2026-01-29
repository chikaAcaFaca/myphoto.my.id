'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, Check, AlertCircle, Image } from 'lucide-react';
import { useUIStore, useFilesStore, type UploadItem } from '@/lib/stores';
import { useUploadFile } from '@/lib/hooks';
import { useStorage } from '@/lib/hooks';
import { ALL_SUPPORTED_TYPES, formatBytes, MAX_UPLOAD_SIZE } from '@myphoto/shared';
import { cn } from '@/lib/utils';

export function UploadModal() {
  const { isUploadModalOpen, closeUploadModal, addNotification } = useUIStore();
  const { uploadQueue, addToUploadQueue, updateUploadProgress, setUploadStatus, removeFromUploadQueue, clearCompletedUploads } = useFilesStore();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { data: storage } = useStorage();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: UploadItem[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending',
      }));
      addToUploadQueue(newItems);
    },
    [addToUploadQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALL_SUPPORTED_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<string, string[]>
    ),
    maxSize: MAX_UPLOAD_SIZE,
  });

  const handleUploadAll = async () => {
    const pendingItems = uploadQueue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    // Check storage
    const totalSize = pendingItems.reduce((sum, item) => sum + item.file.size, 0);
    if (storage && storage.remaining < totalSize) {
      addNotification({
        type: 'error',
        title: 'Not enough storage',
        message: 'Please upgrade your plan or delete some files',
      });
      return;
    }

    setIsUploading(true);

    for (const item of pendingItems) {
      setUploadStatus(item.id, 'uploading');

      try {
        // Simulate progress (in production, use XMLHttpRequest for real progress)
        const progressInterval = setInterval(() => {
          updateUploadProgress(item.id, Math.min(item.progress + 10, 90));
        }, 200);

        await uploadFile(item.file);

        clearInterval(progressInterval);
        updateUploadProgress(item.id, 100);
        setUploadStatus(item.id, 'completed');
      } catch (error) {
        setUploadStatus(
          item.id,
          'error',
          error instanceof Error ? error.message : 'Upload failed'
        );
      }
    }

    setIsUploading(false);
    addNotification({
      type: 'success',
      title: 'Upload complete',
      message: `${pendingItems.length} files uploaded successfully`,
    });
  };

  const handleRemoveItem = (id: string) => {
    removeFromUploadQueue(id);
  };

  const pendingCount = uploadQueue.filter((item) => item.status === 'pending').length;
  const completedCount = uploadQueue.filter((item) => item.status === 'completed').length;
  const errorCount = uploadQueue.filter((item) => item.status === 'error').length;

  if (!isUploadModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={closeUploadModal}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Upload Files</h2>
            <button
              onClick={closeUploadModal}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              {isDragActive ? (
                <p className="text-primary-600">Drop files here...</p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-300">
                    Drag and drop files here, or{' '}
                    <span className="text-primary-500">browse</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Supports images, videos, and documents up to 10GB
                  </p>
                </>
              )}
            </div>

            {/* Storage info */}
            {storage && (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-700">
                <span className="text-gray-600 dark:text-gray-300">
                  Available storage: {storage.remainingFormatted}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${storage.percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-500">{storage.percentage}%</span>
                </div>
              </div>
            )}

            {/* Upload queue */}
            {uploadQueue.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium">
                    {pendingCount > 0 && `${pendingCount} pending`}
                    {pendingCount > 0 && completedCount > 0 && ' · '}
                    {completedCount > 0 && `${completedCount} completed`}
                    {errorCount > 0 && ` · ${errorCount} failed`}
                  </h3>
                  {completedCount > 0 && (
                    <button
                      onClick={clearCompletedUploads}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear completed
                    </button>
                  )}
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  <AnimatePresence>
                    {uploadQueue.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600">
                          {item.file.type.startsWith('image/') ? (
                            <Image className="h-5 w-5 text-gray-500" />
                          ) : (
                            <File className="h-5 w-5 text-gray-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>

                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}

                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{item.progress}%</span>
                          </div>
                        )}

                        {item.status === 'completed' && (
                          <div className="rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30">
                            <Check className="h-4 w-4" />
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button onClick={closeUploadModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUploadAll}
              disabled={pendingCount === 0 || isUploading}
              className="btn-primary"
            >
              {isUploading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {pendingCount > 0 ? `(${pendingCount})` : ''}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
