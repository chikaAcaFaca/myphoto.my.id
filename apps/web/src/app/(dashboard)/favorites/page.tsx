'use client';

import { Heart } from 'lucide-react';
import { useFiles } from '@/lib/hooks';
import { PhotoGrid } from '@/components/gallery/photo-grid';

export default function FavoritesPage() {
  const { data, isLoading } = useFiles({
    isFavorite: true,
    isTrashed: false,
  });

  const files = data?.pages.flatMap((page) => page.files) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Favorites</h1>
        <p className="text-sm text-gray-500">
          {files.length} {files.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Content */}
      {!isLoading && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-full bg-red-50 p-6 dark:bg-red-900/20">
            <Heart className="h-12 w-12 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">No favorites yet</h2>
          <p className="mt-2 max-w-md text-gray-500">
            Mark your favorite photos and videos by clicking the heart icon
          </p>
        </div>
      ) : (
        <PhotoGrid files={files} isLoading={isLoading} />
      )}
    </div>
  );
}
