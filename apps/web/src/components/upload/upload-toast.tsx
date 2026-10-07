'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useFilesStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/client';
import { pluralForm } from '@/components/i18n-static';

export function UploadToast() {
  const { uploadQueue, clearCompletedUploads } = useFilesStore();
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { t, locale } = useI18n();
  const fileCountLabel = (n: number) => t(`components.common.fileCount.${pluralForm(n, locale)}`, { count: n });

  const activeItems = uploadQueue.filter(
    (item) => item.status === 'uploading' || item.status === 'pending' || item.status === 'processing'
  );
  const completedItems = uploadQueue.filter((item) => item.status === 'completed');
  const errorItems = uploadQueue.filter((item) => item.status === 'error');
  const totalItems = activeItems.length + completedItems.length + errorItems.length;

  const isUploading = activeItems.length > 0;
  const allDone = totalItems > 0 && activeItems.length === 0;

  // Calculate overall progress
  const overallProgress =
    totalItems > 0
      ? Math.round(
          uploadQueue.reduce((sum, item) => {
            if (item.status === 'completed') return sum + 100;
            if (item.status === 'error') return sum + 100;
            return sum + item.progress;
          }, 0) / totalItems
        )
      : 0;

  // Show success briefly, then auto-dismiss
  useEffect(() => {
    if (allDone && errorItems.length === 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setDismissed(true);
        clearCompletedUploads();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone, errorItems.length, clearCompletedUploads]);

  // Reset dismissed when new uploads start
  useEffect(() => {
    if (isUploading) {
      setDismissed(false);
      setShowSuccess(false);
    }
  }, [isUploading]);

  const visible = totalItems > 0 && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 z-40 w-80 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                showSuccess
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-primary-100 dark:bg-primary-900/30'
              )}
            >
              {showSuccess ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Upload className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {showSuccess ? (
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t('components.uploadToast.uploaded', { files: fileCountLabel(completedItems.length) })}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">
                    {t('components.uploadToast.uploading', { files: fileCountLabel(activeItems.length) })}
                    {' '}{overallProgress}%
                  </p>
                  {errorItems.length > 0 && (
                    <p className="text-xs text-red-500">{t('components.uploadToast.failedCount', { count: errorItems.length })}</p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized((m) => !m)}
                aria-label={minimized ? t('components.uploadToast.expand') : t('components.uploadToast.collapse')}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                {minimized ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setDismissed(true);
                  if (allDone) clearCompletedUploads();
                }}
                aria-label={t('components.common.close')}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {!showSuccess && (
            <div className="h-1 bg-gray-100 dark:bg-gray-700">
              <motion.div
                className="h-full bg-primary-500"
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Expanded file list */}
          {!minimized && !showSuccess && uploadQueue.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-t border-gray-100 dark:border-gray-700">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-4 py-2 text-xs"
                >
                  <span className="flex-1 truncate text-gray-600 dark:text-gray-300">
                    {item.file.name}
                  </span>
                  {item.status === 'completed' && (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-gray-400">{item.progress}%</span>
                  )}
                  {item.status === 'error' && (
                    <span className="text-red-500">{t('components.uploadToast.failed')}</span>
                  )}
                  {item.status === 'pending' && (
                    <span className="text-gray-400">{t('components.uploadToast.pending')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
