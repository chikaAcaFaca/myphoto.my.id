'use client';

import { useState } from 'react';
import { X, Download, ZoomIn } from 'lucide-react';

interface SharedImageProps {
  fileId: string;
  fileName: string;
  shareToken: string;
  isVideo?: boolean;
}

export function SharedImage({ fileId, fileName, shareToken, isVideo }: SharedImageProps) {
  const [showLightbox, setShowLightbox] = useState(false);

  if (isVideo) {
    return (
      <div className="relative w-full max-w-5xl overflow-hidden rounded-lg shadow-2xl">
        <video
          src={`/api/stream/${fileId}?share=${shareToken}`}
          controls
          playsInline
          className="h-auto w-full"
          style={{ maxHeight: '75vh' }}
          poster={`/api/thumbnail/${fileId}?size=large&share=${shareToken}`}
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowLightbox(true)}
        className="group relative w-full max-w-5xl overflow-hidden rounded-lg shadow-2xl focus:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/thumbnail/${fileId}?size=large&share=${shareToken}`}
          alt={fileName}
          className="h-auto w-full object-contain transition-transform duration-200"
          style={{ maxHeight: '75vh' }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <ZoomIn className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-80" />
        </div>
      </button>

      {/* Full-size lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setShowLightbox(false)}
        >
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-end p-4">
            <div className="flex items-center gap-2">
              <a
                href={`/api/stream/${fileId}?share=${shareToken}`}
                download={fileName}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                title="Preuzmi"
              >
                <Download className="h-5 w-5" />
              </a>
              <button
                onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}
                className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex h-full w-full items-center justify-center p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/stream/${fileId}?share=${shareToken}`}
              alt={fileName}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
