'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  HardDrive,
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  ChevronRight,
  Download,
  Upload,
  Loader2,
  ArrowLeft,
  X,
  Eye,
  Lock,
  Gift,
  Shield,
  Cloud,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';

interface SharedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface SharedFolder {
  id: string;
  name: string;
  createdAt: string;
}

interface BrowseData {
  requiresAuth: boolean;
  type: 'file' | 'folder';
  permission: 'read' | 'readwrite';
  itemName: string;
  ownerName?: string;
  referralCode?: string;
  ownerUserId?: string;
  sharedFolderId?: string;
  currentFolderId?: string;
  breadcrumbs?: { id: string; name: string }[];
  folders?: SharedFolder[];
  files?: SharedFile[];
  file?: SharedFile;
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

export default function SharedDiskPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, isInitialized } = useAuthStore();

  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchData = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      const idToken = await getIdToken();
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const params = new URLSearchParams({ token });
      if (folderId) params.set('folderId', folderId);

      const res = await fetch(`/api/disk-share/browse?${params}`, { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const result = await res.json();
      setData(result);
      if (result.currentFolderId) setCurrentFolderId(result.currentFolderId);
    } catch (err: any) {
      setError(err.message || 'Greska pri ucitavanju');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    if (isInitialized) {
      fetchData();
    }
  }, [fetchData, isInitialized, user]);

  const navigateToFolder = (folderId: string) => {
    fetchData(folderId);
  };

  const navigateBack = () => {
    if (!data?.breadcrumbs?.length) {
      fetchData(data?.sharedFolderId || undefined);
    } else {
      const parent = data.breadcrumbs.length > 1
        ? data.breadcrumbs[data.breadcrumbs.length - 2].id
        : data.sharedFolderId;
      fetchData(parent || undefined);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    setDownloading(fileId);
    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/disk-share/download?token=${token}&fileId=${fileId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const { downloadUrl } = await res.json();
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Greska pri preuzimanju fajla');
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = async (file: SharedFile) => {
    const mime = file.mimeType;
    const previewable = mime.startsWith('image/') || mime.startsWith('video/') ||
      mime.startsWith('audio/') || mime === 'application/pdf' || mime.startsWith('text/');

    if (!previewable) {
      handleDownload(file.id, file.name);
      return;
    }

    setPreviewFile(file);
    setPreviewLoading(true);

    try {
      const idToken = await getIdToken();
      const res = await fetch(`/api/disk-share/download?token=${token}&fileId=${file.id}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error('Failed');
      const { downloadUrl } = await res.json();
      setPreviewUrl(downloadUrl);
    } catch {
      alert('Ne mogu da otvorim fajl');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (!inputFiles || inputFiles.length === 0 || !data) return;

    setUploading(true);
    setUploadProgress(0);
    const total = inputFiles.length;
    let completed = 0;

    try {
      const targetFolderId = currentFolderId || data.sharedFolderId;

      for (const file of Array.from(inputFiles)) {
        // 1. Get presigned URL
        const urlRes = await fetch('/api/disk-share/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            folderId: targetFolderId,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!urlRes.ok) {
          const err = await urlRes.json();
          throw new Error(err.error || 'Upload failed');
        }

        const { uploadUrl, fileId, s3Key } = await urlRes.json();

        // 2. Upload to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        // 3. Confirm upload
        await fetch('/api/disk-share/upload', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            fileId,
            s3Key,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            folderId: targetFolderId,
          }),
        });

        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
      }

      // Refresh
      fetchData(currentFolderId || undefined);
    } catch (err: any) {
      alert(err.message || 'Upload greska');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // Waiting for auth to initialize
  if (!isInitialized || (loading && !data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center dark:bg-gray-900">
        <div className="mb-6 rounded-full bg-red-100 p-6 dark:bg-red-900/30">
          <Lock className="h-12 w-12 text-red-400" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          {error === 'Share not found' ? 'Link nije pronadjen' :
           error === 'Share link expired' ? 'Link je istekao' :
           'Greska'}
        </h1>
        <p className="mb-8 max-w-md text-gray-500">
          {error === 'Share not found' ? 'Ovaj link za deljenje ne postoji ili je uklonjen.' :
           error === 'Share link expired' ? 'Vlasnik je ukinuo deljenje ovog sadrzaja.' :
           error}
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white hover:bg-primary-600"
        >
          Pocetna strana
        </Link>
      </div>
    );
  }

  if (!data) return null;

  // ===== REQUIRES AUTH: Landing page for unauthenticated users =====
  if (data.requiresAuth) {
    const registerUrl = data.referralCode
      ? `/register?ref=${data.referralCode}&redirect=/shared/disk/${token}`
      : `/register?redirect=/shared/disk/${token}`;
    const loginUrl = `/login?redirect=/shared/disk/${token}`;

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="MyCameraBackup.com" width={140} height={40} className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href={loginUrl}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Prijavi se
              </Link>
              <Link
                href={registerUrl}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Registruj se
              </Link>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          {/* Shared item preview */}
          <div className="mb-8 inline-flex rounded-full bg-primary-100 p-6 dark:bg-primary-900/30">
            {data.type === 'folder' ? (
              <Folder className="h-16 w-16 text-primary-500" />
            ) : (
              <File className="h-16 w-16 text-primary-500" />
            )}
          </div>

          {data.ownerName && (
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700 dark:text-gray-300">{data.ownerName}</span> deli sa vama:
            </p>
          )}

          <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
            {data.itemName}
          </h1>

          <p className="mb-2 text-gray-500">
            {data.type === 'folder' ? 'Deljeni folder' : 'Deljeni fajl'}
            {' · '}
            {data.permission === 'readwrite' ? 'Citanje i pisanje' : 'Samo citanje'}
          </p>

          <p className="mb-8 text-sm text-gray-400">
            Registrujte se da pristupite sadrzaju i dobijete besplatan prostor na cloud-u.
          </p>

          {/* CTA Buttons */}
          <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={registerUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl sm:w-auto"
            >
              <Gift className="h-5 w-5" />
              Registruj se besplatno
            </Link>
            <Link
              href={loginUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-8 py-4 text-lg font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 sm:w-auto"
            >
              Vec imam nalog
            </Link>
          </div>

          {/* Bonus info */}
          <div className="mb-12 rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-3 flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">Dobijate odmah besplatno:</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm dark:bg-gray-800 dark:text-green-400">
                <Cloud className="h-4 w-4" />
                1 GB cloud prostora
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm dark:bg-gray-800 dark:text-green-400">
                <Users className="h-4 w-4" />
                Pristup deljenom {data.type === 'folder' ? 'folderu' : 'fajlu'}
              </div>
              {data.referralCode && (
                <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-green-700 shadow-sm dark:bg-gray-800 dark:text-green-400">
                  <Gift className="h-4 w-4" />
                  +1 GB bonus za vas i prijatelja
                </div>
              )}
            </div>
          </div>

          {/* Value props */}
          <div className="grid gap-6 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <Shield className="mb-3 h-8 w-8 text-blue-500" />
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Privatno i sigurno</h3>
              <p className="text-sm text-gray-500">Vasi fajlovi su enkriptovani i privatni. Ne koristimo ih za AI trening.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <HardDrive className="mb-3 h-8 w-8 text-purple-500" />
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">MyDisk storage</h3>
              <p className="text-sm text-gray-500">Skladistite fajlove, foldere i dokumente. Pristupite sa bilo kog uredjaja.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <Users className="mb-3 h-8 w-8 text-green-500" />
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">Delite sa drugima</h3>
              <p className="text-sm text-gray-500">Delite fajlove i foldere sa prijateljima i kolegama jednim klikom.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 py-6 text-center dark:border-gray-700">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} MyCameraBackup.com — Besplatan cloud storage
          </p>
        </footer>
      </div>
    );
  }

  // ===== AUTHENTICATED: Show shared content =====
  const isFolder = data.type === 'folder';
  const canWrite = data.permission === 'readwrite';
  const isInSubfolder = data.breadcrumbs && data.breadcrumbs.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/mydisk" className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary-500" />
              <span className="font-semibold text-gray-900 dark:text-white">MyDisk</span>
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Eye className="h-3.5 w-3.5" />
              Deljeni {isFolder ? 'folder' : 'fajl'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              canWrite
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {canWrite ? 'Citanje i pisanje' : 'Samo citanje'}
            </span>
            <Link
              href="/mydisk"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Moj disk
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              {isFolder ? <Folder className="h-5 w-5 text-yellow-500" /> : (() => { const Icon = getFileIcon(data.file?.mimeType || ''); return <Icon className="h-5 w-5 text-gray-400" />; })()}
              {data.itemName}
            </h1>
          </div>
          {canWrite && isFolder && (
            <div className="flex gap-2">
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
                onChange={handleUpload}
              />
            </div>
          )}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
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

        {/* Single file view */}
        {data.type === 'file' && data.file && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            {(() => { const Icon = getFileIcon(data.file.mimeType); return <Icon className="mx-auto mb-4 h-16 w-16 text-gray-400" />; })()}
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{data.file.name}</h2>
            <p className="mb-1 text-sm text-gray-500">{formatSize(data.file.size)}</p>
            {data.file.createdAt && (
              <p className="mb-6 text-sm text-gray-400">{formatDate(data.file.createdAt)}</p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handlePreview(data.file!)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Eye className="h-4 w-4" /> Pregledaj
              </button>
              <button
                onClick={() => handleDownload(data.file!.id, data.file!.name)}
                disabled={downloading === data.file.id}
                className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {downloading === data.file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Preuzmi
              </button>
            </div>
          </div>
        )}

        {/* Folder view */}
        {isFolder && (
          <>
            {/* Breadcrumbs */}
            <div className="mb-3 flex items-center gap-1 text-sm">
              <button
                onClick={() => fetchData(data.sharedFolderId || undefined)}
                className="flex items-center gap-1 rounded px-2 py-1 font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <HardDrive className="h-3.5 w-3.5" />
                {data.itemName}
              </button>
              {data.breadcrumbs?.map((bc, i) => (
                <div key={bc.id} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  <button
                    onClick={() => fetchData(bc.id)}
                    className={`rounded px-2 py-1 font-medium ${
                      i === (data.breadcrumbs?.length || 0) - 1
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {bc.name}
                  </button>
                </div>
              ))}
            </div>

            {/* File list */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_100px_140px_80px] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800/50">
                <span>Naziv</span>
                <span>Velicina</span>
                <span>Datum</span>
                <span />
              </div>

              {/* Back button */}
              {isInSubfolder && (
                <button
                  onClick={navigateBack}
                  className="grid w-full grid-cols-[1fr_100px_140px_80px] gap-2 border-b border-gray-100 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
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
              {data.folders?.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.id)}
                  className="grid cursor-pointer grid-cols-[1fr_100px_140px_80px] gap-2 border-b border-gray-100 px-4 py-2.5 text-sm hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-900/10"
                >
                  <span className="flex items-center gap-3 font-medium">
                    <Folder className="h-5 w-5 text-yellow-500" />
                    {folder.name}
                  </span>
                  <span className="text-gray-400">&mdash;</span>
                  <span className="text-gray-500">{formatDate(folder.createdAt)}</span>
                  <span />
                </div>
              ))}

              {/* Files */}
              {data.files?.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="grid grid-cols-[1fr_100px_140px_80px] gap-2 border-b border-gray-100 px-4 py-2.5 text-sm hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-900/10"
                  >
                    <span
                      className="flex cursor-pointer items-center gap-3 truncate"
                      onClick={() => handlePreview(file)}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="text-gray-500">{formatSize(file.size)}</span>
                    <span className="text-gray-500">{formatDate(file.createdAt)}</span>
                    <button
                      onClick={() => handleDownload(file.id, file.name)}
                      disabled={downloading === file.id}
                      className="flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
                      title="Preuzmi"
                    >
                      {downloading === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Empty state */}
              {(!data.folders || data.folders.length === 0) && (!data.files || data.files.length === 0) && (
                <div className="py-12 text-center">
                  <Folder className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="text-gray-500">Prazan folder</p>
                  {canWrite && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                    >
                      <Upload className="h-4 w-4" />
                      Upload fajlove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            {((data.folders?.length || 0) > 0 || (data.files?.length || 0) > 0) && (
              <div className="mt-2 text-xs text-gray-500">
                {(data.folders?.length || 0) > 0 && `${data.folders!.length} folder(a)`}
                {(data.folders?.length || 0) > 0 && (data.files?.length || 0) > 0 && ' · '}
                {(data.files?.length || 0) > 0 && `${data.files!.length} fajl(ova)`}
                {(data.files?.length || 0) > 0 && ` · ${formatSize(data.files!.reduce((sum, f) => sum + f.size, 0))}`}
              </div>
            )}
          </>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-2 truncate">
                {(() => { const Icon = getFileIcon(previewFile.mimeType); return <Icon className="h-5 w-5 text-gray-400" />; })()}
                <span className="truncate font-medium">{previewFile.name}</span>
                <span className="text-xs text-gray-400">{formatSize(previewFile.size)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile.id, previewFile.name)}
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

            <div className="flex-1 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : previewUrl ? (
                <SharedPreviewContent file={previewFile} url={previewUrl} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SharedPreviewContent({ file, url }: { file: SharedFile; url: string }) {
  const mime = file.mimeType;
  const [mediaError, setMediaError] = useState(false);
  const ext = file.name.split('.').pop()?.toUpperCase() || '';

  if (mime.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={file.name} className="max-h-[75vh] max-w-full object-contain" />
      </div>
    );
  }

  if (mime.startsWith('video/')) {
    if (mediaError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 bg-black py-16">
          <FileVideo className="h-16 w-16 text-gray-500" />
          <p className="text-lg font-medium text-white">{file.name}</p>
          <p className="text-sm text-gray-400">Ovaj video format nije podrzan u pregledacu.</p>
          <div className="flex gap-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600">
              <ExternalLink className="h-4 w-4" /> Otvori u video playeru
            </a>
            <a href={url} download={file.name} className="flex items-center gap-2 rounded-lg border border-gray-600 px-6 py-3 font-medium text-white hover:bg-gray-800">
              <Download className="h-4 w-4" /> Preuzmi
            </a>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center bg-black">
        <video src={url} controls autoPlay playsInline className="max-h-[75vh] max-w-full" onError={() => setMediaError(true)}>
          Vas pregledac ne podrzava ovaj video format.
        </video>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-2 text-xs text-gray-400 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" /> Otvori u video playeru
        </a>
      </div>
    );
  }

  if (mime.startsWith('audio/')) {
    if (mediaError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-purple-100 p-6 dark:bg-purple-900/30">
            <FileAudio className="h-12 w-12 text-purple-500" />
          </div>
          <p className="text-lg font-semibold">{file.name}</p>
          <p className="text-sm text-gray-500">{ext} format nije podrzan u pregledacu.</p>
          <div className="flex gap-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600">
              <ExternalLink className="h-4 w-4" /> Otvori u music playeru
            </a>
            <a href={url} download={file.name} className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
              <Download className="h-4 w-4" /> Preuzmi
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
        <audio src={url} controls autoPlay className="w-full max-w-md" onError={() => setMediaError(true)} />
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500">
          <ExternalLink className="h-3.5 w-3.5" /> Otvori u music playeru na uredjaju
        </a>
      </div>
    );
  }

  if (mime === 'application/pdf') {
    return <iframe src={url} className="h-[80vh] w-full" title={file.name} />;
  }

  if (mime.startsWith('text/') || mime === 'application/json') {
    return <SharedTextPreview url={url} />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <File className="h-16 w-16 text-gray-400" />
      <p className="text-lg font-medium">{file.name}</p>
      <p className="text-sm text-gray-500">Pregled ovog tipa fajla nije podrzan</p>
      <div className="flex gap-3">
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-medium text-white hover:bg-primary-600">
          <ExternalLink className="h-4 w-4" /> Otvori u aplikaciji
        </a>
        <a href={url} download={file.name} className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
          <Download className="h-4 w-4" /> Preuzmi
        </a>
      </div>
    </div>
  );
}

function SharedTextPreview({ url }: { url: string }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => { setText(t); setLoaded(true); })
      .catch(() => { setText('Greska pri ucitavanju fajla'); setLoaded(true); });
  }, [url]);

  if (!loaded) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <pre className="max-h-[75vh] overflow-auto whitespace-pre-wrap p-6 font-mono text-sm text-gray-800 dark:text-gray-200">
      {text}
    </pre>
  );
}
