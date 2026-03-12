'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Play, Heart, MoreVertical, Download, Trash2, Share2 } from 'lucide-react';
import type { FileMetadata } from '@myphoto/shared';
import { formatDate, formatBytes } from '@myphoto/shared';
import { useFilesStore, useUIStore } from '@/lib/stores';
import { useGetDownloadUrl, useUpdateFile, useDeleteFile, useIsMobile } from '@/lib/hooks';
import { cn } from '@/lib/utils';

interface PhotoGridProps {
  files: FileMetadata[];
  isLoading?: boolean;
}

const DRAG_THRESHOLD = 5;
const LONG_PRESS_MS = 500;

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function PhotoGrid({ files, isLoading }: PhotoGridProps) {
  const { selectedFiles, toggleFileSelection, selectFile, deselectFile, isSelectionMode, setSelectionMode } = useFilesStore();
  const { openLightbox } = useUIStore();
  const isMobile = useIsMobile();

  // Drag-to-select state (desktop)
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const dragFilesRef = useRef<Set<string>>(new Set());

  // Long-press state (mobile)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMoveSelectRef = useRef<Set<string>>(new Set());

  const groupedFiles = groupByDate(files);

  // Desktop: compute selection rect and find intersecting cards
  const selectionRect = isDragging && dragStart && dragCurrent
    ? {
        left: Math.min(dragStart.x, dragCurrent.x),
        top: Math.min(dragStart.y, dragCurrent.y),
        width: Math.abs(dragCurrent.x - dragStart.x),
        height: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null;

  const updateDragSelection = useCallback(
    (currentX: number, currentY: number, startX: number, startY: number) => {
      if (!gridRef.current) return;
      const rect = {
        left: Math.min(startX, currentX),
        top: Math.min(startY, currentY),
        right: Math.max(startX, currentX),
        bottom: Math.max(startY, currentY),
      };

      const cards = gridRef.current.querySelectorAll<HTMLElement>('[data-file-id]');
      const newSelected = new Set<string>();

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const cardBounds = {
          left: cardRect.left,
          top: cardRect.top,
          right: cardRect.right,
          bottom: cardRect.bottom,
        };
        if (rectsIntersect(rect, cardBounds)) {
          const fileId = card.dataset.fileId!;
          newSelected.add(fileId);
        }
      });

      // Add newly covered files, remove uncovered ones
      const prev = dragFilesRef.current;
      newSelected.forEach((id) => {
        if (!prev.has(id)) selectFile(id);
      });
      prev.forEach((id) => {
        if (!newSelected.has(id)) deselectFile(id);
      });
      dragFilesRef.current = newSelected;
    },
    [selectFile, deselectFile]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button, not on interactive elements
      if (e.button !== 0 || isMobile) return;
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[data-no-drag]')) return;

      setDragStart({ x: e.clientX, y: e.clientY });
      dragFilesRef.current = new Set();
    },
    [isMobile]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStart || isMobile) return;

      const dx = Math.abs(e.clientX - dragStart.x);
      const dy = Math.abs(e.clientY - dragStart.y);

      if (!isDragging && (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD)) {
        setIsDragging(true);
        setSelectionMode(true);
      }

      if (isDragging || dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        setDragCurrent({ x: e.clientX, y: e.clientY });
        updateDragSelection(e.clientX, e.clientY, dragStart.x, dragStart.y);
      }
    },
    [dragStart, isDragging, isMobile, setSelectionMode, updateDragSelection]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
    dragFilesRef.current = new Set();
  }, []);

  // Clean up on unmount or if mouse leaves the window
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging || dragStart) {
        setIsDragging(false);
        setDragStart(null);
        setDragCurrent(null);
        dragFilesRef.current = new Set();
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, [isDragging, dragStart]);

  // Mobile: long-press handler
  const handleTouchStart = useCallback(
    (fileId: string, e: React.TouchEvent) => {
      if (!isMobile) return;
      longPressTimerRef.current = setTimeout(() => {
        navigator.vibrate?.(50);
        setSelectionMode(true);
        selectFile(fileId);
        touchMoveSelectRef.current = new Set([fileId]);
      }, LONG_PRESS_MS);
    },
    [isMobile, setSelectionMode, selectFile]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !isSelectionMode) return;
      // Cancel long-press timer if still pending
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!el) return;
      const card = el.closest<HTMLElement>('[data-file-id]');
      if (!card) return;
      const fileId = card.dataset.fileId!;
      if (!touchMoveSelectRef.current.has(fileId)) {
        touchMoveSelectRef.current.add(fileId);
        selectFile(fileId);
      }
    },
    [isMobile, isSelectionMode, selectFile]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchMoveSelectRef.current = new Set();
  }, []);

  // Card click handler: selection mode vs normal
  const handleCardClick = useCallback(
    (file: FileMetadata, e: React.MouseEvent) => {
      // If we just finished a drag, don't open lightbox
      if (isDragging) return;

      if (isSelectionMode) {
        toggleFileSelection(file.id);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        toggleFileSelection(file.id);
        return;
      }

      openLightbox(file.id);
    },
    [isDragging, isSelectionMode, toggleFileSelection, openLightbox]
  );

  if (isLoading) {
    return (
      <div className="columns-3 gap-2 lg:!columns-auto lg:grid lg:grid-cols-5 xl:grid-cols-6 lg:gap-2">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'animate-pulse bg-gray-200 dark:bg-gray-700',
              isMobile
                ? 'mb-2 break-inside-avoid rounded-xl aspect-[3/4]'
                : 'aspect-square rounded-lg'
            )}
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
    <div
      ref={gridRef}
      className="relative space-y-8 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {Object.entries(groupedFiles).map(([date, dateFiles]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            {formatDateHeader(date)}
          </h3>
          <div className="columns-3 gap-2 lg:!columns-auto lg:grid lg:grid-cols-5 xl:grid-cols-6 lg:gap-2">
            <AnimatePresence mode="popLayout">
              {dateFiles.map((file) => (
                <PhotoCard
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  isSelectionMode={isSelectionMode}
                  onSelect={() => toggleFileSelection(file.id)}
                  onClick={(e) => handleCardClick(file, e)}
                  onTouchStart={(e) => handleTouchStart(file.id, e)}
                  onTouchEnd={handleTouchEnd}
                  isMobile={isMobile}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* Selection rectangle (desktop drag) */}
      {selectionRect && (
        <div
          className="pointer-events-none fixed z-40 rounded border border-primary-500 bg-primary-500/20"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}
    </div>
  );
}

interface PhotoCardProps {
  file: FileMetadata;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: () => void;
  onClick: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  isMobile?: boolean;
}

function PhotoCard({ file, isSelected, isSelectionMode, onSelect, onClick, onTouchStart, onTouchEnd, isMobile }: PhotoCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { mutate: getDownloadUrl } = useGetDownloadUrl();
  const { mutate: updateFile } = useUpdateFile();
  const { mutate: deleteFile } = useDeleteFile();
  const { addNotification } = useUIStore();
  const localThumbnails = useFilesStore((s) => s.localThumbnails);
  const removeLocalThumbnail = useFilesStore((s) => s.removeLocalThumbnail);
  const serverImgRef = useRef<HTMLImageElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const localThumbUrl = localThumbnails.get(file.id);
  const thumbnailUrl = `/api/thumbnail/${file.id}?size=small${retryCount > 0 ? `&r=${retryCount}` : ''}`;
  const isVideo = file.type === 'video';

  // Retry loading thumbnail after a delay (server may still be generating it)
  useEffect(() => {
    if (!imageError || retryCount >= 3) return;
    const timer = setTimeout(() => {
      setImageError(false);
      setRetryCount((c) => c + 1);
    }, 5000 * (retryCount + 1)); // 5s, 10s, 15s
    return () => clearTimeout(timer);
  }, [imageError, retryCount]);

  // Auto-play video preview on hover (desktop)
  useEffect(() => {
    if (!isVideo || isMobile) return;
    const video = videoPreviewRef.current;
    if (!video) return;

    if (isHovered && !isSelectionMode) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovered, isVideo, isMobile, isSelectionMode]);

  // When we have a local thumbnail, preload the server thumbnail in the background.
  // Once loaded, swap to the server version and revoke the blob URL.
  useEffect(() => {
    if (!localThumbUrl) return;
    const img = new window.Image();
    img.src = thumbnailUrl;
    img.onload = () => {
      removeLocalThumbnail(file.id);
    };
    serverImgRef.current = img;
    return () => {
      if (serverImgRef.current) serverImgRef.current.onload = null;
    };
  }, [localThumbUrl, thumbnailUrl, file.id, removeLocalThumbnail]);

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      data-file-id={file.id}
      className={cn(
        'group relative cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-800',
        isMobile
          ? 'mb-2 break-inside-avoid rounded-xl aspect-[3/4]'
          : 'aspect-square rounded-lg',
        isSelected && 'ring-2 ring-primary-500'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowMenu(false);
      }}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Shimmer skeleton (visible until image loads) */}
      {!imageLoaded && !localThumbUrl && !imageError && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] dark:from-gray-700 dark:via-gray-600 dark:to-gray-700" />
      )}

      {/* Error fallback placeholder */}
      {imageError && !localThumbUrl && retryCount >= 3 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
          {isVideo ? (
            <Play className="h-8 w-8 text-gray-400" />
          ) : (
            <div className="h-8 w-8 rounded bg-gray-300 dark:bg-gray-600" />
          )}
          <span className="mt-1 text-[10px] text-gray-400 truncate max-w-[90%]">{file.name}</span>
        </div>
      )}

      {/* Thumbnail: local blob URL or server URL */}
      {localThumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localThumbUrl}
          alt={file.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
        />
      ) : !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt={file.name}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-all group-hover:scale-105',
            imageLoaded ? 'opacity-100 duration-300' : 'opacity-0'
          )}
          onLoad={() => { setImageLoaded(true); setImageError(false); }}
          onError={() => setImageError(true)}
        />
      ) : null}

      {/* Video hover preview (muted auto-play on desktop) */}
      {isVideo && !isMobile && (
        <video
          ref={videoPreviewRef}
          src={isHovered && !isSelectionMode ? `/api/stream/${file.id}` : undefined}
          muted
          playsInline
          loop
          preload="none"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity',
            isHovered && !isSelectionMode ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Video indicator */}
      {isVideo && (
        <div className={cn(
          'absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white transition-opacity',
          isHovered && !isMobile ? 'opacity-0' : 'opacity-100'
        )}>
          <Play className="h-3 w-3" />
          {file.duration && formatDuration(file.duration)}
        </div>
      )}

      {/* Selection checkbox */}
      <div
        className={cn(
          'absolute left-2 top-2 z-10 transition-opacity',
          isSelected || isHovered || isSelectionMode ? 'opacity-100' : 'opacity-0'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        data-no-drag
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
      {isHovered && !isSelected && !isSelectionMode && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent">
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className="rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
              data-no-drag
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
                data-no-drag
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showMenu && (
                <div
                  className="absolute bottom-full right-0 mb-1 w-40 rounded-lg bg-white py-1 shadow-lg dark:bg-gray-800"
                  onClick={(e) => e.stopPropagation()}
                  data-no-drag
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
