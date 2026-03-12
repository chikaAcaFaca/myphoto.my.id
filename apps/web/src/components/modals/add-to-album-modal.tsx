'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Plus, Check } from 'lucide-react';
import { useAlbums, useCreateAlbum, useAddFilesToAlbum, useUpdateAlbum } from '@/lib/hooks/use-albums';
import { useUIStore } from '@/lib/stores';

interface AddToAlbumModalProps {
  open: boolean;
  onClose: () => void;
  fileIds: string[];
  onSuccess: () => void;
}

export function AddToAlbumModal({ open, onClose, fileIds, onSuccess }: AddToAlbumModalProps) {
  const { data: albums, isLoading } = useAlbums();
  const { mutateAsync: createAlbum } = useCreateAlbum();
  const { mutateAsync: addFilesToAlbum } = useAddFilesToAlbum();
  const { mutateAsync: updateAlbum } = useUpdateAlbum();
  const { addNotification } = useUIStore();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddToExisting = async (albumId: string, albumName: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addFilesToAlbum({ albumId, fileIds });
      addNotification({
        type: 'success',
        title: 'Dodato u album',
        message: `${fileIds.length} fajlova dodato u "${albumName}"`,
      });
      onSuccess();
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Greška', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const album = await createAlbum({ name: newAlbumName.trim() });
      await addFilesToAlbum({ albumId: album.id, fileIds });
      // Set cover
      await updateAlbum({ albumId: album.id, updates: { coverFileId: fileIds[0] } });
      addNotification({
        type: 'success',
        title: 'Album kreiran',
        message: `"${newAlbumName.trim()}" sa ${fileIds.length} fajlova`,
      });
      setNewAlbumName('');
      setIsCreatingNew(false);
      onSuccess();
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Greška', message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsCreatingNew(false);
    setNewAlbumName('');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-800"
          style={{ maxHeight: '70vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold">
              Dodaj u album ({fileIds.length} {fileIds.length === 1 ? 'fajl' : 'fajlova'})
            </h2>
            <button onClick={handleClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[50vh] overflow-y-auto p-5">
            {/* Create new album */}
            {isCreatingNew ? (
              <form onSubmit={handleCreateAndAdd} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  className="input flex-1"
                  placeholder="Ime novog albuma"
                  autoFocus
                />
                <button type="submit" disabled={!newAlbumName.trim() || isSubmitting} className="btn-primary">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setIsCreatingNew(false)} className="btn-secondary">
                  <X className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreatingNew(true)}
                className="mb-4 flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500"
              >
                <Plus className="h-5 w-5" />
                Kreiraj novi album
              </button>
            )}

            {/* Existing albums */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
                ))}
              </div>
            ) : !albums || albums.length === 0 ? (
              <p className="text-center text-sm text-gray-500">Nemate albume. Kreirajte novi!</p>
            ) : (
              <div className="space-y-1">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAddToExisting(album.id, album.name)}
                    disabled={isSubmitting}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {/* Album cover thumbnail */}
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-600">
                      {album.coverFileId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/thumbnail/${album.coverFileId}?size=small`}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FolderPlus className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{album.name}</p>
                      <p className="text-xs text-gray-500">{album.fileCount || 0} fajlova</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
