'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Type,
  Mic,
  MicOff,
  Square,
  Loader2,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  Minus,
  Move,
  Save,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

export default function ImageEditorPage() {
  return (
    <Suspense>
      <ImageEditorContent />
    </Suspense>
  );
}

type Tool = 'none' | 'crop' | 'meme';

interface MemeText {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  strokeColor: string;
  bold: boolean;
  position: 'top' | 'bottom' | 'custom';
}

interface HistoryState {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  cropArea: { x: number; y: number; w: number; h: number } | null;
  memeTexts: MemeText[];
}

function ImageEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addNotification } = useUIStore();
  const fileId = searchParams.get('fileId');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('none');

  // Transform state
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [appliedCrop, setAppliedCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Meme state
  const [memeTexts, setMemeTexts] = useState<MemeText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Audio recording for meme
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // History (undo/redo)
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // File upload for standalone use
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image
  useEffect(() => {
    if (fileId) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/api/thumbnail/${fileId}?size=large`;
      img.onload = () => {
        originalImageRef.current = img;
        setImageLoaded(true);
        pushHistory({ rotation: 0, flipH: false, flipV: false, cropArea: null, memeTexts: [] });
      };
      img.onerror = () => {
        addNotification({ type: 'error', title: 'Ne mogu da učitam sliku' });
      };
    }
  }, [fileId, addNotification]);

  const pushHistory = useCallback((state: HistoryState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const getCurrentState = useCallback((): HistoryState => ({
    rotation, flipH, flipV, cropArea: appliedCrop, memeTexts,
  }), [rotation, flipH, flipV, appliedCrop, memeTexts]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine source area (crop or full image)
    const sx = appliedCrop ? appliedCrop.x : 0;
    const sy = appliedCrop ? appliedCrop.y : 0;
    const sw = appliedCrop ? appliedCrop.w : img.naturalWidth;
    const sh = appliedCrop ? appliedCrop.h : img.naturalHeight;

    // Calculate canvas dimensions based on rotation
    const isRotated90 = rotation % 180 !== 0;
    const cw = isRotated90 ? sh : sw;
    const ch = isRotated90 ? sw : sh;

    // Scale to fit container
    const container = containerRef.current;
    const maxW = container ? container.clientWidth - 32 : 800;
    const maxH = Math.min(window.innerHeight * 0.65, 700);
    const scale = Math.min(maxW / cw, maxH / ch, 1);

    canvas.width = Math.round(cw * scale);
    canvas.height = Math.round(ch * scale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Center, rotate, flip
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const drawW = sw * scale;
    const drawH = sh * scale;
    ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop overlay
    if (activeTool === 'crop' && cropStart && cropEnd) {
      const cx = Math.min(cropStart.x, cropEnd.x);
      const cy = Math.min(cropStart.y, cropEnd.y);
      const crw = Math.abs(cropEnd.x - cropStart.x);
      const crh = Math.abs(cropEnd.y - cropStart.y);

      // Dim everything outside crop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cx, cy, crw, crh);
      ctx.drawImage(canvas, cx, cy, crw, crh, cx, cy, crw, crh);

      // Crop border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cx, cy, crw, crh);
      ctx.setLineDash([]);

      // Grid lines (rule of thirds)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + (crw * i) / 3, cy);
        ctx.lineTo(cx + (crw * i) / 3, cy + crh);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + (crh * i) / 3);
        ctx.lineTo(cx + crw, cy + (crh * i) / 3);
        ctx.stroke();
      }
    }

    // Draw meme texts
    for (const mt of memeTexts) {
      ctx.save();
      ctx.font = `${mt.bold ? 'bold ' : ''}${mt.fontSize * scale}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let tx = mt.x * scale;
      let ty = mt.y * scale;
      if (mt.position === 'top') {
        tx = canvas.width / 2;
        ty = mt.fontSize * scale;
      } else if (mt.position === 'bottom') {
        tx = canvas.width / 2;
        ty = canvas.height - mt.fontSize * scale;
      }

      // Stroke (outline)
      ctx.strokeStyle = mt.strokeColor;
      ctx.lineWidth = Math.max(2, mt.fontSize * scale * 0.08);
      ctx.lineJoin = 'round';
      ctx.strokeText(mt.text, tx, ty);

      // Fill
      ctx.fillStyle = mt.color;
      ctx.fillText(mt.text, tx, ty);

      // Selection indicator
      if (selectedTextId === mt.id) {
        const metrics = ctx.measureText(mt.text);
        const pad = 6;
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          tx - metrics.width / 2 - pad,
          ty - mt.fontSize * scale / 2 - pad,
          metrics.width + pad * 2,
          mt.fontSize * scale + pad * 2
        );
        ctx.setLineDash([]);
      }

      ctx.restore();
    }
  }, [rotation, flipH, flipV, appliedCrop, activeTool, cropStart, cropEnd, memeTexts, selectedTextId]);

  useEffect(() => {
    if (imageLoaded) renderCanvas();
  }, [imageLoaded, renderCanvas]);

  // Rotate
  const handleRotate = (deg: number) => {
    const newRot = (rotation + deg + 360) % 360;
    setRotation(newRot);
    pushHistory({ ...getCurrentState(), rotation: newRot });
  };

  // Flip
  const handleFlipH = () => {
    setFlipH(prev => !prev);
    pushHistory({ ...getCurrentState(), flipH: !flipH });
  };

  const handleFlipV = () => {
    setFlipV(prev => !prev);
    pushHistory({ ...getCurrentState(), flipV: !flipV });
  };

  // Crop mouse handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'crop') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStart({ x, y });
    setCropEnd({ x, y });
    setIsCropping(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || activeTool !== 'crop') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setCropEnd({
      x: Math.max(0, Math.min(e.clientX - rect.left, canvasRef.current!.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, canvasRef.current!.height)),
    });
  };

  const handleCropMouseUp = () => {
    setIsCropping(false);
  };

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !canvasRef.current || !originalImageRef.current) return;
    const canvas = canvasRef.current;
    const img = originalImageRef.current;

    const cx = Math.min(cropStart.x, cropEnd.x);
    const cy = Math.min(cropStart.y, cropEnd.y);
    const cw = Math.abs(cropEnd.x - cropStart.x);
    const ch = Math.abs(cropEnd.y - cropStart.y);

    if (cw < 10 || ch < 10) return;

    // Convert canvas coordinates back to image coordinates
    const scaleX = (appliedCrop ? appliedCrop.w : img.naturalWidth) / canvas.width;
    const scaleY = (appliedCrop ? appliedCrop.h : img.naturalHeight) / canvas.height;
    const baseX = appliedCrop ? appliedCrop.x : 0;
    const baseY = appliedCrop ? appliedCrop.y : 0;

    const newCrop = {
      x: Math.round(baseX + cx * scaleX),
      y: Math.round(baseY + cy * scaleY),
      w: Math.round(cw * scaleX),
      h: Math.round(ch * scaleY),
    };

    setAppliedCrop(newCrop);
    setCropStart(null);
    setCropEnd(null);
    setActiveTool('none');
    pushHistory({ ...getCurrentState(), cropArea: newCrop });
  };

  const resetCrop = () => {
    setAppliedCrop(null);
    setCropStart(null);
    setCropEnd(null);
    setActiveTool('none');
    pushHistory({ ...getCurrentState(), cropArea: null });
  };

  // Meme text
  const addMemeText = (position: 'top' | 'bottom') => {
    const newText: MemeText = {
      id: Math.random().toString(36).slice(2),
      text: position === 'top' ? 'GORNJI TEKST' : 'DONJI TEKST',
      x: 0,
      y: 0,
      fontSize: 48,
      color: '#ffffff',
      strokeColor: '#000000',
      bold: true,
      position,
    };
    const newTexts = [...memeTexts, newText];
    setMemeTexts(newTexts);
    setSelectedTextId(newText.id);
    setEditingTextId(newText.id);
    setActiveTool('meme');
    pushHistory({ ...getCurrentState(), memeTexts: newTexts });
  };

  const updateMemeText = (id: string, updates: Partial<MemeText>) => {
    const newTexts = memeTexts.map(t => t.id === id ? { ...t, ...updates } : t);
    setMemeTexts(newTexts);
  };

  const deleteMemeText = (id: string) => {
    const newTexts = memeTexts.filter(t => t.id !== id);
    setMemeTexts(newTexts);
    setSelectedTextId(null);
    setEditingTextId(null);
    pushHistory({ ...getCurrentState(), memeTexts: newTexts });
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      addNotification({ type: 'error', title: 'Mikrofon nije dostupan' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Undo/Redo
  const undo = () => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setRotation(prev.rotation);
    setFlipH(prev.flipH);
    setFlipV(prev.flipV);
    setAppliedCrop(prev.cropArea);
    setMemeTexts(prev.memeTexts);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setRotation(next.rotation);
    setFlipH(next.flipH);
    setFlipV(next.flipV);
    setAppliedCrop(next.cropArea);
    setMemeTexts(next.memeTexts);
  };

  // Export as high-res PNG
  const handleExport = () => {
    const img = originalImageRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d')!;

    const sx = appliedCrop ? appliedCrop.x : 0;
    const sy = appliedCrop ? appliedCrop.y : 0;
    const sw = appliedCrop ? appliedCrop.w : img.naturalWidth;
    const sh = appliedCrop ? appliedCrop.h : img.naturalHeight;

    const isRotated90 = rotation % 180 !== 0;
    exportCanvas.width = isRotated90 ? sh : sw;
    exportCanvas.height = isRotated90 ? sw : sh;

    ctx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw meme texts at full resolution
    for (const mt of memeTexts) {
      ctx.font = `${mt.bold ? 'bold ' : ''}${mt.fontSize}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let tx = mt.x;
      let ty = mt.y;
      if (mt.position === 'top') {
        tx = exportCanvas.width / 2;
        ty = mt.fontSize;
      } else if (mt.position === 'bottom') {
        tx = exportCanvas.width / 2;
        ty = exportCanvas.height - mt.fontSize;
      }

      ctx.strokeStyle = mt.strokeColor;
      ctx.lineWidth = Math.max(2, mt.fontSize * 0.08);
      ctx.lineJoin = 'round';
      ctx.strokeText(mt.text, tx, ty);
      ctx.fillStyle = mt.color;
      ctx.fillText(mt.text, tx, ty);
    }

    const link = document.createElement('a');
    link.download = `mycamerabackup-edit-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification({ type: 'success', title: 'Slika preuzeta' });
  };

  // Export meme with audio as video
  const handleExportMemeVideo = async () => {
    if (!audioBlob || !canvasRef.current) return;

    addNotification({ type: 'success', title: 'Preuzimanje slike i zvuka...' });

    // Download image
    handleExport();

    // Download audio separately
    const audioLink = document.createElement('a');
    audioLink.download = `mycamerabackup-meme-audio-${Date.now()}.webm`;
    audioLink.href = audioUrl!;
    document.body.appendChild(audioLink);
    audioLink.click();
    document.body.removeChild(audioLink);
  };

  // File upload for standalone use
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      addNotification({ type: 'error', title: 'Samo slike su podržane' });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      originalImageRef.current = img;
      setImageLoaded(true);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAppliedCrop(null);
      setMemeTexts([]);
      setHistory([]);
      setHistoryIndex(-1);
      pushHistory({ rotation: 0, flipH: false, flipV: false, cropArea: null, memeTexts: [] });
    };
    e.target.value = '';
  };

  const selectedText = memeTexts.find(t => t.id === selectedTextId);

  return (
    <div className="mx-auto max-w-6xl">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Nazad
      </button>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Crop className="h-6 w-6 text-primary-500" />
            Uredi sliku
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rotiraj, iseci, dodaj tekst za mim + snimi zvuk
          </p>
        </div>
        <div className="flex gap-2">
          {audioBlob && (
            <button onClick={handleExportMemeVideo} className="btn-secondary text-sm">
              <Download className="mr-1.5 h-4 w-4" />
              Preuzmi mim + zvuk
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={!imageLoaded}
            className="btn-primary text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Preuzmi PNG
          </button>
        </div>
      </div>

      {/* Upload area if no fileId */}
      {!fileId && !imageLoaded && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-12 hover:border-primary-400 dark:border-gray-600"
        >
          <Crop className="mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg font-medium">Izaberite sliku za uređivanje</p>
          <p className="mt-1 text-sm text-gray-500">ili prevucite ovde</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {imageLoaded && (
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Toolbar */}
          <div className="flex flex-row gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800 lg:w-16 lg:flex-col lg:overflow-x-visible">
            {/* Undo/Redo */}
            <button onClick={undo} disabled={historyIndex <= 0} title="Poništi" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700">
              <Undo2 className="h-5 w-5" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Ponovi" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700">
              <Redo2 className="h-5 w-5" />
            </button>

            <div className="mx-1 h-px w-full bg-gray-200 dark:bg-gray-700 lg:h-auto lg:w-px" />

            {/* Rotate */}
            <button onClick={() => handleRotate(-90)} title="Rotiraj levo" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button onClick={() => handleRotate(90)} title="Rotiraj desno" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Flip */}
            <button onClick={handleFlipH} title="Okreni horizontalno" className={cn('rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700', flipH ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'text-gray-500')}>
              <FlipHorizontal className="h-5 w-5" />
            </button>
            <button onClick={handleFlipV} title="Okreni vertikalno" className={cn('rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700', flipV ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'text-gray-500')}>
              <FlipVertical className="h-5 w-5" />
            </button>

            <div className="mx-1 h-px w-full bg-gray-200 dark:bg-gray-700 lg:h-auto lg:w-px" />

            {/* Crop */}
            <button
              onClick={() => setActiveTool(activeTool === 'crop' ? 'none' : 'crop')}
              title="Iseci"
              className={cn('rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700', activeTool === 'crop' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'text-gray-500')}
            >
              <Crop className="h-5 w-5" />
            </button>

            {/* Meme */}
            <button
              onClick={() => setActiveTool(activeTool === 'meme' ? 'none' : 'meme')}
              title="Dodaj tekst (mim)"
              className={cn('rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700', activeTool === 'meme' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30' : 'text-gray-500')}
            >
              <Type className="h-5 w-5" />
            </button>

            {/* Audio */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Zaustavi snimanje' : 'Snimi zvuk'}
              className={cn('rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700', isRecording ? 'animate-pulse bg-red-100 text-red-600 dark:bg-red-900/30' : 'text-gray-500')}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          </div>

          {/* Canvas area */}
          <div ref={containerRef} className="flex-1">
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-900"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'10\' height=\'10\' fill=\'%23e5e5e5\'/%3E%3Crect x=\'10\' y=\'10\' width=\'10\' height=\'10\' fill=\'%23e5e5e5\'/%3E%3Crect x=\'10\' width=\'10\' height=\'10\' fill=\'%23f5f5f5\'/%3E%3Crect y=\'10\' width=\'10\' height=\'10\' fill=\'%23f5f5f5\'/%3E%3C/svg%3E")' }}
            >
              <canvas
                ref={canvasRef}
                className={cn('max-w-full', activeTool === 'crop' ? 'cursor-crosshair' : 'cursor-default')}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
              />
            </div>

            {/* Crop actions */}
            {activeTool === 'crop' && cropStart && cropEnd && !isCropping && (
              <div className="mt-3 flex items-center justify-center gap-3">
                <button onClick={applyCrop} className="btn-primary text-sm">
                  <Crop className="mr-1.5 h-4 w-4" />
                  Primeni isecanje
                </button>
                <button onClick={() => { setCropStart(null); setCropEnd(null); }} className="btn-secondary text-sm">
                  Poništi
                </button>
                {appliedCrop && (
                  <button onClick={resetCrop} className="text-sm text-red-500 hover:text-red-700">
                    Vrati original
                  </button>
                )}
              </div>
            )}

            {/* Audio playback */}
            {audioUrl && (
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <Mic className="h-4 w-4 text-gray-500" />
                <audio src={audioUrl} controls className="h-8 w-64" />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null); }} className="text-xs text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Meme text panel */}
          {activeTool === 'meme' && (
            <div className="w-full space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:w-72">
              <h3 className="flex items-center gap-2 font-semibold">
                <Type className="h-4 w-4 text-yellow-500" />
                Mim tekst
              </h3>

              <div className="flex gap-2">
                <button onClick={() => addMemeText('top')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Gornji tekst
                </button>
                <button onClick={() => addMemeText('bottom')} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                  <Plus className="mr-1 inline h-3.5 w-3.5" />
                  Donji tekst
                </button>
              </div>

              {memeTexts.map((mt) => (
                <div
                  key={mt.id}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    selectedTextId === mt.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700'
                  )}
                  onClick={() => { setSelectedTextId(mt.id); setEditingTextId(mt.id); }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400 uppercase">
                      {mt.position === 'top' ? 'Gore' : mt.position === 'bottom' ? 'Dole' : 'Custom'}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); deleteMemeText(mt.id); }} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <input
                    value={mt.text}
                    onChange={(e) => updateMemeText(mt.id, { text: e.target.value })}
                    className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                    placeholder="Tekst mima..."
                  />

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Veličina</label>
                    <button onClick={() => updateMemeText(mt.id, { fontSize: Math.max(16, mt.fontSize - 4) })} className="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center text-xs">{mt.fontSize}</span>
                    <button onClick={() => updateMemeText(mt.id, { fontSize: Math.min(120, mt.fontSize + 4) })} className="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600">
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <div className="ml-auto flex gap-1">
                      <input
                        type="color"
                        value={mt.color}
                        onChange={(e) => updateMemeText(mt.id, { color: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border-0"
                        title="Boja teksta"
                      />
                      <input
                        type="color"
                        value={mt.strokeColor}
                        onChange={(e) => updateMemeText(mt.id, { strokeColor: e.target.value })}
                        className="h-6 w-6 cursor-pointer rounded border-0"
                        title="Boja okvira"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {memeTexts.length === 0 && (
                <p className="text-center text-sm text-gray-400">
                  Dodajte gornji ili donji tekst za mim
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
