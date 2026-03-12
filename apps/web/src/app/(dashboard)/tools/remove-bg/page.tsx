'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Upload, Eraser, RefreshCw } from 'lucide-react';
import { useUIStore } from '@/lib/stores';

export default function RemoveBgPage() {
  return (
    <Suspense>
      <RemoveBgContent />
    </Suspense>
  );
}

function RemoveBgContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addNotification } = useUIStore();
  const fileId = searchParams.get('fileId');

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image from fileId
  useEffect(() => {
    if (fileId) {
      setOriginalUrl(`/api/thumbnail/${fileId}?size=large`);
    }
  }, [fileId]);

  const processImage = useCallback(async (imageSource: string | File) => {
    setIsProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const loadImage = (): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Slika se ne može učitati'));
          if (typeof imageSource === 'string') {
            img.src = imageSource;
          } else {
            img.src = URL.createObjectURL(imageSource);
          }
        });

      const loadedImg = await loadImage();

      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      canvas.width = loadedImg.naturalWidth;
      canvas.height = loadedImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Draw original image
      ctx.drawImage(loadedImg, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple background removal using edge detection + flood fill
      // Detect the dominant background color from corners
      const cornerSamples = [
        getPixel(data, canvas.width, 0, 0),
        getPixel(data, canvas.width, canvas.width - 1, 0),
        getPixel(data, canvas.width, 0, canvas.height - 1),
        getPixel(data, canvas.width, canvas.width - 1, canvas.height - 1),
      ];

      const bgColor = averageColor(cornerSamples);
      const tolerance = 40;

      // Mark background pixels as transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          (r - bgColor.r) ** 2 +
          (g - bgColor.g) ** 2 +
          (b - bgColor.b) ** 2
        );

        if (diff < tolerance) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      // Apply edge smoothing
      smoothEdges(data, canvas.width, canvas.height);

      ctx.putImageData(imageData, 0, 0);

      // Convert to blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setResultUrl(url);
        }
        setIsProcessing(false);
      }, 'image/png');
    } catch (err: any) {
      setError(err.message || 'Greška pri obradi slike');
      setIsProcessing(false);
    }
  }, []);

  // Auto-process when image loads from fileId
  useEffect(() => {
    if (originalUrl && fileId) {
      processImage(originalUrl);
    }
  }, [originalUrl, fileId, processImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addNotification({ type: 'error', title: 'Samo slike su podržane' });
      return;
    }
    setUploadedFile(file);
    setOriginalUrl(URL.createObjectURL(file));
    processImage(file);
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = 'bez-pozadine.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazad
      </button>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Eraser className="h-6 w-6 text-primary-500" />
          Ukloni pozadinu
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Uklonite pozadinu sa slike jednim klikom
        </p>
      </div>

      {/* Upload area (if no fileId) */}
      {!originalUrl && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 hover:border-primary-400 dark:border-gray-600"
        >
          <Upload className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium">Prevucite sliku ovde</p>
          <p className="mt-1 text-sm text-gray-500">ili kliknite za upload</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary-500" />
          <p className="text-lg font-medium">Uklanjam pozadinu...</p>
          <p className="mt-1 text-sm text-gray-500">Ovo može potrajati nekoliko sekundi</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => originalUrl && processImage(originalUrl)}
            className="btn-secondary mt-3"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Pokušaj ponovo
          </button>
        </div>
      )}

      {/* Result comparison */}
      {resultUrl && !isProcessing && (
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Original */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">Original</p>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={originalUrl!} alt="Original" className="w-full" />
              </div>
            </div>
            {/* Result */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">Bez pozadine</p>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' width=\'10\' height=\'10\' fill=\'%23fff\'/%3E%3Crect y=\'10\' width=\'10\' height=\'10\' fill=\'%23fff\'/%3E%3C/svg%3E")' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="Bez pozadine" className="w-full" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleDownload} className="btn-primary">
              <Download className="mr-2 h-4 w-4" />
              Preuzmi PNG
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              <Upload className="mr-2 h-4 w-4" />
              Nova slika
            </button>
            <button
              onClick={() => originalUrl && processImage(originalUrl)}
              className="btn-secondary"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Ponovi
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Helper: get pixel color at position
function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

// Helper: average color from samples
function averageColor(samples: { r: number; g: number; b: number }[]) {
  const sum = samples.reduce(
    (acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }),
    { r: 0, g: 0, b: 0 }
  );
  const n = samples.length;
  return { r: sum.r / n, g: sum.g / n, b: sum.b / n };
}

// Helper: smooth transparency edges
function smoothEdges(data: Uint8ClampedArray, width: number, height: number) {
  const alpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    alpha[i] = data[i * 4 + 3];
  }

  // 3x3 blur on alpha channel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const current = alpha[idx];
      // Only smooth edge pixels (not fully transparent or fully opaque)
      if (current > 0 && current < 255) continue;

      // Check if this is an edge pixel
      let hasTransparent = false;
      let hasOpaque = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ni = (y + dy) * width + (x + dx);
          if (alpha[ni] === 0) hasTransparent = true;
          if (alpha[ni] === 255) hasOpaque = true;
        }
      }

      if (hasTransparent && hasOpaque) {
        // This is an edge - apply slight transparency for smoother edges
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += alpha[(y + dy) * width + (x + dx)];
          }
        }
        data[idx * 4 + 3] = Math.round(sum / 9);
      }
    }
  }
}
