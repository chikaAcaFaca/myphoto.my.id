'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';

interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
  authorName: string;
  likes: number;
  shares: number;
  views: number;
  createdAt: string | null;
}

export default function MemeWallPage() {
  const { user } = useAuthStore();
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const createMemeLink = user ? '/meme-wall' : '/login?redirect=/meme-wall';

  const fetchMemes = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/meme-wall?page=${pageNum}&pageSize=30`);
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
  }, [fetchMemes]);

  const handleShare = async (meme: Meme) => {
    const url = `${window.location.origin}/meme/${meme.id}`;
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
    // Track share
    fetch(`/api/meme-wall/${meme.id}`, { method: 'POST' }).catch(() => {});
  };

  const handleLike = async (meme: Meme) => {
    setMemes(prev => prev.map(m => m.id === meme.id ? { ...m, likes: m.likes + 1 } : m));
    fetch(`/api/meme-wall/${meme.id}`, { method: 'POST' }).catch(() => {});
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
            <Link
              href={createMemeLink}
              style={{
                backgroundColor: '#fff', color: '#f97316', fontWeight: 700,
                padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              Napravi svoj meme
            </Link>
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
            <Link
              href={createMemeLink}
              style={{
                backgroundColor: '#f97316', color: '#fff', fontWeight: 700,
                padding: '12px 32px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              Registruj se i napravi meme
            </Link>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {memes.map(meme => (
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
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
                      {meme.caption}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748b', fontSize: 12 }}>@{meme.authorName}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={() => handleLike(meme)}
                          style={{
                            background: 'none', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          ❤️ {meme.likes}
                        </button>
                        <button
                          onClick={() => handleShare(meme)}
                          style={{
                            background: 'none', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          🔗 {meme.shares}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
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
            )}
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
          <Link
            href={createMemeLink}
            style={{
              backgroundColor: '#0ea5e9', color: '#fff', fontWeight: 700,
              padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
            }}
          >
            Registruj se besplatno
          </Link>
        </div>
        <p style={{ color: '#475569', fontSize: 11, marginTop: 24 }}>
          NASRM Kapetan Bogdan Studio · myphotomy.space
        </p>
      </div>
    </div>
  );
}
