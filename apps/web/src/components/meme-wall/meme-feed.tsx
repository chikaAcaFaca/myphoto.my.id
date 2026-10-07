'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import { useT } from '@/i18n/client';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=id.my.myphoto';

export interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
  mediaType?: 'image' | 'video' | 'gif';
  topText?: string;
  bottomText?: string;
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

export interface MemeFeedProps {
  /** How many memes a guest sees before the install-app / register gate. */
  guestLimit?: number;
  /** Whether the inline meme creator can be shown (signed-in users only). */
  showCreator?: boolean;
  /** Controlled open state of the inline creator (only used with showCreator). */
  creatorOpen?: boolean;
  onCreatorOpenChange?: (open: boolean) => void;
  /** Tighter grid for embedding (e.g. on the home page). */
  compact?: boolean;
  /** Where to send guests after login when they try to interact. */
  redirectPath?: string;
}

const memeTextShadow = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';

/**
 * The MemeWall feed: grid of memes with reactions / comments / share, an
 * optional inline creator, load-more for signed-in users and the guest
 * funnel (N-meme taster → "get the app" primary, register secondary).
 */
export function MemeFeed({
  guestLimit = 10,
  showCreator = false,
  creatorOpen = false,
  onCreatorOpenChange,
  compact = false,
  redirectPath = '/meme-wall',
}: MemeFeedProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const t = useT();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [reactingId, setReactingId] = useState<string | null>(null);

  // Inline meme creator state
  const [imageUrl, setImageUrl] = useState('');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loginHref = `/login?redirect=${redirectPath}`;
  const setCreatorOpen = (open: boolean) => onCreatorOpenChange?.(open);

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
      alert(t('marketing.memeWall.alerts.addText'));
      return;
    }
    if (!imageUrl) {
      alert(t('marketing.memeWall.alerts.chooseImage'));
      return;
    }

    setPublishing(true);
    try {
      const token = await getIdToken();
      if (!token) {
        alert(t('marketing.memeWall.alerts.mustLogin'));
        return;
      }

      // Render the final JPEG first: the server pins ContentLength on the
      // presigned URL and charges quota, so it needs the exact byte size.
      const blob = await drawMeme();
      if (!blob) {
        alert(t('marketing.memeWall.alerts.publishError'));
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
          size: blob.size,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        if (data.uploadUrl) {
          const put = await fetch(data.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: blob,
          });
          if (!put.ok) {
            alert(t('marketing.memeWall.alerts.publishFailed'));
            return;
          }
        }

        // Reset creator and refresh wall
        setImageUrl('');
        setTopText('');
        setBottomText('');
        setCreatorOpen(false);
        fetchMemes(1);
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.error || t('marketing.memeWall.alerts.publishFailed'));
      }
    } catch {
      alert(t('marketing.memeWall.alerts.publishError'));
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
          text: t('marketing.memeWall.shareText', { caption: meme.caption }),
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert(t('marketing.memeWall.alerts.linkCopied'));
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
      router.push(loginHref);
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
        router.push(loginHref);
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
    <>
      {/* Inline Meme Creator */}
      {showCreator && creatorOpen && user && (
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
                <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{t('marketing.memeWall.chooseImage')}</span>
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
                      color: '#fff', textShadow: memeTextShadow,
                      textTransform: 'uppercase', padding: '0 8px',
                    }}>
                      {topText}
                    </div>
                  )}
                  {bottomText && (
                    <div style={{
                      position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center',
                      fontSize: 22, fontWeight: 900, fontFamily: 'Impact, Arial Black, sans-serif',
                      color: '#fff', textShadow: memeTextShadow,
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
                  {t('marketing.memeWall.changeImage')}
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                </label>
              </>
            )}

            {/* Text inputs */}
            <input
              type="text"
              aria-label={t('marketing.memeWall.topText')}
              placeholder={t('marketing.memeWall.topTextPlaceholder')}
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
              aria-label={t('marketing.memeWall.bottomText')}
              placeholder={t('marketing.memeWall.bottomTextPlaceholder')}
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
              {publishing ? t('marketing.memeWall.publishing') : t('marketing.memeWall.publish')}
            </button>
          </div>
        </div>
      )}

      {/* Meme Grid */}
      <div style={{ maxWidth: compact ? 1100 : 900, margin: '0 auto', padding: compact ? '16px 16px' : '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            {t('marketing.memeWall.loading')}
          </div>
        ) : memes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎨</div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>{t('marketing.memeWall.emptyTitle')}</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>{t('marketing.memeWall.emptyText')}</p>
            {user && showCreator ? (
              <button
                onClick={() => setCreatorOpen(true)}
                style={{
                  backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                  padding: '12px 32px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 15,
                }}
              >
                {t('marketing.memeWall.makeMeme')}
              </button>
            ) : (
              <Link
                href={user ? '/meme-wall' : loginHref}
                style={{
                  backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                  padding: '12px 32px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                {user ? t('marketing.memeWall.makeMeme') : t('marketing.memeWall.loginToMake')}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 220 : 280}px, 1fr))`,
              gap: compact ? 12 : 16,
            }}>
              {/* Guests get a taster, then the registration gate below. */}
              {(user ? memes : memes.slice(0, guestLimit)).map(meme => (
                <div
                  key={meme.id}
                  style={{
                    backgroundColor: '#1e293b',
                    borderRadius: 12,
                    overflow: 'hidden',
                    color: '#fff',
                  }}
                >
                  {meme.imageUrl && (
                    <Link href={`/meme/${meme.id}`} style={{ position: 'relative', display: 'block' }}>
                      {meme.mediaType === 'video' ? (
                        <video
                          src={meme.imageUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
                        />
                      ) : (
                        <img
                          src={meme.imageUrl}
                          alt={meme.caption}
                          style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
                        />
                      )}
                      {/* Video/gif memes aren't baked — overlay the meme text */}
                      {meme.mediaType !== 'image' && (meme.topText || meme.bottomText) && (
                        <>
                          {meme.topText && (
                            <span style={{
                              position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center',
                              color: '#fff', fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 900,
                              fontSize: 20, textTransform: 'uppercase',
                              textShadow: memeTextShadow,
                            }}>{meme.topText}</span>
                          )}
                          {meme.bottomText && (
                            <span style={{
                              position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
                              color: '#fff', fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 900,
                              fontSize: 20, textTransform: 'uppercase',
                              textShadow: memeTextShadow,
                            }}>{meme.bottomText}</span>
                          )}
                        </>
                      )}
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
                        title={user ? t('marketing.memeWall.like') : t('marketing.memeWall.loginToReact')}
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
                        title={user ? t('marketing.memeWall.dislike') : t('marketing.memeWall.loginToReact')}
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
                        title={t('marketing.memeWall.comments')}
                        style={{
                          color: '#94a3b8', fontSize: 13, textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
                        }}
                      >
                        💬 {meme.commentCount}
                      </Link>
                      <button
                        onClick={() => handleShare(meme)}
                        title={t('marketing.memeWall.share')}
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
                    {t('marketing.memeWall.loadMore')}
                  </button>
                </div>
              )
            ) : memes.length >= guestLimit ? (
              /* Guest funnel — taster ends here, convert to app install + register. */
              <div style={{
                marginTop: 28,
                background: 'linear-gradient(135deg, #f97316, #ec4899)',
                borderRadius: 16, padding: '36px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#fff' }}>
                  {t('marketing.memeWall.gateTitle')}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, marginBottom: 20, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                  {t('marketing.memeWall.gateText')}
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#fff', color: '#0f172a', fontWeight: 800,
                      padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 15,
                    }}
                  >
                    {t('marketing.memeWall.getApp')}
                  </a>
                  <Link
                    href="/register"
                    style={{
                      backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff', fontWeight: 700,
                      padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontSize: 15,
                    }}
                  >
                    {t('marketing.memeWall.openWeb')}
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
