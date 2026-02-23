'use client';

import { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, File, Check, AlertCircle, Image, Wifi, Signal, Globe, ChevronDown, ChevronUp, Folder, Trash2 } from 'lucide-react';
import { useUIStore, useFilesStore, useAuthStore, type UploadItem } from '@/lib/stores';
import { useUploadFile } from '@/lib/hooks';
import { useStorage, useNetworkStatus, useUploadPermission } from '@/lib/hooks';
import { ALL_SUPPORTED_TYPES, formatBytes, MAX_UPLOAD_SIZE } from '@myphoto/shared';
import { updateUserSettings } from '@/lib/firebase';
import { cn } from '@/lib/utils';

export function UploadModal() {
  const { isUploadModalOpen, closeUploadModal, addNotification } = useUIStore();
  const { uploadQueue, addToUploadQueue, updateUploadProgress, setUploadStatus, removeFromUploadQueue, clearCompletedUploads } = useFilesStore();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { data: storage } = useStorage();
  const { user, firebaseUser, refreshUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const uploadingRef = useRef(false);

  const networkStatus = useNetworkStatus();
  const uploadPermission = useUploadPermission(user?.settings);

  const handleSettingChange = async (key: string, value: string | boolean | string[]) => {
    if (!firebaseUser) return;
    await updateUserSettings(firebaseUser.uid, { [key]: value } as any);
    await refreshUser();
  };

  const handleUploadAll = useCallback(async () => {
    const pendingItems = useFilesStore.getState().uploadQueue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0 || uploadingRef.current) return;

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

    uploadingRef.current = true;
    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pendingItems) {
      setUploadStatus(item.id, 'uploading');

      try {
        const progressInterval = setInterval(() => {
          const current = useFilesStore.getState().uploadQueue.find((q) => q.id === item.id);
          updateUploadProgress(item.id, Math.min((current?.progress ?? 0) + 10, 90));
        }, 200);

        await uploadFile(item.file);

        clearInterval(progressInterval);
        updateUploadProgress(item.id, 100);
        setUploadStatus(item.id, 'completed');
        successCount++;
      } catch (error) {
        failCount++;
        setUploadStatus(
          item.id,
          'error',
          error instanceof Error ? error.message : 'Upload failed'
        );
      }
    }

    uploadingRef.current = false;
    setIsUploading(false);

    if (successCount > 0 && failCount === 0) {
      addNotification({
        type: 'success',
        title: 'Upload complete',
        message: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`,
      });
      // Auto-close modal on full success
      closeUploadModal();
    } else if (successCount > 0 && failCount > 0) {
      addNotification({
        type: 'warning',
        title: 'Upload partially complete',
        message: `${successCount} uploaded, ${failCount} failed`,
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: `${failCount} file${failCount > 1 ? 's' : ''} failed to upload`,
      });
    }
  }, [storage, addNotification, uploadFile, setUploadStatus, updateUploadProgress, closeUploadModal]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!uploadPermission.allowed) {
        addNotification({
          type: 'error',
          title: 'Upload blokiran',
          message: uploadPermission.reason || 'Upload nije dozvoljen sa trenutnom mrežom',
        });
        return;
      }

      const newItems: UploadItem[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      addToUploadQueue(newItems);
      // Auto-start upload after adding to queue
      setTimeout(() => handleUploadAll(), 0);
    },
    [addToUploadQueue, handleUploadAll, uploadPermission, addNotification]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALL_SUPPORTED_TYPES.reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<string, string[]>
    ),
    maxSize: MAX_UPLOAD_SIZE,
    disabled: !uploadPermission.allowed,
  });

  const handleRemoveItem = (id: string) => {
    removeFromUploadQueue(id);
  };

  const pendingCount = uploadQueue.filter((item) => item.status === 'pending').length;
  const completedCount = uploadQueue.filter((item) => item.status === 'completed').length;
  const errorCount = uploadQueue.filter((item) => item.status === 'error').length;

  const syncMode = user?.settings?.syncMode || 'wifi_only';
  const allowRoaming = user?.settings?.allowRoaming ?? false;

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
            {/* Network status warning */}
            {!uploadPermission.allowed && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      Upload blokiran
                    </p>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      {uploadPermission.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Network status indicator */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm dark:bg-gray-700">
              <div className="flex items-center gap-2">
                {networkStatus.connectionType === 'wifi' ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : networkStatus.connectionType === 'cellular' ? (
                  <Signal className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Globe className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-gray-600 dark:text-gray-300">
                  {networkStatus.connectionType === 'wifi' && 'WiFi'}
                  {networkStatus.connectionType === 'cellular' && 'Mobilni podaci'}
                  {networkStatus.connectionType === 'ethernet' && 'Ethernet'}
                  {networkStatus.connectionType === 'unknown' && 'Povezano'}
                  {!networkStatus.isOnline && 'Offline'}
                </span>
                <span className="text-xs text-gray-400">
                  ({syncMode === 'wifi_only' ? 'Samo WiFi' : syncMode === 'wifi_and_mobile' ? 'WiFi + Mobilni' : 'Ručno'})
                </span>
              </div>
              <button
                onClick={() => setShowNetworkSettings(!showNetworkSettings)}
                className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
              >
                Podešavanja
                {showNetworkSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Inline network settings */}
            {showNetworkSettings && (
              <div className="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Podešavanja mreže za upload
                </h4>
                <div className="space-y-3">
                  {/* Sync mode */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Način sinhronizacije</span>
                    </div>
                    <select
                      value={syncMode}
                      onChange={(e) => handleSettingChange('syncMode', e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="wifi_only">Samo WiFi</option>
                      <option value="wifi_and_mobile">WiFi + Mobilni podaci</option>
                      <option value="manual">Ručno</option>
                    </select>
                  </div>

                  {/* Allow roaming */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">Dozvoli roming</span>
                        <p className="text-xs text-gray-500">Upload dok ste u romingu</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSettingChange('allowRoaming', !allowRoaming)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        allowRoaming ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          allowRoaming ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>

                  {syncMode === 'wifi_and_mobile' && !allowRoaming && (
                    <p className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                      Upload preko mobilnih podataka je dozvoljen, ali ne u romingu. Uključite roming ako želite upload i dok ste u inostranstvu.
                    </p>
                  )}

                  {/* Backup folders */}
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Backup folderi (mobilna app)</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      {(user?.settings?.backupFolders || []).length === 0 ? (
                        <p className="text-xs text-gray-500">
                          Svi folderi na uređaju se backup-uju. Izaberite specifične foldere u mobilnoj aplikaciji.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="mb-2 text-xs text-gray-500">
                            Samo ovi folderi se backup-uju sa mobilnog uređaja:
                          </p>
                          {(user?.settings?.backupFolders || []).map((folder) => (
                            <div key={folder} className="flex items-center justify-between rounded-md bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-600">
                              <div className="flex items-center gap-2">
                                <Folder className="h-3.5 w-3.5 text-sky-500" />
                                <span className="text-gray-700 dark:text-gray-300">{folder}</span>
                              </div>
                              <button
                                onClick={async () => {
                                  const updated = (user?.settings?.backupFolders || []).filter((f) => f !== folder);
                                  await handleSettingChange('backupFolders', updated as any);
                                }}
                                className="rounded p-0.5 text-gray-400 hover:text-red-500"
                                title="Ukloni folder"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => handleSettingChange('backupFolders', [] as any)}
                            className="mt-1 text-xs text-sky-500 hover:text-sky-600"
                          >
                            Resetuj na sve foldere
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'rounded-xl border-2 border-dashed p-8 text-center transition-colors',
                !uploadPermission.allowed
                  ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800'
                  : isDragActive
                  ? 'cursor-pointer border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'cursor-pointer border-gray-300 hover:border-gray-400 dark:border-gray-600'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              {!uploadPermission.allowed ? (
                <p className="text-gray-500">Upload je trenutno blokiran mrežnim podešavanjima</p>
              ) : isDragActive ? (
                <p className="text-primary-600">Drop files here...</p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-300">
                    Drag and drop files here, or{' '}
                    <span className="text-primary-500">browse</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Files will upload automatically when selected
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
                    {isUploading && 'Uploading... '}
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
              {isUploading ? 'Close (uploads continue)' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
