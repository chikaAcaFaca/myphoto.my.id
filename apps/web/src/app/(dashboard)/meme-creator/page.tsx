'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import { useT } from '@/i18n/client';

type MediaType = 'image' | 'video' | 'gif';

export default function MemeCreatorPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const sourceFileId = searchParams.get('fileId') || null;

  // Load media from photoUrl or fileId query param (when coming from photo viewer)
  useEffect(() => {
    const photoUrl = searchParams.get('photoUrl');
    if (photoUrl && !mediaUrl) {
      const decoded = decodeURIComponent(photoUrl);
      setMediaUrl(decoded);
      // Infer media type from URL extension — the photo viewer doesn't
      // pass mediaType separately, and the meme route refuses to bake
      // text into a video, so we need to render the right preview.
      const lower = decoded.toLowerCase().split('?')[0];
      if (lower.match(/\.(mp4|mov|webm|m4v)$/)) setMediaType('video');
      else if (lower.endsWith('.gif')) setMediaType('gif');
      else setMediaType('image');
    }
  }, [searchParams, mediaUrl]);

  // Fallback: if fileId but no photoUrl, fetch via thumbnail
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    const photoUrl = searchParams.get('photoUrl');
    if (fileId && !photoUrl && !mediaUrl) {
      setMediaUrl(`/api/thumbnail/${fileId}`);
    }
  }, [searchParams, mediaUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setMediaUrl(URL.createObjectURL(f));
    if (f.type.startsWith('video/')) setMediaType('video');
    else if (f.type === 'image/gif') setMediaType('gif');
    else setMediaType('image');
  };

  // Bake text into a JPEG. Only used for `image` memes — video and gif keep
  // their original bytes and the wall overlays the text on top at view time
  // (same pattern as the mobile app).
  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mediaUrl) return null;
    if (mediaType !== 'image') return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = mediaUrl;

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
  }, [mediaUrl, topText, bottomText, mediaType]);

  // For non-image memes the "save" button just hands the user back their
  // own file — there's no text-bake step to materialise.
  const handleSave = async () => {
    if (mediaType !== 'image') {
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name || `meme_${Date.now()}.${mediaType === 'gif' ? 'gif' : 'mp4'}`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
      return;
    }
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
      alert(t('dashboard.memeCreator.addTextFirst'));
      return;
    }

    setPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        alert(t('dashboard.memeCreator.mustLogin'));
        return;
      }

      const caption = [topText, bottomText].filter(Boolean).join(' ');

      // Render/pick the upload first: the server needs its exact size to pin
      // the presigned URL and charge it against the user's storage quota.
      let blob: Blob | null = null;
      let contentType = 'image/jpeg';
      if (mediaUrl) {
        if (mediaType === 'video') {
          blob = file;
          contentType = 'video/mp4'; // must match the type the server signed
        } else if (mediaType === 'gif') {
          blob = file;
          contentType = 'image/gif';
        } else {
          blob = await drawMeme();
          contentType = 'image/jpeg';
        }
      }

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
          mediaType,
          imageData: !!blob,
          ...(blob ? { size: blob.size } : {}),
          ...(sourceFileId ? { fileId: sourceFileId } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.uploadUrl) {
          if (blob) {
            await fetch(data.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': contentType },
              body: blob,
            });
          }
        }

        alert(t('dashboard.memeCreator.published'));
        router.push('/meme-wall');
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.error || t('dashboard.memeCreator.publishFailed'));
      }
    } catch {
      alert(t('dashboard.memeCreator.publishError'));
    } finally {
      setPublishing(false);
    }
  };

  const handleShare = async () => {
    if (mediaType !== 'image') {
      // No baked file to share for video/gif — just trigger save so the user
      // can hand their own file to whatever share target they want.
      handleSave();
      return;
    }
    const blob = await drawMeme();
    if (!blob) return;

    const caption = [topText, bottomText].filter(Boolean).join(' ');

    if (navigator.share) {
      const f = new File([blob], 'meme.jpg', { type: 'image/jpeg' });
      await navigator.share({
        title: caption || t('dashboard.memeCreator.shareTitle'),
        text: t('dashboard.memeCreator.shareText', { caption }),
        files: [f],
      }).catch(() => {});
    } else {
      handleSave();
    }
  };

  const isVideo = mediaType === 'video';
  const isGif = mediaType === 'gif';

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>
        {t('dashboard.memeCreator.title')}
      </h1>

      {/* Media upload */}
      {!mediaUrl ? (
        <label style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed #cbd5e1', borderRadius: 12, padding: 40, cursor: 'pointer',
          backgroundColor: '#f8fafc',
        }}>
          <span style={{ fontSize: 48, marginBottom: 12 }}>📷🎬</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>{t('dashboard.memeCreator.pickMedia')}</span>
          <span style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>JPG · PNG · GIF · MP4 · MOV · WebM</span>
          <input type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
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
              {isVideo ? (
                // Muted + autoplay + loop so the preview reads as live video
                // without forcing audio on the editor. The published meme on
                // the wall keeps audio (mobile + web wall unmute it there).
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', display: 'block', maxHeight: '70vh', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                // GIF and static images both render via <img>; the browser
                // animates GIF natively, so we don't need a special branch.
                <img src={mediaUrl} alt="Meme" style={{ width: '100%', display: 'block' }} />
              )}
              {topText && (
                <div style={{
                  position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center',
                  fontSize: 28, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  textTransform: 'uppercase', padding: '0 10px', pointerEvents: 'none',
                }}>
                  {topText}
                </div>
              )}
              {bottomText && (
                <div style={{
                  position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center',
                  fontSize: 28, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                  color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                  textTransform: 'uppercase', padding: '0 10px', pointerEvents: 'none',
                }}>
                  {bottomText}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 6, right: 8,
                fontSize: 11, fontWeight: 700, color: '#fff',
                textShadow: '1px 1px 2px #000', pointerEvents: 'none',
              }}>
                myphotomy.space
              </div>
              {(isVideo || isGif) && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  padding: '2px 8px', borderRadius: 4,
                }}>
                  {isVideo ? 'VIDEO' : 'GIF'}
                </div>
              )}
            </div>
            {isVideo && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, textAlign: 'center' }}>
                {t('dashboard.memeCreator.videoNote')}
              </div>
            )}
          </div>

          {/* Text inputs */}
          <input
            type="text"
            placeholder={t('dashboard.memeCreator.topPlaceholder')}
            aria-label={t('dashboard.memeCreator.topLabel')}
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
              marginBottom: 8, fontSize: 14,
            }}
          />
          <input
            type="text"
            placeholder={t('dashboard.memeCreator.bottomPlaceholder')}
            aria-label={t('dashboard.memeCreator.bottomLabel')}
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
              {t('dashboard.memeCreator.save')}
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
              {publishing ? '...' : t('dashboard.memeCreator.publish')}
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1, padding: 12, borderRadius: 10, border: 'none',
                backgroundColor: '#3b82f6', color: '#fff', fontWeight: 700,
                cursor: 'pointer', fontSize: 14,
              }}
            >
              {t('dashboard.memeCreator.share')}
            </button>
          </div>

          {/* Change media */}
          <label style={{
            display: 'block', textAlign: 'center', marginTop: 12,
            color: '#6b7280', fontSize: 13, cursor: 'pointer',
          }}>
            {t('dashboard.memeCreator.changeMedia')}
            <input type="file" accept="image/*,video/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          </label>
        </>
      )}
    </div>
  );
}
