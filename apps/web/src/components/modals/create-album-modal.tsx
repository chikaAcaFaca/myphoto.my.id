'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Check, Image as ImageIcon, Film } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { useCreateAlbum, useAddFilesToAlbum, useUpdateAlbum, useFiles } from '@/lib/hooks';
import type { FileMetadata } from '@myphoto/shared';

export function CreateAlbumModal() {
  const { isCreateAlbumModalOpen, closeCreateAlbumModal, addNotification } = useUIStore();
  const { mutateAsync: createAlbum, isPending: isCreating } = useCreateAlbum();
  const { mutateAsync: addFilesToAlbum } = useAddFilesToAlbum();
  const { mutateAsync: updateAlbum } = useUpdateAlbum();
  const { data: filesData, isLoading: isLoadingFiles } = useFiles();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flatten paginated files into a single list (exclude trashed/archived)
  const allFiles = useMemo(() => {
    if (!filesData?.pages) return [];
    const files: FileMetadata[] = [];
    for (const page of filesData.pages) {
      for (const file of page.files) {
        if (!file.isTrashed && !file.isArchived) {
          files.push(file);
        }
      }
    }
    return files;
  }, [filesData]);

  const toggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedFileIds(new Set());
    closeCreateAlbumModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Create the album
      const album = await createAlbum({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // 2. Add selected files to album
      const fileIds = Array.from(selectedFileIds);
      if (fileIds.length > 0) {
        await addFilesToAlbum({ albumId: album.id, fileIds });

        // 3. Set first selected file as cover
        await updateAlbum({
          albumId: album.id,
          updates: { coverFileId: fileIds[0] },
        });
      }

      addNotification({
        type: 'success',
        title: 'Album created',
        message: `"${name}" has been created with ${fileIds.length} ${fileIds.length === 1 ? 'photo' : 'photos'}`,
      });

      handleClose();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Failed to create album',
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isCreating || isSubmitting;

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
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800"
          style={{ maxHeight: '85vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Create Album</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
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
                  rows={2}
                />
              </div>

              {/* Photo Selection */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium">
                    Add Photos {selectedFileIds.size > 0 && (
                      <span className="text-sky-600">({selectedFileIds.size} selected)</span>
                    )}
                  </label>
                  {selectedFileIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFileIds(new Set())}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {isLoadingFiles ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
                      />
                    ))}
                  </div>
                ) : allFiles.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center dark:border-gray-700">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      No photos uploaded yet. You can add photos later.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {allFiles.map((file) => {
                      const isSelected = selectedFileIds.has(file.id);
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => toggleFile(file.id)}
                          className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-sky-500 ring-2 ring-sky-500/30'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {file.thumbnailKey ? (
                            <img
                              src={`/api/thumbnail/${file.id}`}
                              alt={file.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-700">
                              {file.type === 'video' ? (
                                <Film className="h-6 w-6 text-gray-400" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                          )}

                          {/* Video indicator */}
                          {file.type === 'video' && (
                            <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5">
                              <Film className="h-3 w-3 text-white" />
                            </div>
                          )}

                          {/* Selection indicator */}
                          <div
                            className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-sky-500 bg-sky-500'
                                : 'border-white/80 bg-black/20 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                type="button"
                onClick={handleClose}
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
                    {selectedFileIds.size > 0 && ` (${selectedFileIds.size} photos)`}
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
