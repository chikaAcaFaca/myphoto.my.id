'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Download, ZoomIn } from 'lucide-react';

interface SharedGalleryProps {
  fileIds: string[];
  shareToken: string;
}

export function SharedGallery({ fileIds, shareToken }: SharedGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % fileIds.length);
  }, [lightboxIndex, fileIds.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + fileIds.length) % fileIds.length);
  }, [lightboxIndex, fileIds.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, goNext, goPrev]);

  const currentFileId = lightboxIndex !== null ? fileIds[lightboxIndex] : null;

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {fileIds.map((fileId, index) => (
          <button
            key={fileId}
            onClick={() => openLightbox(index)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/thumbnail/${fileId}?share=${shareToken}`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <ZoomIn className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && currentFileId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-4">
            <span className="text-sm text-gray-400">
              {lightboxIndex + 1} / {fileIds.length}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={`/api/stream/${currentFileId}?share=${shareToken}`}
                download
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                title="Preuzmi"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div
            className="flex h-full w-full items-center justify-center p-16"
            onClick={closeLightbox}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/thumbnail/${currentFileId}?size=large&share=${shareToken}`}
              alt=""
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Navigation arrows */}
          {fileIds.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
