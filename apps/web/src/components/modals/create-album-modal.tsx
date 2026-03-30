'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Check, Image as ImageIcon, Film, Upload, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useUIStore } from '@/lib/stores';
import { useCreateAlbum, useAddFilesToAlbum, useUpdateAlbum, useFiles, useUploadFile } from '@/lib/hooks';
import { ALL_SUPPORTED_TYPES, MAX_UPLOAD_SIZE, formatBytes } from '@myphoto/shared';
import type { FileMetadata } from '@myphoto/shared';

export function CreateAlbumModal() {
  const { isCreateAlbumModalOpen, closeCreateAlbumModal, addNotification } = useUIStore();
  const { mutateAsync: createAlbum, isPending: isCreating } = useCreateAlbum();
  const { mutateAsync: addFilesToAlbum } = useAddFilesToAlbum();
  const { mutateAsync: updateAlbum } = useUpdateAlbum();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { data: filesData, isLoading: isLoadingFiles } = useFiles();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('upload');

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setNewFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALL_SUPPORTED_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<string, string[]>
    ),
    maxSize: MAX_UPLOAD_SIZE,
  });

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
    setNewFiles([]);
    setActiveTab('upload');
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

      // 2. Upload new files and collect their IDs
      const uploadedFileIds: string[] = [];
      for (const file of newFiles) {
        try {
          const result = await uploadFile(file);
          if ('id' in result) {
            uploadedFileIds.push(result.id);
          }
        } catch (err) {
          console.warn(`Failed to upload ${file.name}:`, err);
        }
      }

      // 3. Combine existing selected files + newly uploaded files
      const allFileIds = [...Array.from(selectedFileIds), ...uploadedFileIds];

      if (allFileIds.length > 0) {
        await addFilesToAlbum({ albumId: album.id, fileIds: allFileIds });

        // Set first file as cover
        await updateAlbum({
          albumId: album.id,
          updates: { coverFileId: allFileIds[0] },
        });
      }

      const totalCount = allFileIds.length;
      addNotification({
        type: 'success',
        title: 'Album kreiran',
        message: `"${name}" sa ${totalCount} ${totalCount === 1 ? 'fajlom' : 'fajlova'}`,
      });

      handleClose();
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Greška pri kreiranju albuma',
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isCreating || isSubmitting;
  const totalSelected = selectedFileIds.size + newFiles.length;

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
            <h2 className="text-lg font-semibold">Kreiraj album</h2>
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
                  Ime albuma
                </label>
                <input
                  id="album-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Letovanje 2024"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="album-description" className="mb-1 block text-sm font-medium">
                  Opis (opciono)
                </label>
                <textarea
                  id="album-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[80px] resize-none"
                  placeholder="Kolekcija slika sa putovanja..."
                  rows={2}
                />
              </div>

              {/* Tabs: Upload new / Select existing */}
              <div>
                <div className="mb-3 flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'upload'
                        ? 'border-b-2 border-sky-500 text-sky-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Upload className="mr-1.5 inline h-4 w-4" />
                    Upload novih slika
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('existing')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'existing'
                        ? 'border-b-2 border-sky-500 text-sky-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ImageIcon className="mr-1.5 inline h-4 w-4" />
                    Iz galerije {selectedFileIds.size > 0 && `(${selectedFileIds.size})`}
                  </button>
                </div>

                {/* Upload new files tab */}
                {activeTab === 'upload' && (
                  <div>
                    <div
                      {...getRootProps()}
                      className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                        isDragActive
                          ? 'cursor-pointer border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                          : 'cursor-pointer border-gray-300 hover:border-gray-400 dark:border-gray-600'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      {isDragActive ? (
                        <p className="text-sky-600">Pustite fajlove ovde...</p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Prevucite slike ovde ili <span className="text-sky-500">izaberite</span>
                        </p>
                      )}
                    </div>

                    {/* New files list */}
                    {newFiles.length > 0 && (
                      <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                        {newFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700"
                          >
                            <ImageIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                            <span className="flex-shrink-0 text-xs text-gray-400">{formatBytes(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeNewFile(index)}
                              className="flex-shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <p className="mt-1 text-xs text-gray-500">
                          {newFiles.length} novih fajlova za upload
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing files tab */}
                {activeTab === 'existing' && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium">
                        Izaberi slike {selectedFileIds.size > 0 && (
                          <span className="text-sky-600">({selectedFileIds.size} izabrano)</span>
                        )}
                      </label>
                      {selectedFileIds.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedFileIds(new Set())}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Poništi izbor
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
                          Nemate uploadovanih slika. Koristite tab "Upload novih slika".
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
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <span className="text-sm text-gray-500">
                {totalSelected > 0 && `${totalSelected} fajlova ukupno`}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isPending}
                  className="btn-primary"
                >
                  {isPending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {newFiles.length > 0 ? 'Upload i kreiranje...' : 'Kreiranje...'}
                    </>
                  ) : (
                    <>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Kreiraj album
                      {totalSelected > 0 && ` (${totalSelected})`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
