'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Download,
  Share2,
  Trash2,
  Info,
  ZoomIn,
  ZoomOut,
  Play,
  Loader2,
} from 'lucide-react';
import type { FileMetadata } from '@myphoto/shared';
import { formatDate, formatBytes } from '@myphoto/shared';
import { useUIStore } from '@/lib/stores';
import { useFiles, useGetDownloadUrl, useUpdateFile, useDeleteFile, useShareFile } from '@/lib/hooks';
import { cn } from '@/lib/utils';

// ─── Main PhotoLightbox ─────────────────────────────────────────────────────

export function PhotoLightbox() {
  const { isLightboxOpen, lightboxFileId, closeLightbox, setLightboxFile, addNotification } =
    useUIStore();
  const { data } = useFiles();

  // Flatten all paginated files into a single list
  const allFiles = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.files);
  }, [data]);

  const currentIndex = useMemo(() => {
    if (!lightboxFileId) return -1;
    return allFiles.findIndex((f) => f.id === lightboxFileId);
  }, [allFiles, lightboxFileId]);

  const currentFile = currentIndex >= 0 ? allFiles[currentIndex] : null;

  const [showInfo, setShowInfo] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Body scroll lock
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isLightboxOpen]);

  // Auto-hide toolbar on desktop
  const resetHideTimer = useCallback(() => {
    setIsToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!isMobile) {
      hideTimerRef.current = setTimeout(() => setIsToolbarVisible(false), 3000);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isLightboxOpen) {
      resetHideTimer();
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isLightboxOpen, resetHideTimer]);

  // Navigation
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      setLightboxFile(allFiles[currentIndex - 1].id);
      resetHideTimer();
    }
  }, [hasPrev, allFiles, currentIndex, setLightboxFile, resetHideTimer]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      setLightboxFile(allFiles[currentIndex + 1].id);
      resetHideTimer();
    }
  }, [hasNext, allFiles, currentIndex, setLightboxFile, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'i':
          setShowInfo((v) => !v);
          break;
        case 'f':
          // Favorite toggle handled by toolbar
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, closeLightbox, goToPrev, goToNext]);

  // Mouse move shows toolbar
  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  // Swipe handler for mobile
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.x > threshold && hasPrev) {
        goToPrev();
      } else if (info.offset.x < -threshold && hasNext) {
        goToNext();
      }
    },
    [hasPrev, hasNext, goToPrev, goToNext]
  );

  // Preload adjacent ±2 images (thumbnails + full-res for immediate neighbors)
  useEffect(() => {
    if (currentIndex < 0) return;
    for (let offset = -2; offset <= 2; offset++) {
      if (offset === 0) continue;
      const idx = currentIndex + offset;
      if (idx < 0 || idx >= allFiles.length) continue;
      const id = allFiles[idx].id;
      // Preload thumbnail
      const thumb = new window.Image();
      thumb.src = `/api/thumbnail/${id}`;
      // Preload full-res for immediate neighbors
      if (Math.abs(offset) === 1) {
        const full = new window.Image();
        full.src = `/api/thumbnail/${id}?size=large`;
      }
    }
  }, [currentIndex, allFiles]);

  if (!isLightboxOpen || !currentFile) return null;

  return (
    <AnimatePresence>
      {isLightboxOpen && (
        <motion.div
          key="lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onMouseMove={handleMouseMove}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          {/* Toolbar */}
          <LightboxToolbar
            file={currentFile}
            visible={isToolbarVisible || isMobile}
            showInfo={showInfo}
            onToggleInfo={() => setShowInfo((v) => !v)}
            onClose={closeLightbox}
            isMobile={isMobile}
          />

          {/* Navigation arrows - desktop */}
          {!isMobile && (
            <>
              {hasPrev && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className={cn(
                    'absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-opacity hover:bg-black/60',
                    isToolbarVisible ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className={cn(
                    'absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-opacity hover:bg-black/60',
                    showInfo ? 'right-[340px]' : 'right-4',
                    isToolbarVisible ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </>
          )}

          {/* Main content area */}
          <div
            className={cn(
              'relative flex h-full w-full items-center justify-center transition-all duration-300',
              showInfo && !isMobile ? 'pr-80' : ''
            )}
          >
            <motion.div
              key={currentFile.id}
              drag={isMobile ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="flex h-full w-full items-center justify-center"
            >
              {currentFile.type === 'video' ? (
                <VideoPlayer file={currentFile} />
              ) : (
                <ZoomableImage file={currentFile} />
              )}
            </motion.div>
          </div>

          {/* Info panel */}
          <InfoPanel
            file={currentFile}
            open={showInfo}
            onClose={() => setShowInfo(false)}
            isMobile={isMobile}
          />

          {/* Counter */}
          <div
            className={cn(
              'absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60 transition-opacity',
              isMobile ? 'bottom-20' : 'bottom-4',
              isToolbarVisible || isMobile ? 'opacity-100' : 'opacity-0'
            )}
          >
            {currentIndex + 1} / {allFiles.length}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ZoomableImage ──────────────────────────────────────────────────────────

function ZoomableImage({ file }: { file: FileMetadata }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isFullResLoaded, setIsFullResLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pinch tracking refs
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const isPinchingRef = useRef(false);

  // Pan tracking refs
  const panStartRef = useRef({ x: 0, y: 0 });
  const panTranslateRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const didGestureRef = useRef(false);

  // Reset zoom when file changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsFullResLoaded(false);
    isPinchingRef.current = false;
    isPanningRef.current = false;
    didGestureRef.current = false;
  }, [file.id]);

  // Desktop click-to-zoom
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore if a touch gesture just happened
      if (didGestureRef.current) {
        didGestureRef.current = false;
        return;
      }
      if (!containerRef.current) return;

      if (scale > 1) {
        // Zoom out
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        // Zoom in to 2x at click point
        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;
        setScale(2);
        setTranslate({ x: -clickX, y: -clickY });
      }
    },
    [scale]
  );

  // Touch handlers for pinch-to-zoom and pan
  const getTouchDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch start
        isPinchingRef.current = true;
        isPanningRef.current = false;
        didGestureRef.current = true;
        pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartScaleRef.current = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        // Pan start (only when zoomed)
        isPanningRef.current = true;
        didGestureRef.current = true;
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panTranslateRef.current = { ...translate };
      }
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isPinchingRef.current && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const ratio = dist / pinchStartDistRef.current;
        const newScale = Math.min(4, Math.max(1, pinchStartScaleRef.current * ratio));
        setScale(newScale);
        if (newScale <= 1) {
          setTranslate({ x: 0, y: 0 });
        }
      } else if (isPanningRef.current && e.touches.length === 1 && scale > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStartRef.current.x;
        const dy = e.touches[0].clientY - panStartRef.current.y;
        setTranslate({
          x: panTranslateRef.current.x + dx,
          y: panTranslateRef.current.y + dy,
        });
      }
    },
    [scale]
  );

  const handleTouchEnd = useCallback(() => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      // Snap to 1x if close
      if (scale < 1.1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    }
    isPanningRef.current = false;
  }, [scale]);

  const thumbnailUrl = `/api/thumbnail/${file.id}`;
  const fullResUrl = `/api/thumbnail/${file.id}?size=large`;

  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center justify-center',
        isZoomed ? 'cursor-zoom-out h-full w-full' : 'cursor-zoom-in max-h-full max-w-full overflow-hidden'
      )}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isZoomed ? 'none' : 'pan-x' }}
    >
      <div
        className={cn(
          'will-change-transform',
          isPinchingRef.current || isPanningRef.current ? '' : 'transition-transform duration-300 ease-out'
        )}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
      >
        {/* Thumbnail shown immediately */}
        <Image
          src={thumbnailUrl}
          alt={file.name}
          width={file.width || 1920}
          height={file.height || 1080}
          className={cn(
            'max-h-screen max-w-full object-contain',
            isFullResLoaded ? 'hidden' : 'block'
          )}
          priority
          draggable={false}
        />
        {/* Full-res loaded in background, swapped when ready */}
        <Image
          src={fullResUrl}
          alt={file.name}
          width={file.width || 1920}
          height={file.height || 1080}
          className={cn(
            'max-h-screen max-w-full object-contain',
            isFullResLoaded ? 'block' : 'hidden'
          )}
          onLoad={() => setIsFullResLoaded(true)}
          priority
          draggable={false}
        />
      </div>

      {/* Zoom indicator */}
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/40 p-1.5 text-white/70">
        {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
      </div>
    </div>
  );
}

// ─── VideoPlayer ────────────────────────────────────────────────────────────

function VideoPlayer({ file }: { file: FileMetadata }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { mutate: getDownloadUrl } = useGetDownloadUrl();
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    getDownloadUrl(file.s3Key, {
      onSuccess: (url) => setVideoSrc(url),
    });
  }, [file.s3Key, getDownloadUrl]);

  const thumbnailUrl = `/api/thumbnail/${file.id}`;

  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <Image
            src={thumbnailUrl}
            alt={file.name}
            width={file.width || 1920}
            height={file.height || 1080}
            className="max-h-screen max-w-full object-contain opacity-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      poster={thumbnailUrl}
      controls
      autoPlay
      className="max-h-screen max-w-full"
      onClick={(e) => e.stopPropagation()}
    >
      Your browser does not support the video tag.
    </video>
  );
}

// ─── LightboxToolbar ────────────────────────────────────────────────────────

function LightboxToolbar({
  file,
  visible,
  showInfo,
  onToggleInfo,
  onClose,
  isMobile,
}: {
  file: FileMetadata;
  visible: boolean;
  showInfo: boolean;
  onToggleInfo: () => void;
  onClose: () => void;
  isMobile: boolean;
}) {
  const { addNotification } = useUIStore();
  const { mutate: getDownloadUrl } = useGetDownloadUrl();
  const { mutate: updateFile } = useUpdateFile();
  const { mutate: deleteFile } = useDeleteFile();
  const { mutate: shareFile, isPending: isSharing } = useShareFile();

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

  const handleDownload = () => {
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
  };

  const handleDelete = () => {
    deleteFile(file.id, {
      onSuccess: () => {
        addNotification({
          type: 'success',
          title: 'Moved to trash',
          message: 'File will be permanently deleted in 30 days',
        });
        onClose();
      },
    });
  };

  // Keyboard shortcut for favorite
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'f') handleToggleFavorite();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const buttons = (
    <>
      <ToolbarButton
        icon={
          <Heart
            className={cn('h-5 w-5', file.isFavorite && 'fill-red-500 text-red-500')}
          />
        }
        label="Favorite (F)"
        onClick={handleToggleFavorite}
      />
      <ToolbarButton
        icon={<Download className="h-5 w-5" />}
        label="Download"
        onClick={handleDownload}
      />
      <ToolbarButton
        icon={
          isSharing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Share2 className="h-5 w-5" />
          )
        }
        label="Share"
        onClick={() => {
          if (isSharing) return;
          shareFile(file.id, {
            onSuccess: async (data) => {
              const fullUrl = `${window.location.origin}${data.shareUrl}`;
              // Try native share on mobile first
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: file.name,
                    text: `Pogledaj "${file.name}" na MyPhoto.my.id`,
                    url: fullUrl,
                  });
                  return;
                } catch {
                  // User cancelled or share failed, fall through to clipboard
                }
              }
              // Fallback: copy to clipboard
              try {
                await navigator.clipboard.writeText(fullUrl);
                addNotification({ type: 'success', title: 'Link kopiran!' });
              } catch {
                addNotification({ type: 'error', title: 'Kopiranje nije uspelo' });
              }
            },
            onError: () => {
              addNotification({
                type: 'error',
                title: 'Greška pri deljenju',
                message: 'Pokušajte ponovo',
              });
            },
          });
        }}
      />
      <ToolbarButton
        icon={<Trash2 className="h-5 w-5" />}
        label="Delete"
        onClick={handleDelete}
      />
      <ToolbarButton
        icon={
          <Info className={cn('h-5 w-5', showInfo && 'text-blue-400')} />
        }
        label="Info (I)"
        onClick={onToggleInfo}
      />
    </>
  );

  if (isMobile) {
    // Bottom toolbar for mobile
    return (
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-white/10 bg-black/80 px-2 py-3 backdrop-blur-sm transition-opacity',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {buttons}
        <ToolbarButton
          icon={<X className="h-5 w-5" />}
          label="Close"
          onClick={onClose}
        />
      </div>
    );
  }

  // Top toolbar for desktop
  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3 transition-opacity',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="text-sm font-medium text-white truncate max-w-xs">
        {file.name}
      </div>
      <div className="flex items-center gap-1">
        {buttons}
        <div className="mx-2 h-6 w-px bg-white/20" />
        <ToolbarButton
          icon={<X className="h-5 w-5" />}
          label="Close (Esc)"
          onClick={onClose}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      {icon}
    </button>
  );
}

// ─── InfoPanel ──────────────────────────────────────────────────────────────

function InfoPanel({
  file,
  open,
  onClose,
  isMobile,
}: {
  file: FileMetadata;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}) {
  if (isMobile) {
    // Bottom sheet for mobile
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="info-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40"
              onClick={onClose}
            />
            <motion.div
              key="info-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-auto rounded-t-2xl bg-gray-900 px-5 pb-8 pt-4"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-600" />
              <InfoContent file={file} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Side panel for desktop
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="info-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 z-20 h-full w-80 overflow-auto border-l border-white/10 bg-gray-900/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-medium text-white">Details</h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-4">
            <InfoContent file={file} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoContent({ file }: { file: FileMetadata }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Filename', value: file.name },
    {
      label: 'Date taken',
      value: file.takenAt
        ? formatDate(file.takenAt, 'long')
        : formatDate(file.createdAt, 'long'),
    },
    { label: 'Size', value: formatBytes(file.size) },
  ];

  if (file.width && file.height) {
    rows.push({ label: 'Dimensions', value: `${file.width} × ${file.height}` });
  }

  if (file.duration) {
    const mins = Math.floor(file.duration / 60);
    const secs = Math.floor(file.duration % 60);
    rows.push({ label: 'Duration', value: `${mins}:${secs.toString().padStart(2, '0')}` });
  }

  if (file.deviceInfo) {
    rows.push({ label: 'Device', value: file.deviceInfo });
  }

  if (file.location) {
    rows.push({
      label: 'Location',
      value: `${file.location.latitude.toFixed(4)}, ${file.location.longitude.toFixed(4)}`,
    });
  }

  rows.push({ label: 'Type', value: file.mimeType });

  return (
    <div className="space-y-5">
      {/* Thumbnail preview */}
      <div className="overflow-hidden rounded-lg">
        <Image
          src={`/api/thumbnail/${file.id}`}
          alt={file.name}
          width={320}
          height={200}
          className="w-full object-cover"
        />
      </div>

      {/* Metadata rows */}
      <dl className="space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-white/40">{row.label}</dt>
            <dd className="mt-0.5 text-sm text-white/90 break-all">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* AI labels */}
      {file.labels && file.labels.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs text-white/40">AI Labels</h4>
          <div className="flex flex-wrap gap-1.5">
            {file.labels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
