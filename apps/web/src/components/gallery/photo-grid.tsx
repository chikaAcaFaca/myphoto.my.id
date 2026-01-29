'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Play, Heart, MoreVertical, Download, Trash2, Share2 } from 'lucide-react';
import type { FileMetadata } from '@myphoto/shared';
import { formatDate, formatBytes } from '@myphoto/shared';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { useGetDownloadUrl, useUpdateFile, useDeleteFile } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface PhotoGridProps {
  files: FileMetadata[];
  isLoading?: boolean;
}

export function PhotoGrid({ files, isLoading }: PhotoGridProps) {
  const { selectedFiles, toggleFileSelection, selectFile } = useFilesStore();
  const { openLightbox } = useUIStore();

  const groupedFiles = groupByDate(files);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
          <Image
            src="/empty-photos.svg"
            alt="No photos"
            width={120}
            height={120}
            className="opacity-50"
          />
        </div>
        <h3 className="text-lg font-medium">No photos yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Upload your first photos to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedFiles).map(([date, dateFiles]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            {formatDateHeader(date)}
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <AnimatePresence mode="popLayout">
              {dateFiles.map((file) => (
                <PhotoCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={() => toggleFileSelection(file.id)}
                  onOpen={() => openLightbox(file.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PhotoCardProps {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

function PhotoCard({ file, isSelected, onSelect, onOpen }: PhotoCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { mutate: getDownloadUrl } = useGetDownloadUrl();
  const { mutate: updateFile } = useUpdateFile();
  const { mutate: deleteFile } = useDeleteFile();
  const { addNotification } = useUIStore();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        onSelect();
      } else {
        onOpen();
      }
    },
    [onSelect, onOpen]
  );

  const handleDownload = async () => {
    getDownloadUrl(file.s3Key, {
      onSuccess: (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      onError: () => {
        addNotification({
          type: 'error',
          title: 'Download failed',
          message: 'Could not download the file',
        });
      },
    });
    setShowMenu(false);
  };

  const handleToggleFavorite = () => {
    updateFile(
      { fileId: file.id, updates: { isFavorite: !file.isFavorite } },
      {
        onSuccess: () => {
          addNotification({
            type: 'success',
            title: file.isFavorite ? 'Removed from favorites' : 'Added to favorites',
          });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteFile(file.id, {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Moved to trash',
          message: 'File will be permanently deleted in 30 days',
        });
      },
    });
    setShowMenu(false);
  };

  // Generate thumbnail URL - in production this would be a CDN URL
  const thumbnailUrl = `/api/thumbnail/${file.id}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800',
        isSelected && 'ring-2 ring-primary-500'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <Image
        src={thumbnailUrl}
        alt={file.name}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
        className="object-cover transition-transform group-hover:scale-105"
      />

      {/* Video indicator */}
      {file.type === 'video' && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
          <Play className="h-3 w-3" />
          {file.duration && formatDuration(file.duration)}
        </div>
      )}

      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute left-2 top-2 z-10 transition-opacity',
          isSelected || isHovered ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors',
            isSelected
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-white bg-black/20 hover:bg-black/40'
          )}
        >
          {isSelected && <Check className="h-4 w-4" />}
        </div>
      </div>

      {/* Favorite indicator */}
      {file.isFavorite && (
        <div className="absolute right-2 top-2">
          <Heart className="h-5 w-5 fill-red-500 text-red-500" />
        </div>
      )}

      {/* Hover overlay with actions */}
      {isHovered && !isSelected && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
            >
              <Heart
                className={cn('h-4 w-4', file.isFavorite && 'fill-current')}
              />
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute bottom-full right-0 mb-1 w-40 rounded-lg bg-white py-1 shadow-lg dark:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleDownload}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // Open share modal
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Helper functions
function groupByDate(files: FileMetadata[]): Record<string, FileMetadata[]> {
  const groups: Record<string, FileMetadata[]> = {};

  for (const file of files) {
    const date = (file.takenAt || file.createdAt).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(file);
  }

  return groups;
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === today.toISOString().split('T')[0]) {
    return 'Today';
  }
  if (dateString === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
