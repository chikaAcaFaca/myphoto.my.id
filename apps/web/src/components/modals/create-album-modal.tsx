'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { useCreateAlbum } from '@/lib/hooks';

export function CreateAlbumModal() {
  const { isCreateAlbumModalOpen, closeCreateAlbumModal, addNotification } = useUIStore();
  const { mutate: createAlbum, isPending } = useCreateAlbum();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createAlbum(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          addNotification({
            type: 'success',
            title: 'Album created',
            message: `"${name}" has been created`,
          });
          setName('');
          setDescription('');
          closeCreateAlbumModal();
        },
        onError: (error) => {
          addNotification({
            type: 'error',
            title: 'Failed to create album',
            message: error.message,
          });
        },
      }
    );
  };

  if (!isCreateAlbumModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={closeCreateAlbumModal}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Create Album</h2>
            <button
              onClick={closeCreateAlbumModal}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 p-6">
              <div>
                <label htmlFor="album-name" className="mb-1 block text-sm font-medium">
                  Album Name
                </label>
                <input
                  id="album-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Summer Vacation 2024"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="album-description" className="mb-1 block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  id="album-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[80px] resize-none"
                  placeholder="A collection of memories from our trip..."
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={closeCreateAlbumModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isPending}
                className="btn-primary"
              >
                {isPending ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Album
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
