import { create } from 'zustand';
import type { FileMetadata } from '@myphoto/shared';

interface FilesState {
  files: FileMetadata[];
  selectedFiles: Set<string>;
  viewMode: 'grid' | 'list';
  sortBy: 'date' | 'name' | 'size';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Upload state
  uploadQueue: UploadItem[];
  isUploading: boolean;

  // Actions
  setFiles: (files: FileMetadata[]) => void;
  appendFiles: (files: FileMetadata[]) => void;
  addFile: (file: FileMetadata) => void;
  updateFile: (fileId: string, updates: Partial<FileMetadata>) => void;
  removeFile: (fileId: string) => void;
  removeFiles: (fileIds: string[]) => void;

  // Selection
  selectFile: (fileId: string) => void;
  deselectFile: (fileId: string) => void;
  toggleFileSelection: (fileId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // View
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sortBy: 'date' | 'name' | 'size') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Pagination
  setPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;

  // Loading
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Upload
  addToUploadQueue: (items: UploadItem[]) => void;
  updateUploadProgress: (id: string, progress: number) => void;
  setUploadStatus: (id: string, status: UploadItem['status'], error?: string) => void;
  removeFromUploadQueue: (id: string) => void;
  clearCompletedUploads: () => void;
  setIsUploading: (isUploading: boolean) => void;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  fileId?: string;
}

export const useFilesStore = create<FilesState>()((set, get) => ({
  files: [],
  selectedFiles: new Set(),
  viewMode: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,

  uploadQueue: [],
  isUploading: false,

  // Files management
  setFiles: (files) => set({ files }),
  appendFiles: (newFiles) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
    })),
  addFile: (file) =>
    set((state) => ({
      files: [file, ...state.files],
    })),
  updateFile: (fileId, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    })),
  removeFile: (fileId) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
      selectedFiles: new Set([...state.selectedFiles].filter((id) => id !== fileId)),
    })),
  removeFiles: (fileIds) =>
    set((state) => ({
      files: state.files.filter((f) => !fileIds.includes(f.id)),
      selectedFiles: new Set([...state.selectedFiles].filter((id) => !fileIds.includes(id))),
    })),

  // Selection
  selectFile: (fileId) =>
    set((state) => ({
      selectedFiles: new Set([...state.selectedFiles, fileId]),
    })),
  deselectFile: (fileId) =>
    set((state) => ({
      selectedFiles: new Set([...state.selectedFiles].filter((id) => id !== fileId)),
    })),
  toggleFileSelection: (fileId) =>
    set((state) => {
      const newSelected = new Set(state.selectedFiles);
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId);
      } else {
        newSelected.add(fileId);
      }
      return { selectedFiles: newSelected };
    }),
  selectAll: () =>
    set((state) => ({
      selectedFiles: new Set(state.files.map((f) => f.id)),
    })),
  deselectAll: () => set({ selectedFiles: new Set() }),

  // View
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),

  // Pagination
  setPage: (page) => set({ page }),
  setHasMore: (hasMore) => set({ hasMore }),

  // Loading
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Upload
  addToUploadQueue: (items) =>
    set((state) => ({
      uploadQueue: [...state.uploadQueue, ...items],
    })),
  updateUploadProgress: (id, progress) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.map((item) =>
        item.id === id ? { ...item, progress } : item
      ),
    })),
  setUploadStatus: (id, status, error) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.map((item) =>
        item.id === id ? { ...item, status, error } : item
      ),
    })),
  removeFromUploadQueue: (id) =>
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((item) => item.id !== id),
    })),
  clearCompletedUploads: () =>
    set((state) => ({
      uploadQueue: state.uploadQueue.filter(
        (item) => item.status !== 'completed' && item.status !== 'error'
      ),
    })),
  setIsUploading: (isUploading) => set({ isUploading }),
}));
