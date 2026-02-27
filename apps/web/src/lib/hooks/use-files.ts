'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { db, Timestamp } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { FileMetadata } from '@myphoto/shared';
import { useAuthStore, useFilesStore } from '../stores';
import { generateDownloadUrl, deleteObject } from '../s3';
import { getIdToken } from '../firebase';
import { queueFileForUpload, requestBackgroundSync } from '../upload-queue';

const PAGE_SIZE = 50;

interface FilesQueryParams {
  type?: string;
  albumId?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
}

// Helper to convert Firestore document to FileMetadata
function docToFile(doc: any): FileMetadata {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    takenAt: data.takenAt?.toDate(),
    trashedAt: data.trashedAt?.toDate(),
  } as FileMetadata;
}

export function useFiles(params?: FilesQueryParams) {
  const user = useAuthStore((state) => state.user);

  return useInfiniteQuery({
    queryKey: ['files', user?.id, params],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) throw new Error('Not authenticated');

      // Simple query - only filter by userId (no composite index needed)
      const q = query(
        collection(db, 'files'),
        where('userId', '==', user.id)
      );

      const snapshot = await getDocs(q);
      let files = snapshot.docs.map(docToFile);

      // Client-side filtering
      if (params?.type) {
        files = files.filter((f) => f.type === params.type);
      }
      if (params?.isFavorite !== undefined) {
        files = files.filter((f) => f.isFavorite === params.isFavorite);
      }
      if (params?.isArchived !== undefined) {
        files = files.filter((f) => f.isArchived === params.isArchived);
      }
      if (params?.isTrashed !== undefined) {
        files = files.filter((f) => f.isTrashed === params.isTrashed);
      }
      if (params?.albumId) {
        files = files.filter((f) => f.albumIds?.includes(params.albumId!));
      }

      // Client-side sorting (newest first)
      files.sort((a, b) => {
        const dateA = (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).getTime();
        const dateB = (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).getTime();
        return dateB - dateA;
      });

      // Client-side pagination
      const start = pageParam as number;
      const paginatedFiles = files.slice(start, start + PAGE_SIZE);

      return {
        files: paginatedFiles,
        nextOffset: start + PAGE_SIZE,
        hasMore: start + PAGE_SIZE < files.length,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextOffset : undefined),
    enabled: !!user,
    initialPageParam: 0,
  });
}

export function useFile(fileId: string) {
  return useQuery({
    queryKey: ['file', fileId],
    queryFn: async () => {
      const docRef = doc(db, 'files', fileId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('File not found');
      }

      return docToFile(docSnap);
    },
    enabled: !!fileId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (file: File): Promise<FileMetadata | { queued: true }> => {
      if (!user) throw new Error('Not authenticated');

      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

      // If offline, queue for background upload
      if (!navigator.onLine) {
        const ok = await queueFileForUpload(file, token);
        if (ok) {
          await requestBackgroundSync();
          return { queued: true };
        }
        throw new Error('Offline and unable to queue file');
      }

      try {
        // 1. Get pre-signed upload URL from server
        const urlRes = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        });

        if (!urlRes.ok) {
          const err = await urlRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to get upload URL');
        }

        const { uploadUrl, fileId, s3Key, thumbnailUploadUrl, thumbnailKey } = await urlRes.json();

        // 2. Upload directly to S3 using pre-signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to storage');
        }

        // 2.5. Extract thumbnail and upload it (for both images and videos)
        let uploadedThumbKey: string | undefined;
        let localThumbBlob: Blob | null = null;
        if (thumbnailUploadUrl && thumbnailKey) {
          try {
            const thumbBlob = file.type.startsWith('video/')
              ? await extractVideoThumbnail(file)
              : await extractImageThumbnail(file);
            if (thumbBlob) {
              localThumbBlob = thumbBlob;
              const thumbRes = await fetch(thumbnailUploadUrl, {
                method: 'PUT',
                body: thumbBlob,
                headers: { 'Content-Type': 'image/webp' },
              });
              if (thumbRes.ok) {
                uploadedThumbKey = thumbnailKey;
              }
            }
          } catch (e) {
            // Non-fatal: file will just have no thumbnail
            console.warn('Thumbnail extraction failed:', e);
          }
        }

        // 3. Confirm upload - creates Firestore doc and updates storage
        const confirmRes = await fetch('/api/files/confirm-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileId,
            s3Key,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            ...(uploadedThumbKey ? { thumbnailKey: uploadedThumbKey } : {}),
          }),
        });

        if (!confirmRes.ok) {
          const err = await confirmRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to confirm upload');
        }

        const result = await confirmRes.json() as FileMetadata;

        // Save local thumbnail blob URL for instant display
        if (localThumbBlob) {
          const blobUrl = URL.createObjectURL(localThumbBlob);
          useFilesStore.getState().setLocalThumbnail(result.id, blobUrl);
        }

        return result;
      } catch (err) {
        // Network error — queue for background upload
        if (err instanceof TypeError && err.message.includes('fetch')) {
          const ok = await queueFileForUpload(file, token);
          if (ok) {
            await requestBackgroundSync();
            return { queued: true };
          }
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      if ('queued' in result) return; // Don't invalidate — file isn't uploaded yet

      // Optimistically insert the new file into the cache (prepend to first page)
      queryClient.setQueriesData({ queryKey: ['files'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        const newFile = {
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        };
        const newPages = [...oldData.pages];
        newPages[0] = { ...newPages[0], files: [newFile, ...newPages[0].files] };
        return { ...oldData, pages: newPages };
      });

      // Storage is lightweight — invalidate immediately
      queryClient.invalidateQueries({ queryKey: ['storage'] });

      // Delayed full refresh to pick up AI processing results
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['files'] });
      }, 30000);
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      updates,
    }: {
      fileId: string;
      updates: Partial<Pick<FileMetadata, 'name' | 'isFavorite' | 'isArchived' | 'albumIds'>>;
    }) => {
      const docRef = doc(db, 'files', fileId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file', fileId] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (fileId: string) => {
      const docRef = doc(db, 'files', fileId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('File not found');
      }

      // Move to trash (soft delete)
      await updateDoc(docRef, {
        isTrashed: true,
        trashedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function usePermanentlyDeleteFile() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!user) throw new Error('Not authenticated');

      const docRef = doc(db, 'files', fileId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('File not found');
      }

      const fileData = docSnap.data();

      // Delete from S3
      await deleteObject(fileData.s3Key);
      if (fileData.thumbnailKey) {
        await deleteObject(fileData.thumbnailKey);
      }

      // Delete Firestore document
      await deleteDoc(docRef);

      // Update user storage
      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentUsed = userSnap.data().storageUsed || 0;
        await updateDoc(userRef, {
          storageUsed: Math.max(0, currentUsed - fileData.size),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const docRef = doc(db, 'files', fileId);
      await updateDoc(docRef, {
        isTrashed: false,
        trashedAt: null,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileIds: string[]) => {
      const batch = writeBatch(db);

      for (const fileId of fileIds) {
        const docRef = doc(db, 'files', fileId);
        batch.update(docRef, {
          isTrashed: true,
          trashedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useGetDownloadUrl() {
  return useMutation({
    mutationFn: async (s3Key: string) => {
      return generateDownloadUrl(s3Key);
    },
  });
}

/**
 * Extract a thumbnail from an image file using canvas.
 * Resizes to fit within 400x400 (cover crop) and outputs as WebP.
 */
function extractImageThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    img.onload = () => {
      try {
        const maxSize = 400;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        if (!iw || !ih) {
          cleanup();
          resolve(null);
          return;
        }

        // Scale to cover maxSize x maxSize, then crop center
        const scale = Math.max(maxSize / iw, maxSize / ih);
        const sw = Math.round(iw * scale);
        const sh = Math.round(ih * scale);
        const ox = Math.round((sw - maxSize) / 2);
        const oy = Math.round((sh - maxSize) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(img, -ox, -oy, sw, sh);

        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          'image/webp',
          0.8
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(null);
    };

    // Timeout: if extraction takes too long, skip
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);
  });
}

/**
 * Extract a thumbnail frame from a video file using canvas.
 * Seeks to 1s (or 25% of duration for short videos) and renders to 400x400 WebP.
 */
function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      // Seek to 1s or 25% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const maxSize = 400;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (!vw || !vh) {
          cleanup();
          resolve(null);
          return;
        }

        // Scale to fit within maxSize x maxSize (cover crop)
        const scale = Math.max(maxSize / vw, maxSize / vh);
        const sw = Math.round(vw * scale);
        const sh = Math.round(vh * scale);
        const ox = Math.round((sw - maxSize) / 2);
        const oy = Math.round((sh - maxSize) / 2);

        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(video, -ox, -oy, sw, sh);

        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          'image/webp',
          0.8
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    // Timeout: if extraction takes too long, skip
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);
  });
}
