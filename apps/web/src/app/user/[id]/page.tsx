'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';

interface Profile {
  id: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  memeCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}

interface Meme {
  id: string;
  caption: string;
  imageUrl: string;
  likes: number;
  dislikes: number;
  commentCount: number;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [memesLoading, setMemesLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      // Auth optional — token populates isFollowing / isSelf.
      const headers: Record<string, string> = {};
      const token = await getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/users/${id}`, { headers });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      setProfile(await res.json());
    } catch {
      // Non-fatal.
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMemes = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${id}/memes?pageSize=30`);
      if (!res.ok) return;
      const data = await res.json();
      setMemes(data.memes || []);
    } catch {
      // Non-fatal.
    } finally {
      setMemesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile, user]);

  useEffect(() => {
    fetchMemes();
  }, [fetchMemes]);

  const handleFollow = async () => {
    if (!user) {
      router.push(`/login?redirect=/user/${id}`);
      return;
    }
    if (!profile || profile.isSelf || following) return;
    setFollowing(true);

    // Optimistic toggle.
    const wasFollowing = profile.isFollowing;
    setProfile({
      ...profile,
      isFollowing: !wasFollowing,
      followerCount: Math.max(0, profile.followerCount + (wasFollowing ? -1 : 1)),
    });

    try {
      const token = await getIdToken();
      if (!token) {
        router.push(`/login?redirect=/user/${id}`);
        return;
      }
      const res = await fetch(`/api/users/${id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => p ? { ...p, isFollowing: data.isFollowing } : p);
      } else {
        // Roll back.
        setProfile((p) => p ? {
          ...p,
          isFollowing: wasFollowing,
          followerCount: Math.max(0, p.followerCount + (wasFollowing ? 1 : -1)),
        } : p);
      }
    } catch {
      setProfile((p) => p ? {
        ...p,
        isFollowing: wasFollowing,
        followerCount: Math.max(0, p.followerCount + (wasFollowing ? 1 : -1)),
      } : p);
    } finally {
      setFollowing(false);
    }
  };

  const wrapStyle: React.CSSProperties = {
    minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'system-ui',
  };

  if (loading) {
    return (
      <div style={wrapStyle}>
        <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>Učitavanje profila...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ ...wrapStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, margin: 0 }}>404</h1>
          <p>Korisnik nije pronađen</p>
          <Link href="/meme-wall" style={{ color: '#f97316' }}>Idi na MemeWall</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)', padding: '32px 16px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link
            href="/meme-wall"
            style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 14 }}
          >
            ← MemeWall
          </Link>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800,
            }}>
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{profile.displayName}</h1>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                <span><strong>{profile.memeCount}</strong> memova</span>
                <span><strong>{profile.followerCount}</strong> pratilaca</span>
                <span><strong>{profile.followingCount}</strong> prati</span>
              </div>
            </div>
            {!profile.isSelf && (
              <button
                onClick={handleFollow}
                disabled={following}
                style={{
                  backgroundColor: profile.isFollowing ? 'rgba(255,255,255,0.2)' : '#fff',
                  color: profile.isFollowing ? '#fff' : '#f97316',
                  fontWeight: 700, padding: '10px 24px', borderRadius: 10,
                  border: profile.isFollowing ? '1px solid rgba(255,255,255,0.5)' : 'none',
                  cursor: following ? 'wait' : 'pointer', fontSize: 15,
                }}
              >
                {profile.isFollowing ? 'Otprati' : 'Zaprati'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Public memes grid */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Javni memovi</h2>
        {memesLoading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Učitavanje memova...</div>
        ) : memes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎨</div>
            <p>Ovaj korisnik još nije objavio nijedan meme.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {memes.map((meme) => (
              <Link
                key={meme.id}
                href={`/meme/${meme.id}`}
                style={{
                  backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden',
                  textDecoration: 'none', color: 'inherit', display: 'block',
                }}
              >
                {meme.imageUrl && (
                  <img
                    src={meme.imageUrl}
                    alt={meme.caption}
                    style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
                  />
                )}
                <div style={{ padding: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', lineHeight: 1.4 }}>
                    {meme.caption}
                  </p>
                  <div style={{ display: 'flex', gap: 12, color: '#94a3b8', fontSize: 12 }}>
                    <span>👍 {meme.likes}</span>
                    <span>👎 {meme.dislikes}</span>
                    <span>💬 {meme.commentCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '24px 16px 40px' }}>
        <Link href="/" style={{ color: '#f97316' }}>myphotomy.space</Link> · NASRM Kapetan Bogdan Studio
      </div>
    </div>
  );
}
