'use client';

import { motion } from 'framer-motion';
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Albumi</h1>
          <p className="text-sm text-gray-500">
            {albums?.length || 0} {albums?.length === 1 ? 'album' : 'albuma'}
          </p>
        </div>
        <button onClick={openCreateAlbumModal} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Novi album
        </button>
      </div>

      {/* Albums Grid */}
      {albums && albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link href={`/albums/${album.id}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-shadow group-hover:shadow-md dark:bg-gray-800">
                  {album.coverFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/thumbnail/${album.coverFileId}`}
                      alt={album.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FolderPlus className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
                <h3 className="mt-2 font-medium">{album.name}</h3>
                <p className="text-sm text-gray-500">
                  {album.fileCount} {album.fileCount === 1 ? 'fajl' : 'fajlova'}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
            <FolderPlus className="h-12 w-12 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold">Nema albuma</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Kreirajte svoj prvi album da organizujete slike i video zapise
          </p>
          <button onClick={openCreateAlbumModal} className="btn-primary mt-6">
            <Plus className="mr-2 h-4 w-4" />
            Kreiraj album
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
