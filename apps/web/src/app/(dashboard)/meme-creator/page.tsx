'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';

export default function MemeCreatorPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    return new Promise<Blob | null>((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Text style — white with black border
        const fontSize = Math.max(canvas.width / 15, 24);
        ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = fontSize / 12;
        ctx.lineJoin = 'round';

        // Top text
        if (topText) {
          const y = fontSize + 10;
          ctx.strokeText(topText.toUpperCase(), canvas.width / 2, y);
          ctx.fillText(topText.toUpperCase(), canvas.width / 2, y);
        }

        // Bottom text
        if (bottomText) {
          const y = canvas.height - 14;
          ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, y);
          ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, y);
        }

        // Watermark — myphotomy.space
        const wmSize = Math.max(canvas.width / 40, 12);
        ctx.font = `bold ${wmSize}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = wmSize / 6;
        ctx.strokeText('myphotomy.space', canvas.width - 10, canvas.height - 8);
        ctx.fillText('myphotomy.space', canvas.width - 10, canvas.height - 8);

        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(null);
    });
  }, [imageUrl, topText, bottomText]);

  const handleSave = async () => {
    const blob = await drawMeme();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meme_${Date.now()}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const handlePublish = async () => {
    if (!topText && !bottomText) {
      alert('Dodajte tekst na meme pre objavljivanja.');
      return;
    }

    setPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        alert('Morate biti ulogovani da objavite meme.');
        return;
      }

      const caption = [topText, bottomText].filter(Boolean).join(' ');

      const res = await fetch('/api/meme-wall', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption,
          topText,
          bottomText,
          template: 'classic',
          mediaType: 'image',
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Upload the meme image if we have an upload URL
        if (data.uploadUrl) {
          const blob = await drawMeme();
          if (blob) {
            await fetch(data.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg' },
              body: blob,
            });
          }
        }

        alert('Meme objavljen na MemeWall!');
        router.push('/meme-wall');
      } else {
        alert('Objavljivanje nije uspelo.');
      }
    } catch {
      alert('Greska pri objavljivanju.');
    } finally {
      setPublishing(false);
    }
  };

  const handleShare = async () => {
    const blob = await drawMeme();
    if (!blob) return;

    const caption = [topText, bottomText].filter(Boolean).join(' ');

    if (navigator.share) {
      const file = new File([blob], 'meme.jpg', { type: 'image/jpeg' });
      await navigator.share({
        title: caption || 'Moj meme',
        text: `${caption}\n\nNapravljeno na myphotomy.space`,
        files: [file],
      }).catch(() => {});
    } else {
      // Fallback: download
      handleSave();
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        🎨 Meme Generator
      </h1>

      {/* Image upload */}
      {!imageUrl ? (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed #cbd5e1', borderRadius: 12, padding: 40, cursor: 'pointer',
          backgroundColor: '#f8fafc',
        }}>
          <span style={{ fontSize: 48, marginBottom: 12 }}>📷</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Izaberite sliku</span>
          <span style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>JPG, PNG, GIF</span>
          <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
        </label>
      ) : (
        <>
          {/* Preview */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              backgroundColor: '#000',
            }}>
              <img src={imageUrl} alt="Meme" style={{ width: '100%', display: 'block' }} />
              {topText && (
                <div style={{
                  position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center',
                  fontSize: 28, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  textTransform: 'uppercase', padding: '0 10px',
                }}>
                  {topText}
                </div>
              )}
              {bottomText && (
                <div style={{
                  position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center',
                  fontSize: 28, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  textTransform: 'uppercase', padding: '0 10px',
                }}>
                  {bottomText}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 6, right: 8,
                fontSize: 11, fontWeight: 700, color: '#fff',
                textShadow: '1px 1px 2px #000',
              }}>
                myphotomy.space
              </div>
            </div>
          </div>

          {/* Text inputs */}
          <input
            type="text"
            placeholder="Tekst gore..."
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
              marginBottom: 8, fontSize: 14,
            }}
          />
          <input
            type="text"
            placeholder="Tekst dole..."
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
              marginBottom: 16, fontSize: 14,
            }}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1, padding: 12, borderRadius: 10, border: 'none',
                backgroundColor: '#22c55e', color: '#fff', fontWeight: 700,
                cursor: 'pointer', fontSize: 14,
              }}
            >
              💾 Sacuvaj
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={{
                flex: 1, padding: 12, borderRadius: 10, border: 'none',
                backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                cursor: 'pointer', fontSize: 14, opacity: publishing ? 0.6 : 1,
              }}
            >
              {publishing ? '...' : '🔥 Objavi na MemeWall'}
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1, padding: 12, borderRadius: 10, border: 'none',
                backgroundColor: '#3b82f6', color: '#fff', fontWeight: 700,
                cursor: 'pointer', fontSize: 14,
              }}
            >
              🔗 Podeli
            </button>
          </div>

          {/* Change image */}
          <label style={{
            display: 'block', textAlign: 'center', marginTop: 12,
            color: '#6b7280', fontSize: 13, cursor: 'pointer',
          }}>
            Promeni sliku
            <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
          </label>
        </>
      )}
    </div>
  );
}
