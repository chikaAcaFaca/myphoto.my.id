'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, Upload, Eraser, Undo2 } from 'lucide-react';
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
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removeBackgroundRef = useRef<any>(null);

  // Load image from fileId
  useEffect(() => {
    if (fileId) {
      const url = `/api/thumbnail/${fileId}?size=large`;
      setOriginalUrl(url);
      processWithAI(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const loadLibrary = useCallback(async () => {
    if (removeBackgroundRef.current) return removeBackgroundRef.current;

    setProgressText('Učitavam AI biblioteku...');
    setProgress(5);

    try {
      // Use esm.sh which auto-resolves bare specifier dependencies (onnxruntime-web)
      // @ts-ignore - CDN dynamic import
      const module = await import(/* webpackIgnore: true */ 'https://esm.sh/@imgly/background-removal@1.5.5');
      removeBackgroundRef.current = module.removeBackground || module.default?.removeBackground;
      if (!removeBackgroundRef.current) {
        throw new Error('removeBackground function not found in module');
      }
      return removeBackgroundRef.current;
    } catch (err) {
      console.error('Failed to load background removal library:', err);
      throw new Error('Ne mogu učitati AI biblioteku. Proverite internet konekciju.');
    }
  }, []);

  const processWithAI = useCallback(async (imageSource: string | File) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressText('Priprema...');
    setResultUrl(null);

    try {
      const removeBackground = await loadLibrary();

      setProgressText('Učitavam sliku...');
      setProgress(10);

      // Convert URL to blob if needed
      let input: Blob | File;
      if (typeof imageSource === 'string') {
        const response = await fetch(imageSource);
        input = await response.blob();
      } else {
        input = imageSource;
      }

      setProgressText('AI analizira sliku...');
      setProgress(20);

      // Run AI background removal
      const resultBlob: Blob = await removeBackground(input, {
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          if (key.includes('fetch') || key.includes('download')) {
            setProgressText('Preuzimam AI model...');
            setProgress(10 + Math.round(pct * 0.3));
          } else if (key.includes('compute') || key.includes('inference')) {
            setProgressText('AI prepoznaje objekte i uklanja pozadinu...');
            setProgress(40 + Math.round(pct * 0.55));
          }
        },
      });

      setProgress(98);
      setProgressText('Završavam...');

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setProgress(100);
    } catch (err: any) {
      console.error('Background removal error:', err);
      addNotification({
        type: 'error',
        title: 'Greška',
        message: err.message || 'AI obrada nije uspela',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [addNotification, loadLibrary]);

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = 'bez-pozadine.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addNotification({ type: 'error', title: 'Samo slike su podržane' });
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    processWithAI(file);
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
          AI automatski prepoznaje osobe i objekte i uklanja pozadinu
        </p>
      </div>

      {/* Upload area */}
      {!originalUrl && !isProcessing && (
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
          <p className="text-lg font-medium">{progressText}</p>
          <div className="mt-4 w-64">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-gray-500">{progress}%</p>
          </div>
          {progress < 40 && (
            <p className="mt-4 max-w-md text-center text-xs text-gray-400">
              Prvo učitavanje AI modela može potrajati 30-60 sekundi.
              Naredna korišćenja će biti brža jer se model kešira u pregledaču.
            </p>
          )}
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
              <div
                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                style={{
                  backgroundImage:
                    'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23f0f0f0\'/%3E%3Crect x=\'10\' width=\'10\' height=\'10\' fill=\'%23fff\'/%3E%3Crect y=\'10\' width=\'10\' height=\'10\' fill=\'%23fff\'/%3E%3C/svg%3E")',
                }}
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
              onClick={() => originalUrl && processWithAI(originalUrl)}
              className="btn-secondary"
            >
              <Undo2 className="mr-2 h-4 w-4" />
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
    </div>
  );
}
