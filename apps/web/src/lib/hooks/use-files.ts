'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { db, Timestamp } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import type { FileMetadata } from '@myphoto/shared';
import { useAuthStore } from '../stores';
import { generateDownloadUrl, deleteObject } from '../s3';
import { getIdToken } from '../firebase';

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
    queryFn: async ({ pageParam }) => {
      if (!user) throw new Error('Not authenticated');

      let q = query(
        collection(db, 'files'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (params?.type) {
        q = query(q, where('type', '==', params.type));
      }
      if (params?.isFavorite !== undefined) {
        q = query(q, where('isFavorite', '==', params.isFavorite));
      }
      if (params?.isArchived !== undefined) {
        q = query(q, where('isArchived', '==', params.isArchived));
      }
      if (params?.isTrashed !== undefined) {
        q = query(q, where('isTrashed', '==', params.isTrashed));
      }
      if (params?.albumId) {
        q = query(q, where('albumIds', 'array-contains', params.albumId));
      }

      if (pageParam) {
        q = query(q, startAfter(pageParam));
      }

      const snapshot = await getDocs(q);
      const files = snapshot.docs.map(docToFile);
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      return {
        files,
        lastDoc,
        hasMore: snapshot.docs.length === PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
    enabled: !!user,
    initialPageParam: null as any,
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
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const token = await getIdToken();
      if (!token) throw new Error('Not authenticated');

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

      const { uploadUrl, fileId, s3Key } = await urlRes.json();

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
        }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to confirm upload');
      }

      return await confirmRes.json() as FileMetadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
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
