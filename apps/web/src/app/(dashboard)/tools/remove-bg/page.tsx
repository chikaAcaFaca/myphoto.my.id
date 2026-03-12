'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Upload, Eraser, Undo2, MousePointer2 } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

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
  const [isLoading, setIsLoading] = useState(false);
  const [tolerance, setTolerance] = useState(32);
  const [mode, setMode] = useState<'remove' | 'keep'>('remove');
  const [history, setHistory] = useState<ImageData[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image from fileId
  useEffect(() => {
    if (fileId) {
      loadImageFromUrl(`/api/thumbnail/${fileId}?size=large`);
    }
  }, [fileId]);

  const loadImageFromUrl = useCallback((url: string) => {
    setIsLoading(true);
    setHistory([]);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setOriginalUrl(url);
      initCanvas(img);
      setIsLoading(false);
    };
    img.onerror = () => {
      addNotification({ type: 'error', title: 'Slika se ne može učitati' });
      setIsLoading(false);
    };
    img.src = url;
  }, [addNotification]);

  const initCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!canvas || !displayCanvas) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    displayCanvas.width = img.naturalWidth;
    displayCanvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    imageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    renderDisplay();
  };

  const renderDisplay = () => {
    const canvas = canvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!canvas || !displayCanvas) return;

    const ctx = displayCanvas.getContext('2d')!;
    const w = displayCanvas.width;
    const h = displayCanvas.height;

    // Draw checkerboard
    const size = 10;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#f0f0f0' : '#ffffff';
        ctx.fillRect(x, y, size, size);
      }
    }

    // Draw current image data on top
    const srcCtx = canvas.getContext('2d')!;
    const data = srcCtx.getImageData(0, 0, w, h);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(data, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d')!;
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Save current state for undo
    setHistory(prev => [...prev, new ImageData(new Uint8ClampedArray(currentData.data), canvas.width, canvas.height)]);

    if (mode === 'remove') {
      floodFillTransparent(currentData.data, canvas.width, canvas.height, x, y, tolerance);
    } else {
      // "keep" mode: flood fill from click point to mark what to keep, then remove everything else
      const keepMask = new Uint8Array(canvas.width * canvas.height);
      floodFillMask(currentData.data, canvas.width, canvas.height, x, y, tolerance, keepMask);
      // Make everything NOT in the mask transparent
      for (let i = 0; i < keepMask.length; i++) {
        if (!keepMask[i]) {
          currentData.data[i * 4 + 3] = 0;
        }
      }
    }

    ctx.putImageData(currentData, 0, 0);
    renderDisplay();
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));

    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(prev, 0, 0);
    renderDisplay();
  };

  const handleReset = () => {
    const img = imageRef.current;
    if (!img) return;
    setHistory([]);
    initCanvas(img);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bez-pozadine.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addNotification({ type: 'error', title: 'Samo slike su podržane' });
      return;
    }
    const url = URL.createObjectURL(file);
    loadImageFromUrl(url);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-5xl">
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
          Kliknite na deo slike koji želite da {mode === 'remove' ? 'uklonite' : 'zadržite'}
        </p>
      </div>

      {/* Upload area */}
      {!originalUrl && !isLoading && (
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

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary-500" />
          <p className="text-lg font-medium">Učitavam sliku...</p>
        </div>
      )}

      {/* Editor */}
      {originalUrl && !isLoading && (
        <div>
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
              <button
                onClick={() => setMode('remove')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'remove'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <MousePointer2 className="h-3.5 w-3.5" />
                Ukloni
              </button>
              <button
                onClick={() => setMode('keep')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === 'keep'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <MousePointer2 className="h-3.5 w-3.5" />
                Zadrži
              </button>
            </div>

            {/* Tolerance slider */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Tolerancija:</label>
              <input
                type="range"
                min="5"
                max="100"
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{tolerance}</span>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Undo2 className="h-4 w-4" />
              Nazad
            </button>
            <button
              onClick={handleReset}
              className="rounded-md px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Resetuj
            </button>
            <button onClick={handleDownload} className="btn-primary text-sm">
              <Download className="mr-1.5 h-4 w-4" />
              Preuzmi PNG
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-sm"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Nova slika
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Canvas area */}
          <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-center p-4">
              <canvas
                ref={displayCanvasRef}
                onClick={handleCanvasClick}
                className={cn(
                  'max-h-[70vh] max-w-full cursor-crosshair rounded-lg shadow-lg',
                  mode === 'remove' ? 'ring-2 ring-red-200' : 'ring-2 ring-green-200'
                )}
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <strong>Uputstvo:</strong>{' '}
            {mode === 'remove'
              ? 'Kliknite na pozadinu ili deo slike koji želite da uklonite. Svaki klik uklanja povezanu oblast slične boje. Povećajte toleranciju za veće oblasti.'
              : 'Kliknite na objekat koji želite da zadržite. Sve ostalo će biti uklonjeno. Koristite veću toleranciju za složenije objekte.'}
          </div>
        </div>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Flood fill: make connected similar-color pixels transparent
function floodFillTransparent(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number
) {
  const idx = (startY * width + startX) * 4;
  // If already transparent, skip
  if (data[idx + 3] === 0) return;

  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];

  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[startX, startY]];
  const tolSq = tolerance * tolerance * 3; // tolerance squared scaled for RGB

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pi = y * width + x;
    if (visited[pi]) continue;
    visited[pi] = 1;

    const i = pi * 4;
    if (data[i + 3] === 0) continue; // already transparent

    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      data[i + 3] = 0; // make transparent
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
}

// Flood fill mask: mark connected similar-color pixels
function floodFillMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
  mask: Uint8Array
) {
  const idx = (startY * width + startX) * 4;
  if (data[idx + 3] === 0) return;

  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];

  const stack: [number, number][] = [[startX, startY]];
  const tolSq = tolerance * tolerance * 3;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const pi = y * width + x;
    if (mask[pi]) continue;
    mask[pi] = 1;

    const i = pi * 4;
    if (data[i + 3] === 0) continue;

    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= tolSq) {
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    } else {
      mask[pi] = 0; // not similar, unmark
    }
  }
}
