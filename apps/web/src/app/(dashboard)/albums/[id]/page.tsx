'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Trash2, Plus, Copy, Check, Link2, MoreHorizontal, Pencil, Download } from 'lucide-react';
import JSZip from 'jszip';
import { useAlbum, useFiles, useDeleteAlbum, useUpdateAlbum, useBulkDeleteFiles } from '@/lib/hooks';
import { useShareAlbum } from '@/lib/hooks/use-share';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
import { SelectionBar } from '@/components/gallery/selection-bar';
import type { FileMetadata } from '@myphoto/shared';

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: album, isLoading: isLoadingAlbum } = useAlbum(id);
  const { data: filesData, isLoading: isLoadingFiles } = useFiles({ albumId: id });
  const { mutateAsync: deleteAlbum } = useDeleteAlbum();
  const { mutateAsync: updateAlbum } = useUpdateAlbum();
  const { mutateAsync: shareAlbum, isPending: isSharing } = useShareAlbum();
  const { addNotification } = useUIStore();
  const { selectedFiles, deselectAll } = useFilesStore();
  const { mutate: bulkDelete } = useBulkDeleteFiles();

  const handleBulkDelete = () => {
    const ids = Array.from(selectedFiles);
    bulkDelete(ids, {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Premesteno u korpu',
          message: `${ids.length} fajlova premesteno u korpu`,
        });
        deselectAll();
      },
    });
  };

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [sharePermission, setSharePermission] = useState<'read' | 'readwrite'>('read');
  const [isEditing, setIsEditing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const files: FileMetadata[] = filesData?.pages?.flatMap((page) => page.files) ?? [];

  const handleShare = async (perm?: 'read' | 'readwrite') => {
    if (!album) return;
    const permToUse = perm ?? sharePermission;
    try {
      const result = await shareAlbum({ albumId: album.id, permission: permToUse });
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      setShareUrl(fullUrl);
      setShowShareOptions(false);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({
        type: 'success',
        title: 'Link kopiran',
        message: permToUse === 'readwrite'
          ? 'Link za deljenje (sa pravom izmene) kopiran u clipboard'
          : 'Link za deljenje (samo pregled) kopiran u clipboard',
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Greška pri deljenju',
        message: error.message,
      });
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!album || !confirm(`Obrisati album "${album.name}"? Slike neće biti obrisane.`)) return;
    try {
      await deleteAlbum(album.id);
      addNotification({
        type: 'success',
        title: 'Album obrisan',
        message: `"${album.name}" je obrisan`,
      });
      router.push('/albums');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Greška',
        message: error.message,
      });
    }
  };

  const handleStartEdit = () => {
    if (!album) return;
    setEditName(album.name);
    setEditDescription(album.description || '');
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!album || !editName.trim()) return;
    try {
      await updateAlbum({
        albumId: album.id,
        updates: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      });
      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Album ažuriran',
        message: `"${editName.trim()}" je sačuvan`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Greška',
        message: error.message,
      });
    }
  };

  const handleDownloadAlbum = async () => {
    if (!album || files.length === 0 || isDownloading) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      let downloaded = 0;

      for (const file of files) {
        try {
          const res = await fetch(`/api/stream/${file.id}`);
          if (!res.ok) continue;
          const blob = await res.blob();
          zip.file(file.name, blob);
          downloaded++;
        } catch {
          // Skip failed files
        }
      }

      if (downloaded === 0) {
        addNotification({ type: 'error', title: 'Greška', message: 'Nije moguće preuzeti slike' });
        return;
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${album.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        type: 'success',
        title: 'Preuzimanje završeno',
        message: `"${album.name}.zip" sa ${downloaded} fajlova`,
      });
    } catch (error: any) {
      addNotification({ type: 'error', title: 'Greška', message: error.message });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoadingAlbum) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Album nije pronađen</h2>
        <button onClick={() => router.push('/albums')} className="btn-primary mt-4">
          Nazad na albume
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/albums')}
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Albumi
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input text-2xl font-bold"
                  autoFocus
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input min-h-[60px] resize-none text-sm"
                  placeholder="Opis albuma (opciono)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveEdit} className="btn-primary text-sm">
                    Sačuvaj
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm">
                    Otkaži
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{album.name}</h1>
                {album.description && (
                  <p className="mt-1 text-sm text-gray-500">{album.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-400">
                  {files.length} {files.length === 1 ? 'fajl' : 'fajlova'}
                </p>
              </>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
              {/* Download album as ZIP */}
              <button
                onClick={handleDownloadAlbum}
                disabled={isDownloading || files.length === 0}
                className="btn-secondary flex items-center gap-2"
                title="Preuzmi ceo album kao ZIP"
              >
                {isDownloading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Preuzmi
              </button>

              {/* Share button with permission options */}
              <div className="relative">
                <button
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  disabled={isSharing}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSharing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  Podeli
                </button>

                {showShareOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowShareOptions(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <button
                        onClick={() => handleShare('read')}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Samo pregled</p>
                          <p className="text-xs text-gray-500">Može da gleda i preuzme slike</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleShare('readwrite')}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Pregled i izmena</p>
                          <p className="text-xs text-gray-500">Može da dodaje i briše slike</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="btn-secondary p-2"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <button
                        onClick={handleStartEdit}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Izmeni album
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); handleDelete(); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Obriši album
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share link bar */}
        {shareUrl && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-900/20">
            <Link2 className="h-4 w-4 flex-shrink-0 text-sky-500" />
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none dark:text-gray-300"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 rounded-md bg-sky-100 px-3 py-1 text-sm text-sky-700 hover:bg-sky-200 dark:bg-sky-800 dark:text-sky-300"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Kopirano!' : 'Kopiraj'}
            </button>
          </div>
        )}
      </div>

      {/* Photos grid */}
      {!isLoadingFiles && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <Plus className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Album je prazan</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Dodajte slike u ovaj album iz galerije
          </p>
        </div>
      ) : (
        <PhotoGrid files={files} isLoading={isLoadingFiles} />
      )}

      <SelectionBar
        actions={[
          {
            label: 'Obrisi',
            icon: <Trash2 className="h-4 w-4" />,
            onClick: handleBulkDelete,
            variant: 'danger',
          },
        ]}
      />
    </div>
  );
}
