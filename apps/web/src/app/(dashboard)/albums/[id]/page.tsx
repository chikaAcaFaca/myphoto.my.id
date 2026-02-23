'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Trash2, Plus, Copy, Check, Link2, MoreHorizontal, Pencil } from 'lucide-react';
import { useAlbum, useFiles, useDeleteAlbum, useUpdateAlbum } from '@/lib/hooks';
import { useShareAlbum } from '@/lib/hooks/use-share';
import { useUIStore } from '@/lib/stores';
import { PhotoGrid } from '@/components/gallery/photo-grid';
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

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const files: FileMetadata[] = filesData?.pages?.flatMap((page) => page.files) ?? [];

  const handleShare = async () => {
    if (!album) return;
    try {
      const result = await shareAlbum(album.id);
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      setShareUrl(fullUrl);
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification({
        type: 'success',
        title: 'Link kopiran',
        message: 'Link za deljenje albuma je kopiran u clipboard',
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
              {/* Share button */}
              <button
                onClick={handleShare}
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
    </div>
  );
}
