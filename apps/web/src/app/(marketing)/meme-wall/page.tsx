'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';

interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
  authorName: string;
  authorId: string;
  likes: number;
  dislikes: number;
  shares: number;
  views: number;
  commentCount: number;
  createdAt: string | null;
  userReaction: 'like' | 'dislike' | null;
}

export default function MemeWallPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reactingId, setReactingId] = useState<string | null>(null);

  // Inline meme creator state
  const [showCreator, setShowCreator] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchMemes = useCallback(async (pageNum: number) => {
    try {
      // Auth is optional here — when signed in we pass a token so the API
      // can tell us which memes the viewer has already reacted to.
      const headers: Record<string, string> = {};
      const token = await getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/meme-wall?page=${pageNum}&pageSize=30`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      if (pageNum === 1) {
        setMemes(data.memes || []);
      } else {
        setMemes(prev => [...prev, ...(data.memes || [])]);
      }
      setHasMore(data.hasMore ?? false);
      setPage(pageNum);
    } catch (e) {
      console.error('Error fetching memes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemes(1);
  }, [fetchMemes, user]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

        const fontSize = Math.max(canvas.width / 15, 24);
        ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = fontSize / 12;
        ctx.lineJoin = 'round';

        if (topText) {
          const y = fontSize + 10;
          ctx.strokeText(topText.toUpperCase(), canvas.width / 2, y);
          ctx.fillText(topText.toUpperCase(), canvas.width / 2, y);
        }
        if (bottomText) {
          const y = canvas.height - 14;
          ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, y);
          ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, y);
        }

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

  const handlePublish = async () => {
    if (!topText && !bottomText) {
      alert('Dodaj tekst na meme.');
      return;
    }
    if (!imageUrl) {
      alert('Izaberi sliku za meme.');
      return;
    }

    setPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        alert('Morate biti ulogovani.');
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
          imageData: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();

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

        // Reset creator and refresh wall
        setImageUrl('');
        setTopText('');
        setBottomText('');
        setShowCreator(false);
        fetchMemes(1);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.error || 'Objavljivanje nije uspelo.');
      }
    } catch {
      alert('Greska pri objavljivanju.');
    } finally {
      setPublishing(false);
    }
  };

  const handleShare = async (meme: Meme) => {
    const url = `${window.location.origin}/meme/${meme.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: meme.caption,
          text: `${meme.caption} — Napravljeno u MyPhoto`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link kopiran!');
      }
    } catch {
      // User cancelled the share sheet — don't count it.
      return;
    }
    // Optimistic bump, then register the share.
    setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, shares: m.shares + 1 } : m));
    fetch(`/api/meme-wall/${meme.id}`, { method: 'POST' }).catch(() => {});
  };

  const handleReact = async (meme: Meme, type: 'like' | 'dislike') => {
    if (!user) {
      router.push('/login?redirect=/meme-wall');
      return;
    }
    if (reactingId === meme.id) return;
    setReactingId(meme.id);

    // Optimistic update: mirror the API's toggle/switch semantics locally.
    const prevReaction = meme.userReaction;
    const nextReaction = prevReaction === type ? null : type;
    setMemes(prev => prev.map(m => {
      if (m.id !== meme.id) return m;
      let { likes, dislikes } = m;
      if (prevReaction === 'like') likes -= 1;
      if (prevReaction === 'dislike') dislikes -= 1;
      if (nextReaction === 'like') likes += 1;
      if (nextReaction === 'dislike') dislikes += 1;
      return { ...m, likes: Math.max(0, likes), dislikes: Math.max(0, dislikes), userReaction: nextReaction };
    }));

    try {
      const token = await getIdToken();
      if (!token) {
        router.push('/login?redirect=/meme-wall');
        return;
      }
      const res = await fetch(`/api/meme-wall/${meme.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        // Reconcile with the server's authoritative counts.
        setMemes(prev => prev.map(m => m.id === meme.id
          ? { ...m, likes: data.likes, dislikes: data.dislikes, userReaction: data.userReaction }
          : m));
      } else {
        // Roll back on failure.
        setMemes(prev => prev.map(m => m.id === meme.id ? meme : m));
      }
    } catch {
      setMemes(prev => prev.map(m => m.id === meme.id ? meme : m));
    } finally {
      setReactingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        padding: '32px 16px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🔥</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>MemeWall</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: 0 }}>
            Javni zid memova — napravi, podeli, osvoji lajkove!
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {user ? (
              <button
                onClick={() => setShowCreator(!showCreator)}
                style={{
                  backgroundColor: '#fff', color: '#f97316', fontWeight: 700,
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 15,
                }}
              >
                {showCreator ? 'Zatvori kreator' : 'Napravi svoj meme'}
              </button>
            ) : (
              <Link
                href="/login?redirect=/meme-wall"
                style={{
                  backgroundColor: '#fff', color: '#f97316', fontWeight: 700,
                  padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Prijavi se i napravi meme
              </Link>
            )}
            <Link
              href="/"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600,
                padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              O MyPhoto
            </Link>
          </div>
        </div>
      </div>

      {/* Inline Meme Creator */}
      {showCreator && user && (
        <div style={{
          maxWidth: 500, margin: '0 auto', padding: '24px 16px',
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: 16, padding: 20,
            border: '1px solid #334155',
          }}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {!imageUrl ? (
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed #475569', borderRadius: 12, padding: 32, cursor: 'pointer',
                backgroundColor: '#0f172a',
              }}>
                <span style={{ fontSize: 40, marginBottom: 8 }}>📷</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>Izaberi sliku</span>
                <span style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>JPG, PNG, GIF</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              </label>
            ) : (
              <>
                {/* Preview */}
                <div style={{
                  position: 'relative', borderRadius: 12, overflow: 'hidden',
                  backgroundColor: '#000', marginBottom: 12,
                }}>
                  <img src={imageUrl} alt="Meme" style={{ width: '100%', display: 'block' }} />
                  {topText && (
                    <div style={{
                      position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center',
                      fontSize: 22, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                      color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                      textTransform: 'uppercase', padding: '0 8px',
                    }}>
                      {topText}
                    </div>
                  )}
                  {bottomText && (
                    <div style={{
                      position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center',
                      fontSize: 22, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                      color: '#fff', textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                      textTransform: 'uppercase', padding: '0 8px',
                    }}>
                      {bottomText}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 4, right: 6,
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    textShadow: '1px 1px 2px #000',
                  }}>
                    myphotomy.space
                  </div>
                </div>

                <label style={{
                  display: 'block', textAlign: 'center', marginBottom: 12,
                  color: '#64748b', fontSize: 12, cursor: 'pointer',
                }}>
                  Promeni sliku
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                </label>
              </>
            )}

            {/* Text inputs */}
            <input
              type="text"
              placeholder="Tekst gore..."
              value={topText}
              onChange={(e) => setTopText(e.target.value)}
              style={{
                width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155',
                backgroundColor: '#0f172a', color: '#fff', marginBottom: 8, fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <input
              type="text"
              placeholder="Tekst dole..."
              value={bottomText}
              onChange={(e) => setBottomText(e.target.value)}
              style={{
                width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155',
                backgroundColor: '#0f172a', color: '#fff', marginBottom: 14, fontSize: 14,
                boxSizing: 'border-box',
              }}
            />

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={publishing || !imageUrl}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none',
                backgroundColor: (!imageUrl || publishing) ? '#475569' : '#f97316',
                color: '#fff', fontWeight: 700, cursor: publishing ? 'wait' : 'pointer',
                fontSize: 15,
              }}
            >
              {publishing ? 'Objavljujem...' : '🔥 Objavi na MemeWall'}
            </button>
          </div>
        </div>
      )}

      {/* Meme Grid */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            Ucitavanje memova...
          </div>
        ) : memes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>MemeWall je prazan!</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>Budi prvi koji ce objaviti meme.</p>
            {user ? (
              <button
                onClick={() => setShowCreator(true)}
                style={{
                  backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                  padding: '12px 32px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 15,
                }}
              >
                Napravi meme
              </button>
            ) : (
              <Link
                href="/login?redirect=/meme-wall"
                style={{
                  backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                  padding: '12px 32px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                Prijavi se i napravi meme
              </Link>
            )}
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {/* Guests get a 10-meme taster, then the registration gate below. */}
              {(user ? memes : memes.slice(0, 10)).map(meme => (
                <div
                  key={meme.id}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {meme.imageUrl && (
                    <Link href={`/meme/${meme.id}`}>
                      <img
                        src={meme.imageUrl}
                        alt={meme.caption}
                        style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
                      />
                    </Link>
                  )}
                  <div style={{ padding: 14 }}>
                    <Link href={`/meme/${meme.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                        {meme.caption}
                      </p>
                    </Link>
                    {meme.authorId ? (
                      <Link
                        href={`/user/${meme.authorId}`}
                        style={{ color: '#f97316', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                      >
                        @{meme.authorName}
                      </Link>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: 12 }}>@{meme.authorName}</span>
                    )}
                    <div style={{
                      display: 'flex', gap: 6, marginTop: 10, alignItems: 'center',
                      borderTop: '1px solid #334155', paddingTop: 10,
                    }}>
                      <button
                        onClick={() => handleReact(meme, 'like')}
                        disabled={reactingId === meme.id}
                        title={user ? 'Sviđa mi se' : 'Prijavi se da reaguješ'}
                        style={{
                          background: 'none', border: 'none',
                          color: meme.userReaction === 'like' ? '#f97316' : '#94a3b8',
                          fontWeight: meme.userReaction === 'like' ? 700 : 400,
                          cursor: reactingId === meme.id ? 'wait' : 'pointer',
                          fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
                        }}
                      >
                        👍 {meme.likes}
                      </button>
                      <button
                        onClick={() => handleReact(meme, 'dislike')}
                        disabled={reactingId === meme.id}
                        title={user ? 'Ne sviđa mi se' : 'Prijavi se da reaguješ'}
                        style={{
                          background: 'none', border: 'none',
                          color: meme.userReaction === 'dislike' ? '#f97316' : '#94a3b8',
                          fontWeight: meme.userReaction === 'dislike' ? 700 : 400,
                          cursor: reactingId === meme.id ? 'wait' : 'pointer',
                          fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
                        }}
                      >
                        👎 {meme.dislikes}
                      </button>
                      <Link
                        href={`/meme/${meme.id}#comments`}
                        title="Komentari"
                        style={{
                          color: '#94a3b8', fontSize: 13, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
                        }}
                      >
                        💬 {meme.commentCount}
                      </Link>
                      <button
                        onClick={() => handleShare(meme)}
                        title="Podeli"
                        style={{
                          background: 'none', border: 'none', color: '#94a3b8',
                          cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center',
                          gap: 4, padding: '2px 4px', marginLeft: 'auto',
                        }}
                      >
                        🔗 {meme.shares}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {user ? (
              hasMore && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <button
                    onClick={() => fetchMemes(page + 1)}
                    style={{
                      backgroundColor: '#334155', color: '#fff', border: 'none',
                      padding: '12px 32px', borderRadius: 10, cursor: 'pointer',
                      fontWeight: 600, fontSize: 14,
                    }}
                  >
                    Ucitaj vise
                  </button>
                </div>
              )
            ) : memes.length >= 10 ? (
              /* Guest funnel — taster ends here, convert to register + app install. */
              <div style={{
                marginTop: 28,
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                borderRadius: 16, padding: '36px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#fff' }}>
                  Video si 10 najboljih!
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 20, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                  Skini MyPhoto aplikaciju da vidiš sve memove, praviš svoje, lajkuješ i pratiš autore — sve na jednom mestu.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href="https://play.google.com/store/apps/details?id=id.my.myphoto"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#fff', color: '#0f172a', fontWeight: 800,
                      padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 15,
                    }}
                  >
                    📱 Skini aplikaciju
                  </a>
                  <Link
                    href="/register"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff', fontWeight: 700,
                      padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 15,
                    }}
                  >
                    Ili otvori na webu
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '32px 16px',
        textAlign: 'center',
        marginTop: 40,
      }}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>Preuzmi MyPhoto aplikaciju</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          Auto-backup slika, cloud storage, meme generator i jos mnogo toga.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {user ? (
            <button
              onClick={() => { setShowCreator(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{
                backgroundColor: '#0ea5e9', color: '#fff', fontWeight: 700,
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              }}
            >
              Napravi meme
            </button>
          ) : (
            <Link
              href="/register"
              style={{
                backgroundColor: '#0ea5e9', color: '#fff', fontWeight: 700,
                padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              Registruj se besplatno
            </Link>
          )}
        </div>
        <p style={{ color: '#475569', fontSize: 11, marginTop: 24 }}>
          NASRM Kapetan Bogdan Studio · myphotomy.space
        </p>
      </div>
    </div>
  );
}
