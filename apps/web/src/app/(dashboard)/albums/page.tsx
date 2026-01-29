'use client';

import { FolderPlus, Plus } from 'lucide-react';
import { useAlbums } from '@/lib/hooks';
import { useUIStore } from '@/lib/stores';
import Link from 'next/link';

export default function AlbumsPage() {
  const { data: albums, isLoading } = useAlbums();
  const { openCreateAlbumModal } = useUIStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-1 h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albums</h1>
          <p className="text-sm text-gray-500">
            {albums?.length || 0} {albums?.length === 1 ? 'album' : 'albums'}
          </p>
        </div>
        <button onClick={openCreateAlbumModal} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Album
        </button>
      </div>

      {/* Albums Grid */}
      {albums && albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/albums/${album.id}`}
              className="group"
            >
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                {album.coverFileId ? (
                  <img
                    src={`/api/thumbnail/${album.coverFileId}`}
                    alt={album.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FolderPlus className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
              </div>
              <h3 className="mt-2 font-medium">{album.name}</h3>
              <p className="text-sm text-gray-500">
                {album.fileCount} {album.fileCount === 1 ? 'item' : 'items'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <FolderPlus className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">No albums yet</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Create your first album to organize your photos and videos
          </p>
          <button onClick={openCreateAlbumModal} className="btn-primary mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Create Album
          </button>
        </div>
      )}
    </div>
  );
}
