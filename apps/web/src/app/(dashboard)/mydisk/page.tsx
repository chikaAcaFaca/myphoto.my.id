'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Folder,
  FolderPlus,
  Upload,
  Download,
  Trash2,
  ChevronRight,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  MoreVertical,
  ArrowLeft,
  Pencil,
  X,
  Check,
  Loader2,
  FolderInput,
  CheckSquare,
  Square,
  Copy,
  Scissors,
  ClipboardPaste,
  Share2,
  Link2,
  Globe,
  ExternalLink,
  Crop,
  Eraser,
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { StorageLimitBanner } from '@/components/onboarding/storage-limit-banner';

interface DiskFolder {
  id: string;
  name: string;
  parentId: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

interface DiskFile {
  id: string;
  name: string;
  s3Key: string;
  mimeType: string;
  size: number;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gz'))
    return FileArchive;
  if (mimeType.includes('pdf') || mimeType.includes('doc') || mimeType.includes('text'))
    return FileText;
  return File;
};

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('sr-Latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function MyDiskPage() {
  const { user } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [currentFolderId, setCurrentFolderId] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'file' | 'background'; item: any } | null>(null);
  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'cut'; files: DiskFile[]; folders: DiskFolder[] } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<DiskFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moving, setMoving] = useState(false);
  const [shareModal, setShareModal] = useState<{ type: 'file' | 'folder'; item: any } | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareData, setShareData] = useState<{ token: string; shareUrl: string; permission: string } | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Fetch current folder contents
  const { data, isLoading } = useQuery({
    queryKey: ['mydisk', currentFolderId, user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/folders?parentId=${currentFolderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ folders: DiskFolder[]; files: DiskFile[] }>;
    },
    enabled: !!user,
  });

  // Fetch shares accessible to this user ("Deljeno sa mnom")
  const { data: sharedWithMeData } = useQuery({
    queryKey: ['mydisk-shared-with-me', user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch('/api/disk-share/my-shares', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ shares: { shareToken: string; type: string; itemName: string; permission: string; ownerName: string; ownerUserId: string; folderId: string | null; diskFileId: string | null }[] }>;
    },
    enabled: !!user,
  });

  const sharedWithMe = sharedWithMeData?.shares || [];

  const folders = data?.folders || [];
  const files = data?.files || [];

  const selectionCount = selectedFiles.size + selectedFolders.size;
  const hasSelection = selectionCount > 0;

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  const toggleFileSelection = useCallback((fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const toggleFolderSelection = useCallback((folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(files.map((f) => f.id)));
    setSelectedFolders(new Set(folders.map((f) => f.id)));
  }, [files, folders]);

  // Navigate into a folder
  const navigateToFolder = useCallback((folder: DiskFolder) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    clearSelection();
  }, [clearSelection]);

  // Navigate back to a breadcrumb
  const navigateToBreadcrumb = useCallback((index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
      setCurrentFolderId('root');
    } else {
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setCurrentFolderId(breadcrumbs[index].id);
    }
    clearSelection();
  }, [breadcrumbs, clearSelection]);

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = await getIdToken();
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      setShowNewFolder(false);
      setNewFolderName('');
    },
    onError: (err: Error) => {
      addNotification({ type: 'error', title: 'Greška', message: err.message });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/folders?folderId=${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({ type: 'success', title: 'Folder obrisan' });
    },
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: string; name: string }) => {
      const token = await getIdToken();
      const res = await fetch('/api/folders', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, name }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      setRenamingId(null);
    },
  });

  // Rename file mutation
  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: string; name: string }) => {
      const token = await getIdToken();
      const res = await fetch('/api/disk-files', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', fileId, name }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      setRenamingId(null);
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const token = await getIdToken();
      const res = await fetch(`/api/disk-files?fileId=${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({ type: 'success', title: 'Fajl obrisan' });
    },
  });

  // Move selected items
  const handleMoveItems = async (targetFolderId: string) => {
    setMoving(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/disk-files', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          fileIds: Array.from(selectedFiles),
          folderIds: Array.from(selectedFolders),
          targetFolderId,
        }),
      });
      if (!res.ok) throw new Error('Move failed');
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({ type: 'success', title: `${selectionCount} stavki premešteno` });
      clearSelection();
      setShowMoveModal(false);
    } catch {
      addNotification({ type: 'error', title: 'Greška pri premeštanju' });
    } finally {
      setMoving(false);
    }
  };

  // Delete selected items
  const handleDeleteSelected = useCallback(async () => {
    const count = selectedFiles.size + selectedFolders.size;
    if (count === 0) return;
    try {
      const token = await getIdToken();
      for (const fileId of selectedFiles) {
        await fetch(`/api/disk-files?fileId=${fileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      for (const folderId of selectedFolders) {
        await fetch(`/api/folders?folderId=${folderId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({ type: 'success', title: `${count} stavki obrisano` });
      clearSelection();
    } catch {
      addNotification({ type: 'error', title: 'Greška pri brisanju' });
    }
  }, [selectedFiles, selectedFolders, queryClient, addNotification, clearSelection]);

  // Copy/cut selected items to clipboard
  const handleCopy = useCallback((action: 'copy' | 'cut') => {
    const count = selectedFiles.size + selectedFolders.size;
    if (count === 0) return;
    const clipFiles = files.filter((f) => selectedFiles.has(f.id));
    const clipFolders = folders.filter((f) => selectedFolders.has(f.id));
    setClipboard({ action, files: clipFiles, folders: clipFolders });
    addNotification({ type: 'success', title: `${count} stavki ${action === 'copy' ? 'kopirano' : 'isečeno'}` });
  }, [selectedFiles, selectedFolders, files, folders, addNotification]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    if (!clipboard) return;
    try {
      const token = await getIdToken();
      if (clipboard.action === 'cut') {
        await fetch('/api/disk-files', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move',
            fileIds: clipboard.files.map((f) => f.id),
            folderIds: clipboard.folders.map((f) => f.id),
            targetFolderId: currentFolderId,
          }),
        });
      } else {
        // Deep copy files and folders (S3 copy + new Firestore records)
        await fetch('/api/disk-files', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'copy',
            fileIds: clipboard.files.map((f) => f.id),
            folderIds: clipboard.folders.map((f) => f.id),
            targetFolderId: currentFolderId,
          }),
        });
      }
      setClipboard(null);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({ type: 'success', title: clipboard.action === 'cut' ? 'Stavke premeštene' : 'Fajlovi kopirani' });
    } catch {
      addNotification({ type: 'error', title: 'Greška pri lepljenju' });
    }
  }, [clipboard, currentFolderId, clearSelection, queryClient, addNotification]);

  // Open share modal for a file or folder
  const handleShare = useCallback(async (type: 'file' | 'folder', item: any) => {
    setShareModal({ type, item });
    setShareLoading(true);
    setShareData(null);
    setShareCopied(false);

    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (type === 'file') params.set('diskFileId', item.id);
      else params.set('folderId', item.id);

      const res = await fetch(`/api/disk-share?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.shared) {
        setShareData({
          token: data.token,
          shareUrl: data.shareUrl,
          permission: data.permission,
        });
      }
    } catch {
      // No existing share - that's fine
    } finally {
      setShareLoading(false);
    }
  }, []);

  // Create or update share link
  const handleCreateShare = useCallback(async (permission: 'read' | 'readwrite') => {
    if (!shareModal) return;
    setShareLoading(true);
    try {
      const token = await getIdToken();
      const body: any = { permission };
      if (shareModal.type === 'file') body.diskFileId = shareModal.item.id;
      else body.folderId = shareModal.item.id;

      const res = await fetch('/api/disk-share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setShareData({
        token: data.token,
        shareUrl: data.shareUrl,
        permission: data.permission,
      });
      setShareCopied(false);
    } catch {
      addNotification({ type: 'error', title: 'Greška pri deljenju' });
    } finally {
      setShareLoading(false);
    }
  }, [shareModal, addNotification]);

  // Update share permission
  const handleUpdateSharePermission = useCallback(async (permission: 'read' | 'readwrite') => {
    if (!shareData) return;
    try {
      const token = await getIdToken();
      const res = await fetch('/api/disk-share', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shareData.token, permission }),
      });
      if (!res.ok) throw new Error('Failed');
      setShareData((prev) => prev ? { ...prev, permission } : null);
      addNotification({ type: 'success', title: `Dozvola ažurirana: ${permission === 'read' ? 'Čitanje' : 'Čitanje i pisanje'}` });
    } catch {
      addNotification({ type: 'error', title: 'Greška pri ažuriranju' });
    }
  }, [shareData, addNotification]);

  // Revoke share
  const handleRevokeShare = useCallback(async () => {
    if (!shareData) return;
    try {
      const token = await getIdToken();
      const res = await fetch('/api/disk-share', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: shareData.token }),
      });
      if (!res.ok) throw new Error('Failed');
      setShareData(null);
      addNotification({ type: 'success', title: 'Deljenje ukinuto' });
    } catch {
      addNotification({ type: 'error', title: 'Greška' });
    }
  }, [shareData, addNotification]);

  // Copy share link to clipboard
  const handleCopyShareLink = useCallback(async () => {
    if (!shareData) return;
    const fullUrl = `${window.location.origin}${shareData.shareUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [shareData]);

  // Keyboard shortcuts: Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A, Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && hasSelection) {
        e.preventDefault();
        handleCopy('copy');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && hasSelection) {
        e.preventDefault();
        handleCopy('cut');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault();
        handlePaste();
      }
      if (e.key === 'Delete' && hasSelection) {
        e.preventDefault();
        handleDeleteSelected();
      }
      if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasSelection, clipboard, selectAll, handleCopy, handlePaste, handleDeleteSelected, clearSelection]);

  // Open file directly (get presigned URL and open in new tab)
  const handleOpenFileDirect = async (file: DiskFile) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/disk-files/download?fileId=${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank');
    } catch {
      addNotification({ type: 'error', title: 'Ne mogu da otvorim fajl' });
    }
  };

  // Upload a single file to a target folder
  const uploadSingleFile = async (file: File, targetFolderId: string, token: string) => {
    // 1. Get presigned URL
    const urlRes = await fetch('/api/disk-files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        folderId: targetFolderId,
      }),
    });
    if (!urlRes.ok) {
      const err = await urlRes.json();
      throw new Error(err.error || 'Failed to get upload URL');
    }
    const { uploadUrl, fileId, s3Key } = await urlRes.json();

    // 2. Upload to S3
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    // 3. Confirm upload
    await fetch('/api/disk-files', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, s3Key, filename: file.name, mimeType: file.type || 'application/octet-stream', size: file.size, folderId: targetFolderId }),
    });
  };

  // Create a folder and return its ID
  const createFolderForUpload = async (name: string, parentId: string, token: string): Promise<string> => {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    });
    if (!res.ok) {
      // Folder might already exist, try to find it
      const listRes = await fetch(`/api/folders?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const data = await listRes.json();
        const existing = data.folders?.find((f: DiskFolder) => f.name === name);
        if (existing) return existing.id;
      }
      throw new Error(`Failed to create folder: ${name}`);
    }
    const data = await res.json();
    return data.id;
  };

  // Upload files with folder structure
  const uploadFilesWithStructure = async (filesWithPaths: { file: File; relativePath: string }[]) => {
    setUploading(true);
    setUploadProgress(0);
    const total = filesWithPaths.length;
    let completed = 0;

    try {
      const token = await getIdToken() as string;
      if (!token) throw new Error('Not authenticated');
      // Cache created folder IDs: "path/to/folder" -> folderId
      const folderCache = new Map<string, string>();
      folderCache.set('', currentFolderId);

      for (const { file, relativePath } of filesWithPaths) {
        // Parse folder path: "folder1/subfolder/file.txt" -> ["folder1", "subfolder"]
        const parts = relativePath.split('/');
        parts.pop(); // remove filename

        // Create folder hierarchy
        let parentId = currentFolderId;
        let pathSoFar = '';
        for (const folderName of parts) {
          pathSoFar = pathSoFar ? `${pathSoFar}/${folderName}` : folderName;
          if (folderCache.has(pathSoFar)) {
            parentId = folderCache.get(pathSoFar)!;
          } else {
            const newFolderId = await createFolderForUpload(folderName, parentId, token);
            folderCache.set(pathSoFar, newFolderId);
            parentId = newFolderId;
          }
        }

        // Upload file into the correct folder
        await uploadSingleFile(file, parentId, token);
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      queryClient.invalidateQueries({ queryKey: ['mydisk'] });
      addNotification({
        type: 'success',
        title: 'Upload završen',
        message: `${total} fajl(ova) uspešno uploadovano`,
      });
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Upload greška', message: err.message || 'Upload nije uspeo' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // File upload (regular files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0) return;

    const filesWithPaths: { file: File; relativePath: string }[] = [];
    for (const file of Array.from(inputFiles)) {
      // webkitRelativePath is set when using webkitdirectory
      const relativePath = (file as any).webkitRelativePath || file.name;
      filesWithPaths.push({ file, relativePath });
    }

    await uploadFilesWithStructure(filesWithPaths);
    e.target.value = '';
  };

  // Drag and drop handler for folders
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const filesWithPaths: { file: File; relativePath: string }[] = [];

    // Recursively read directory entries
    const readEntry = async (entry: FileSystemEntry, path: string): Promise<void> => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
          (entry as FileSystemFileEntry).file(resolve, reject);
        });
        filesWithPaths.push({ file, relativePath: path ? `${path}/${file.name}` : file.name });
      } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          const allEntries: FileSystemEntry[] = [];
          const readBatch = () => {
            dirReader.readEntries((batch) => {
              if (batch.length === 0) {
                resolve(allEntries);
              } else {
                allEntries.push(...batch);
                readBatch();
              }
            }, reject);
          };
          readBatch();
        });
        const subPath = path ? `${path}/${entry.name}` : entry.name;
        for (const subEntry of entries) {
          await readEntry(subEntry, subPath);
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        await readEntry(entry, '');
      }
    }

    if (filesWithPaths.length > 0) {
      await uploadFilesWithStructure(filesWithPaths);
    }
  };

  // Open/preview file
  const handleOpenFile = async (file: DiskFile) => {
    const mime = file.mimeType;
    // Types that can be previewed in browser
    const previewable = mime.startsWith('image/') || mime.startsWith('video/') ||
      mime.startsWith('audio/') || mime === 'application/pdf' || mime.startsWith('text/');

    // For Office docs, use Google Docs Viewer or Microsoft Office Online
    const isOfficeDoc = mime.includes('word') || mime.includes('document') ||
      mime.includes('spreadsheet') || mime.includes('excel') ||
      mime.includes('presentation') || mime.includes('powerpoint');

    setPreviewFile(file);
    setPreviewLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch(`/api/disk-files/download?fileId=${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load file');

      const { downloadUrl } = await res.json();
      setPreviewUrl(downloadUrl);
    } catch {
      addNotification({ type: 'error', title: 'Ne mogu da otvorim fajl' });
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  // Download file via presigned URL (direct from S3, zero Vercel bandwidth)
  const handleDownload = async (file: DiskFile) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/disk-files/download?fileId=${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const { downloadUrl, fileName } = await res.json();
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      addNotification({ type: 'error', title: 'Download greška' });
    }
  };

  // Close context menu on click outside
  const handlePageClick = () => setContextMenu(null);

  return (
    <div
      className={cn('space-y-4 relative', dragOver && 'after:absolute after:inset-0 after:z-30 after:rounded-2xl after:border-4 after:border-dashed after:border-primary-400 after:bg-primary-50/50 after:dark:bg-primary-900/20')}
      onClick={handlePageClick}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-item-row]')) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'background', item: null });
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <HardDrive className="h-6 w-6 text-primary-500" />
            MyDisk
          </h1>
          <p className="text-sm text-gray-500">Vaši fajlovi organizovani po folderima</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <FolderPlus className="h-4 w-4" />
            Novi folder
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            Upload folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload fajlove
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          {/* @ts-ignore — webkitdirectory is non-standard but widely supported */}
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory=""
            directory=""
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <StorageLimitBanner />

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
          <div className="mb-1 flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-primary-200 dark:bg-primary-800">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 font-medium',
            currentFolderId === 'root'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          )}
        >
          <HardDrive className="h-3.5 w-3.5" />
          C:
        </button>
        {breadcrumbs.map((bc, i) => (
          <div key={bc.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            <button
              onClick={() => navigateToBreadcrumb(i)}
              className={cn(
                'rounded px-2 py-1 font-medium',
                i === breadcrumbs.length - 1
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {bc.name}
            </button>
          </div>
        ))}
      </div>

      {/* New folder input */}
      <AnimatePresence>
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-50 p-3 dark:border-primary-700 dark:bg-primary-900/20">
              <Folder className="h-5 w-5 text-primary-500" />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    createFolderMutation.mutate(newFolderName.trim());
                  }
                  if (e.key === 'Escape') {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }
                }}
                placeholder="Naziv foldera..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={() => {
                  if (newFolderName.trim()) createFolderMutation.mutate(newFolderName.trim());
                }}
                disabled={!newFolderName.trim()}
                className="rounded p-1 text-green-600 hover:bg-green-100 disabled:opacity-30"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <HardDrive className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Prazan folder</h2>
          <p className="mt-2 max-w-md text-gray-500">
            {currentFolderId === 'root'
              ? 'Kreirajte foldere, uploadujte fajlove ili prevucite foldere sa računara'
              : 'Prevucite foldere i fajlove ovde ili koristite dugmad iznad.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <FolderPlus className="h-4 w-4" />
              Novi folder
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
            >
              <Upload className="h-4 w-4" />
              Upload fajlove
            </button>
          </div>
        </div>
      )}

      {/* File list */}
      {!isLoading && (folders.length > 0 || files.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Table header */}
          <div className="grid grid-cols-[32px_1fr_120px_160px_40px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasSelection) clearSelection();
                else selectAll();
              }}
              className="flex items-center justify-center"
            >
              {hasSelection ? (
                <CheckSquare className="h-4 w-4 text-primary-500" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
            <span>Naziv</span>
            <span>Veličina</span>
            <span>Izmenjeno</span>
            <span />
          </div>

          {/* Back button (if not root) */}
          {currentFolderId !== 'root' && (
            <button
              onClick={() => navigateToBreadcrumb(breadcrumbs.length - 2)}
              className="grid w-full grid-cols-[32px_1fr_120px_160px_40px] gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
            >
              <span />
              <span className="flex items-center gap-3 font-medium text-gray-600 dark:text-gray-400">
                <ArrowLeft className="h-4 w-4" />
                ..
              </span>
              <span />
              <span />
              <span />
            </button>
          )}

          {/* Folders */}
          {folders.map((folder) => {
            const isFolderSelected = selectedFolders.has(folder.id);
            return (
              <div
                key={folder.id}
                onDoubleClick={() => navigateToFolder(folder)}
                onClick={() => {
                  if (hasSelection) {
                    setSelectedFolders((prev) => {
                      const next = new Set(prev);
                      if (next.has(folder.id)) next.delete(folder.id);
                      else next.add(folder.id);
                      return next;
                    });
                  } else {
                    navigateToFolder(folder);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', item: folder });
                }}
                data-item-row
                className={cn(
                  'grid cursor-pointer grid-cols-[32px_1fr_120px_160px_40px] gap-2 border-b border-gray-100 px-4 py-2.5 text-sm hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-900/10',
                  isFolderSelected && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <button
                  onClick={(e) => toggleFolderSelection(folder.id, e)}
                  className="flex items-center justify-center"
                >
                  {isFolderSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary-500" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />
                  )}
                </button>
                <span className="flex items-center gap-3 font-medium">
                  {renamingId === folder.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Folder className="h-5 w-5 text-yellow-500" />
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renameValue.trim()) {
                            renameFolderMutation.mutate({ folderId: folder.id, name: renameValue.trim() });
                          }
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="rounded border border-primary-300 px-2 py-0.5 text-sm outline-none"
                      />
                    </div>
                  ) : (
                    <>
                      <Folder className="h-5 w-5 text-yellow-500" />
                      {folder.name}
                    </>
                  )}
                </span>
                <span className="text-gray-400">—</span>
                <span className="text-gray-500">{formatDate(folder.createdAt)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', item: folder });
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const isFileSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                onClick={() => {
                  if (hasSelection) {
                    setSelectedFiles((prev) => {
                      const next = new Set(prev);
                      if (next.has(file.id)) next.delete(file.id);
                      else next.add(file.id);
                      return next;
                    });
                  } else {
                    handleOpenFile(file);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', item: file });
                }}
                data-item-row
                className={cn(
                  'grid cursor-pointer grid-cols-[32px_1fr_120px_160px_40px] gap-2 border-b border-gray-100 px-4 py-2.5 text-sm hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-900/10',
                  isFileSelected && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <button
                  onClick={(e) => toggleFileSelection(file.id, e)}
                  className="flex items-center justify-center"
                >
                  {isFileSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary-500" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-300" />
                  )}
                </button>
                <span className="flex items-center gap-3 truncate">
                  <Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  {renamingId === file.id ? (
                    <input
                      autoFocus
                      className="rounded border px-1 py-0.5 text-sm dark:bg-gray-800 dark:border-gray-600"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          renameFileMutation.mutate({ fileId: file.id, name: renameValue.trim() });
                        }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => {
                        if (renameValue.trim() && renameValue.trim() !== file.name) {
                          renameFileMutation.mutate({ fileId: file.id, name: renameValue.trim() });
                        } else {
                          setRenamingId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate">{file.name}</span>
                  )}
                </span>
                <span className="text-gray-500">{formatSize(file.size)}</span>
                <span className="text-gray-500">{formatDate(file.createdAt)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', item: file });
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'background' ? (
              <>
                <button
                  onClick={() => { setShowNewFolder(true); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FolderPlus className="h-4 w-4" /> Novi folder
                </button>
                <button
                  onClick={() => { folderInputRef.current?.click(); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FolderPlus className="h-4 w-4" /> Upload folder
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Upload className="h-4 w-4" /> Upload fajlove
                </button>
                {clipboard && (
                  <>
                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <button
                      onClick={() => { handlePaste(); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <FolderInput className="h-4 w-4" /> Nalepi ({clipboard.files.length + clipboard.folders.length})
                    </button>
                  </>
                )}
              </>
            ) : contextMenu.type === 'folder' ? (
              <>
                <button
                  onClick={() => { navigateToFolder(contextMenu.item); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Folder className="h-4 w-4" /> Otvori
                </button>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => {
                    setSelectedFolders(new Set([contextMenu.item.id]));
                    setSelectedFiles(new Set());
                    setClipboard({ action: 'cut', files: [], folders: [contextMenu.item] });
                    addNotification({ type: 'success', title: 'Folder isečen' });
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Scissors className="h-4 w-4" /> Iseci
                </button>
                <button
                  onClick={() => {
                    setSelectedFolders(new Set([contextMenu.item.id]));
                    setSelectedFiles(new Set());
                    setShowMoveModal(true);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FolderInput className="h-4 w-4" /> Premesti u...
                </button>
                <button
                  onClick={() => {
                    handleShare('folder', contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Share2 className="h-4 w-4" /> Podeli
                </button>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => {
                    setRenamingId(contextMenu.item.id);
                    setRenameValue(contextMenu.item.name);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-4 w-4" /> Preimenuj
                </button>
                <button
                  onClick={() => { deleteFolderMutation.mutate(contextMenu.item.id); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Obriši
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { handleOpenFile(contextMenu.item); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <File className="h-4 w-4" /> Otvori pregled
                </button>
                <button
                  onClick={() => { handleOpenFileDirect(contextMenu.item); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4" /> Otvori fajl
                </button>
                {contextMenu.item.mimeType?.startsWith('image/') && (
                  <>
                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <button
                      onClick={() => { window.open(`/tools/image-editor?fileId=${contextMenu.item.id}`, '_blank'); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                      <Crop className="h-4 w-4" /> Uredi / Napravi mim
                    </button>
                    <button
                      onClick={() => { window.open(`/tools/remove-bg?fileId=${contextMenu.item.id}`, '_blank'); setContextMenu(null); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                      <Eraser className="h-4 w-4" /> Ukloni pozadinu
                    </button>
                  </>
                )}
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => {
                    setClipboard({ action: 'copy', files: [contextMenu.item], folders: [] });
                    addNotification({ type: 'success', title: 'Fajl kopiran' });
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4" /> Kopiraj
                </button>
                <button
                  onClick={() => {
                    setClipboard({ action: 'cut', files: [contextMenu.item], folders: [] });
                    addNotification({ type: 'success', title: 'Fajl isečen' });
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Scissors className="h-4 w-4" /> Iseci
                </button>
                <button
                  onClick={() => {
                    setSelectedFiles(new Set([contextMenu.item.id]));
                    setSelectedFolders(new Set());
                    setShowMoveModal(true);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <FolderInput className="h-4 w-4" /> Premesti u...
                </button>
                <button
                  onClick={() => {
                    handleShare('file', contextMenu.item);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Share2 className="h-4 w-4" /> Podeli
                </button>
                <button
                  onClick={() => {
                    setRenamingId(contextMenu.item.id);
                    setRenameValue(contextMenu.item.name);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Pencil className="h-4 w-4" /> Preimenuj
                </button>
                <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => { handleDownload(contextMenu.item); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Download className="h-4 w-4" /> Preuzmi
                </button>
                <button
                  onClick={() => { deleteFileMutation.mutate(contextMenu.item.id); setContextMenu(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" /> Obriši
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
          >
            <span className="mr-2 text-sm font-medium">{selectionCount} izabrano</span>
            <button
              onClick={() => setShowMoveModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
            >
              <FolderInput className="h-4 w-4" /> Premesti
            </button>
            <button
              onClick={() => handleCopy('copy')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Copy className="h-4 w-4" /> Kopiraj
            </button>
            <button
              onClick={() => handleCopy('cut')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Scissors className="h-4 w-4" /> Iseci
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" /> Obriši
            </button>
            {clipboard && (
              <button
                onClick={handlePaste}
                className="flex items-center gap-1.5 rounded-lg border border-green-300 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
              >
                <ClipboardPaste className="h-4 w-4" /> Nalepi
              </button>
            )}
            <button
              onClick={clearSelection}
              className="ml-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move to Folder Modal */}
      <AnimatePresence>
        {showMoveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowMoveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold">Premesti u folder</h3>
                <p className="text-sm text-gray-500">{selectionCount} stavki</p>
              </div>
              <FolderPicker
                currentFolderId={currentFolderId}
                selectedFolders={selectedFolders}
                onSelect={(targetId) => handleMoveItems(targetId)}
                moving={moving}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShareModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-500" />
                  <h3 className="text-lg font-semibold">Podeli</h3>
                </div>
                <button
                  onClick={() => setShareModal(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Item info */}
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                  {shareModal.type === 'folder' ? (
                    <Folder className="h-8 w-8 text-yellow-500" />
                  ) : (
                    (() => { const Icon = getFileIcon(shareModal.item.mimeType || ''); return <Icon className="h-8 w-8 text-gray-400" />; })()
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{shareModal.item.name}</p>
                    <p className="text-xs text-gray-500">
                      {shareModal.type === 'folder' ? 'Folder' : formatSize(shareModal.item.size)}
                    </p>
                  </div>
                </div>

                {shareLoading && !shareData ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                  </div>
                ) : shareData ? (
                  <>
                    {/* Share link */}
                    <div className="mb-4">
                      <label className="mb-1.5 block text-xs font-medium text-gray-500">Link za deljenje</label>
                      <div className="flex gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
                          <Link2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="truncate text-sm">{window.location.origin}{shareData.shareUrl}</span>
                        </div>
                        <button
                          onClick={handleCopyShareLink}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors',
                            shareCopied ? 'bg-green-500' : 'bg-primary-500 hover:bg-primary-600'
                          )}
                        >
                          {shareCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {shareCopied ? 'Kopirano!' : 'Kopiraj'}
                        </button>
                      </div>
                    </div>

                    {/* Permission selector */}
                    <div className="mb-4">
                      <label className="mb-1.5 block text-xs font-medium text-gray-500">Dozvola</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSharePermission('read')}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                            shareData.permission === 'read'
                              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                          )}
                        >
                          <Globe className="h-4 w-4" />
                          Samo čitanje
                        </button>
                        <button
                          onClick={() => handleUpdateSharePermission('readwrite')}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                            shareData.permission === 'readwrite'
                              ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                          )}
                        >
                          <Pencil className="h-4 w-4" />
                          Čitanje i pisanje
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-gray-400">
                        {shareData.permission === 'read'
                          ? 'Korisnici mogu da pregledaju i preuzmu sadržaj.'
                          : 'Korisnici mogu da pregledaju, preuzmu i uploaduju fajlove.'}
                      </p>
                    </div>

                    {/* Open in new tab */}
                    <a
                      href={shareData.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-4 flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Otvori deljeni link
                    </a>

                    {/* Revoke share */}
                    <button
                      onClick={handleRevokeShare}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      Ukini deljenje
                    </button>
                  </>
                ) : (
                  <>
                    {/* No share exists yet — create one */}
                    <p className="mb-4 text-sm text-gray-500">
                      Kreirajte link za deljenje koji bilo ko sa linkom može da koristi.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCreateShare('read')}
                        disabled={shareLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        <Globe className="h-4 w-4" />
                        Samo čitanje
                      </button>
                      <button
                        onClick={() => handleCreateShare('readwrite')}
                        disabled={shareLoading}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Čitanje i pisanje
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary bar */}
      {!isLoading && (folders.length > 0 || files.length > 0) && (
        <div className="text-xs text-gray-500">
          {folders.length > 0 && `${folders.length} folder(a)`}
          {folders.length > 0 && files.length > 0 && ' · '}
          {files.length > 0 && `${files.length} fajl(ova)`}
          {files.length > 0 && ` · ${formatSize(files.reduce((sum, f) => sum + f.size, 0))}`}
        </div>
      )}

      {/* Shared with me section — only show on root folder */}
      {currentFolderId === 'root' && sharedWithMe.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            <Share2 className="h-4 w-4" />
            Deljeno sa mnom
          </h2>
          <div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10">
            {sharedWithMe.map((share, i) => (
              <a
                key={share.shareToken}
                href={`/shared/disk/${share.shareToken}`}
                className={cn(
                  'grid grid-cols-[1fr_120px_100px] gap-2 px-4 py-2.5 text-sm hover:bg-blue-100/50 dark:hover:bg-blue-900/20',
                  i < sharedWithMe.length - 1 && 'border-b border-blue-200 dark:border-blue-800'
                )}
              >
                <span className="flex items-center gap-3 font-medium">
                  {share.type === 'folder' ? (
                    <Folder className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <File className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="truncate">{share.itemName}</span>
                  <span className="flex-shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    od {share.ownerName}
                  </span>
                </span>
                <span className="text-xs text-gray-500">
                  {share.permission === 'readwrite' ? 'Citanje i pisanje' : 'Samo citanje'}
                </span>
                <span className="flex items-center justify-end">
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={closePreview}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-2 truncate">
                  {(() => { const Icon = getFileIcon(previewFile.mimeType); return <Icon className="h-5 w-5 text-gray-400" />; })()}
                  <span className="truncate font-medium">{previewFile.name}</span>
                  <span className="text-xs text-gray-400">{formatSize(previewFile.size)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Preuzmi"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={closePreview}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                  </div>
                ) : previewUrl ? (
                  <FilePreviewContent file={previewFile} url={previewUrl} />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilePreviewContent({ file, url }: { file: DiskFile; url: string }) {
  const mime = file.mimeType;

  // Images
  if (mime.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={file.name} className="max-h-[75vh] max-w-full object-contain" />
      </div>
    );
  }

  // Videos
  if (mime.startsWith('video/')) {
    return <VideoPreview file={file} url={url} />;
  }

  // Audio
  if (mime.startsWith('audio/')) {
    return <AudioPreview file={file} url={url} />;
  }

  // PDF
  if (mime === 'application/pdf') {
    return (
      <iframe src={url} className="h-[80vh] w-full" title={file.name} />
    );
  }

  // Text files
  if (mime.startsWith('text/') || mime === 'application/json') {
    return <TextFilePreview url={url} />;
  }

  // Office documents
  const isOffice = mime.includes('word') || mime.includes('document') ||
    mime.includes('spreadsheet') || mime.includes('excel') ||
    mime.includes('presentation') || mime.includes('powerpoint');

  if (isOffice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <FileText className="h-16 w-16 text-gray-400" />
        <p className="text-lg font-medium">{file.name}</p>
        <p className="text-sm text-gray-500">
          Office dokumenti se mogu preuzeti i otvoriti lokalno
        </p>
        <div className="flex gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600"
          >
            <ExternalLink className="h-4 w-4" />
            Otvori u aplikaciji
          </a>
          <a
            href={url}
            download={file.name}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            Preuzmi
          </a>
        </div>
      </div>
    );
  }

  // Unknown file type
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <File className="h-16 w-16 text-gray-400" />
      <p className="text-lg font-medium">{file.name}</p>
      <p className="text-sm text-gray-500">Pregled ovog tipa fajla nije podržan</p>
      <div className="flex gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600"
        >
          <ExternalLink className="h-4 w-4" />
          Otvori u aplikaciji
        </a>
        <a
          href={url}
          download={file.name}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <Download className="h-4 w-4" />
          Preuzmi
        </a>
      </div>
    </div>
  );
}

function VideoPreview({ file, url }: { file: DiskFile; url: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-black py-16">
        <FileVideo className="h-16 w-16 text-gray-500" />
        <p className="text-lg font-medium text-white">{file.name}</p>
        <p className="text-sm text-gray-400">
          Ovaj video format nije podržan u pregledaču.
        </p>
        <div className="flex gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600"
          >
            <ExternalLink className="h-4 w-4" />
            Otvori u video playeru
          </a>
          <a
            href={url}
            download={file.name}
            className="flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-medium text-white hover:bg-gray-800"
          >
            <Download className="h-4 w-4" />
            Preuzmi
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-black">
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="max-h-[75vh] max-w-full"
        onError={() => setError(true)}
      >
        Vaš pregledač ne podržava ovaj video format.
      </video>
      <div className="flex items-center gap-3 py-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Otvori u video playeru
        </a>
      </div>
    </div>
  );
}

function AudioPreview({ file, url }: { file: DiskFile; url: string }) {
  const [error, setError] = useState(false);
  const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="rounded-full bg-purple-100 p-6 dark:bg-purple-900/30">
          <FileAudio className="h-12 w-12 text-purple-500" />
        </div>
        <p className="text-lg font-semibold">{file.name}</p>
        <p className="text-sm text-gray-500">
          {ext} format nije podržan u pregledaču.
        </p>
        <div className="flex gap-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600"
          >
            <ExternalLink className="h-4 w-4" />
            Otvori u music playeru
          </a>
          <a
            href={url}
            download={file.name}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            Preuzmi
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-8 shadow-lg">
        <FileAudio className="h-16 w-16 text-white" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{file.name}</p>
        <p className="text-xs text-gray-400">{ext} · {formatSize(file.size)}</p>
      </div>
      <audio
        src={url}
        controls
        autoPlay
        className="w-full max-w-md"
        onError={() => setError(true)}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Otvori u music playeru na uređaju
      </a>
    </div>
  );
}

function FolderPicker({
  currentFolderId,
  selectedFolders,
  onSelect,
  moving,
}: {
  currentFolderId: string;
  selectedFolders: Set<string>;
  onSelect: (targetId: string) => void;
  moving: boolean;
}) {
  const { user } = useAuthStore();
  const [browseFolderId, setBrowseFolderId] = useState('root');
  const [browsePath, setBrowsePath] = useState<{ id: string; name: string }[]>([]);

  const { data } = useQuery({
    queryKey: ['mydisk-picker', browseFolderId, user?.id],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await fetch(`/api/folders?parentId=${browseFolderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ folders: DiskFolder[]; files: DiskFile[] }>;
    },
    enabled: !!user,
  });

  const pickerFolders = (data?.folders || []).filter((f) => !selectedFolders.has(f.id));

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-5 py-2 text-sm dark:border-gray-700">
        <button
          onClick={() => { setBrowseFolderId('root'); setBrowsePath([]); }}
          className={cn('rounded px-2 py-0.5 font-medium', browseFolderId === 'root' ? 'text-primary-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}
        >
          C:
        </button>
        {browsePath.map((bp, i) => (
          <div key={bp.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <button
              onClick={() => {
                setBrowsePath((prev) => prev.slice(0, i + 1));
                setBrowseFolderId(bp.id);
              }}
              className={cn('rounded px-2 py-0.5 font-medium', i === browsePath.length - 1 ? 'text-primary-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700')}
            >
              {bp.name}
            </button>
          </div>
        ))}
      </div>

      {/* Folder list */}
      <div className="max-h-64 overflow-y-auto p-2">
        {browseFolderId !== 'root' && (
          <button
            onClick={() => {
              if (browsePath.length <= 1) {
                setBrowseFolderId('root');
                setBrowsePath([]);
              } else {
                const newPath = browsePath.slice(0, -1);
                setBrowsePath(newPath);
                setBrowseFolderId(newPath[newPath.length - 1].id);
              }
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> ..
          </button>
        )}
        {pickerFolders.length === 0 && browseFolderId === 'root' && (
          <p className="px-3 py-4 text-center text-sm text-gray-400">Nema foldera</p>
        )}
        {pickerFolders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => {
              setBrowsePath((prev) => [...prev, { id: folder.id, name: folder.name }]);
              setBrowseFolderId(folder.id);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Folder className="h-4 w-4 text-yellow-500" />
            {folder.name}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
        <span className="text-xs text-gray-400">
          Odredište: {browseFolderId === 'root' ? 'C:' : browsePath[browsePath.length - 1]?.name}
        </span>
        <button
          onClick={() => onSelect(browseFolderId)}
          disabled={moving || browseFolderId === currentFolderId}
          className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {moving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Premesti ovde'}
        </button>
      </div>
    </div>
  );
}

function TextFilePreview({ url }: { url: string }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => { setText(t); setLoaded(true); })
      .catch(() => { setText('Greška pri učitavanju fajla'); setLoaded(true); });
  }, [url]);

  if (!loaded) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap p-6 font-mono text-sm text-gray-800 dark:text-gray-200">
      {text}
    </pre>
  );
}
