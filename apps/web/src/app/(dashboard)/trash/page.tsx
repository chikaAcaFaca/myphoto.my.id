'use client';

import { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useFiles, useRestoreFile, usePermanentlyDeleteFile } from '@/lib/hooks';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { motion, AnimatePresence } from 'framer-motion';

export default function TrashPage() {
  const { data, isLoading } = useFiles({ isTrashed: true });
  const { selectedFiles, deselectAll } = useFilesStore();
  const { addNotification } = useUIStore();
  const { mutate: restoreFile } = useRestoreFile();
  const { mutate: permanentlyDelete } = usePermanentlyDeleteFile();
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  const handleRestore = () => {
    const fileIds = Array.from(selectedFiles);
    fileIds.forEach((id) => {
      restoreFile(id, {
        onSuccess: () => {
          addNotification({
            type: 'success',
            title: 'File restored',
          });
        },
      });
    });
    deselectAll();
  };

  const handlePermanentDelete = () => {
    const fileIds = Array.from(selectedFiles);
    fileIds.forEach((id) => {
      permanentlyDelete(id, {
        onSuccess: () => {
          addNotification({
            type: 'success',
            title: 'File permanently deleted',
          });
        },
      });
    });
    deselectAll();
  };

  const handleEmptyTrash = () => {
    files.forEach((file) => {
      permanentlyDelete(file.id);
    });
    setShowEmptyConfirm(false);
    addNotification({
      type: 'success',
      title: 'Trash emptied',
      message: 'All files have been permanently deleted',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trash</h1>
          <p className="text-sm text-gray-500">
            Items in trash will be permanently deleted after 30 days
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="btn-danger"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Empty Trash
          </button>
        )}
      </div>

      {/* Selection actions */}
      {selectedFiles.size > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
          <span className="text-sm font-medium">{selectedFiles.size} selected</span>
          <div className="flex gap-2">
            <button onClick={handleRestore} className="btn-secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              Restore
            </button>
            <button onClick={handlePermanentDelete} className="btn-danger">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Forever
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <Trash2 className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Trash is empty</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Items you delete will appear here for 30 days before being permanently removed
          </p>
        </div>
      ) : (
        <PhotoGrid files={files} isLoading={isLoading} />
      )}

      {/* Empty trash confirmation modal */}
      <AnimatePresence>
        {showEmptyConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowEmptyConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold">Empty Trash?</h2>
              </div>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                This will permanently delete all {files.length} items in trash. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEmptyConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button onClick={handleEmptyTrash} className="btn-danger">
                  Empty Trash
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
