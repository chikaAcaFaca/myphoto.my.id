'use client';

import { useState } from 'react';
import { Trash2, RefreshCw, AlertTriangle, File, FileText, FileImage, FileVideo, FileAudio, FileArchive, Folder } from 'lucide-react';
import { useFiles, useRestoreFile, usePermanentlyDeleteFile } from '@/lib/hooks';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFilesStore, useAuthStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { SelectionBar } from '@/components/gallery/selection-bar';
import { getIdToken } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const getFileIcon = (mimeType: string) => {
  if (mimeType?.startsWith('image/')) return FileImage;
  if (mimeType?.startsWith('video/')) return FileVideo;
  if (mimeType?.startsWith('audio/')) return FileAudio;
  if (mimeType?.includes('zip') || mimeType?.includes('rar') || mimeType?.includes('tar')) return FileArchive;
  if (mimeType?.includes('pdf') || mimeType?.includes('doc') || mimeType?.includes('text')) return FileText;
  return File;
};

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (d: string | Date) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('sr-Latn', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function TrashPage() {
  const [tab, setTab] = useState<'photos' | 'disk'>('photos');
  const { data, isLoading } = useFiles({ isTrashed: true });
  const { selectedFiles, deselectAll } = useFilesStore();
  const { addNotification } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { mutate: restoreFile } = useRestoreFile();
  const { mutate: permanentlyDelete } = usePermanentlyDeleteFile();
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [selectedDiskItems, setSelectedDiskItems] = useState<Set<string>>(new Set());

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  // Fetch trashed disk files and folders
  const { data: diskTrash, isLoading: diskLoading } = useQuery({
    queryKey: ['disk-trash', user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch('/api/disk-files/trash', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { files: [], folders: [] };
      return res.json() as Promise<{ files: any[]; folders: any[] }>;
    },
    enabled: !!user,
  });

  const diskFiles = diskTrash?.files ?? [];
  const diskFolders = diskTrash?.folders ?? [];

  // Restore disk file/folder
  const restoreDiskMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'file' | 'folder' }) => {
      const token = await getIdToken();
      const res = await fetch('/api/disk-files/trash', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', ids: [id], type }),
      });
      if (!res.ok) throw new Error('Restore failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disk-trash'] });
      queryClient.invalidateQueries({ queryKey: ['myspace'] });
      addNotification({ type: 'success', title: 'Vraćeno iz korpe' });
    },
  });

  // Permanently delete disk file
  const deleteDiskMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'file' | 'folder' }) => {
      const token = await getIdToken();
      const res = await fetch('/api/disk-files/trash', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], type }),
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disk-trash'] });
      addNotification({ type: 'success', title: 'Trajno obrisano' });
    },
  });

  const handleRestore = () => {
    const fileIds = Array.from(selectedFiles);
    fileIds.forEach((id) => {
      restoreFile(id, {
        onSuccess: () => {
          addNotification({ type: 'success', title: 'File restored' });
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
          addNotification({ type: 'success', title: 'File permanently deleted' });
        },
      });
    });
    deselectAll();
  };

  const handleEmptyTrash = () => {
    if (tab === 'photos') {
      files.forEach((file) => permanentlyDelete(file.id));
    } else {
      diskFiles.forEach((f) => deleteDiskMutation.mutate({ id: f.id, type: 'file' }));
      diskFolders.forEach((f) => deleteDiskMutation.mutate({ id: f.id, type: 'folder' }));
    }
    setShowEmptyConfirm(false);
    addNotification({ type: 'success', title: 'Korpa ispražnjena' });
  };

  const photoCount = files.length;
  const diskCount = diskFiles.length + diskFolders.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Korpa</h1>
          <p className="text-sm text-gray-500">
            Fajlovi u korpi se trajno brišu nakon 30 dana
          </p>
        </div>
        {((tab === 'photos' && photoCount > 0) || (tab === 'disk' && diskCount > 0)) && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="btn-danger"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Isprazni korpu
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setTab('photos')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'photos' ? 'bg-white shadow dark:bg-gray-700' : 'text-gray-500'
          }`}
        >
          Slike ({photoCount})
        </button>
        <button
          onClick={() => setTab('disk')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'disk' ? 'bg-white shadow dark:bg-gray-700' : 'text-gray-500'
          }`}
        >
          MySpace ({diskCount})
        </button>
      </div>

      {/* Photos tab */}
      {tab === 'photos' && (
        <>
          {!isLoading && files.length === 0 ? (
            <EmptyState message="Nema obrisanih slika" />
          ) : (
            <PhotoGrid files={files} isLoading={isLoading} />
          )}
          <SelectionBar
            actions={[
              { label: 'Vrati', icon: <RefreshCw className="h-4 w-4" />, onClick: handleRestore },
              { label: 'Obriši zauvek', icon: <Trash2 className="h-4 w-4" />, onClick: handlePermanentDelete, variant: 'danger' },
            ]}
          />
        </>
      )}

      {/* Disk tab */}
      {tab === 'disk' && (
        <>
          {!diskLoading && diskCount === 0 ? (
            <EmptyState message="Nema obrisanih fajlova sa MySpace-a" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              {diskFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {folder.trashedAt ? formatDate(folder.trashedAt) : ''}
                    </span>
                    <button
                      onClick={() => restoreDiskMutation.mutate({ id: folder.id, type: 'folder' })}
                      className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      Vrati
                    </button>
                    <button
                      onClick={() => deleteDiskMutation.mutate({ id: folder.id, type: 'folder' })}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Obriši
                    </button>
                  </div>
                </div>
              ))}
              {diskFiles.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-sm dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-400" />
                      <span>{file.name}</span>
                      <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {file.trashedAt ? formatDate(file.trashedAt) : ''}
                      </span>
                      <button
                        onClick={() => restoreDiskMutation.mutate({ id: file.id, type: 'file' })}
                        className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        Vrati
                      </button>
                      <button
                        onClick={() => deleteDiskMutation.mutate({ id: file.id, type: 'file' })}
                        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty trash confirmation modal */}
      <AnimatePresence>
        {showEmptyConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowEmptyConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold">Isprazni korpu?</h2>
              </div>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Ovo će trajno obrisati sve fajlove iz korpe. Ova akcija se ne može poništiti.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowEmptyConfirm(false)} className="btn-secondary">
                  Otkaži
                </button>
                <button onClick={handleEmptyTrash} className="btn-danger">
                  Isprazni korpu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
        <Trash2 className="h-12 w-12 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold">{message}</h2>
      <p className="mt-2 max-w-md text-gray-500">
        Obrisani fajlovi ostaju ovde 30 dana pre trajnog brisanja
      </p>
    </motion.div>
  );
}
