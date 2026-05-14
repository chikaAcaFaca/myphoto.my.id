'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string | null;
}

interface MemeSocialProps {
  memeId: string;
  caption: string;
  initialLikes: number;
  initialDislikes: number;
  initialShares: number;
  initialCommentCount: number;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'upravo sad';
  const min = Math.round(sec / 60);
  if (min < 60) return `pre ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `pre ${hr} h`;
  const days = Math.round(hr / 24);
  if (days < 30) return `pre ${days} d`;
  return new Date(iso).toLocaleDateString();
}

export default function MemeSocial({
  memeId,
  caption,
  initialLikes,
  initialDislikes,
  initialShares,
  initialCommentCount,
}: MemeSocialProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [shares, setShares] = useState(initialShares);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [reacting, setReacting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load the viewer's existing reaction (auth optional on this endpoint).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        const token = await getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`/api/meme-wall/${memeId}`, { headers });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setUserReaction(data.userReaction ?? null);
        setLikes(data.likes ?? initialLikes);
        setDislikes(data.dislikes ?? initialDislikes);
        setShares(data.shares ?? initialShares);
        setCommentCount(data.commentCount ?? initialCommentCount);
      } catch {
        // Non-fatal — server-rendered counts remain.
      }
    })();
    return () => { cancelled = true; };
  }, [memeId, user, initialLikes, initialDislikes, initialShares, initialCommentCount]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/meme-wall/${memeId}/comments?limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      // Non-fatal.
    } finally {
      setCommentsLoading(false);
    }
  }, [memeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleReact = async (type: 'like' | 'dislike') => {
    if (!user) {
      router.push(`/login?redirect=/meme/${memeId}`);
      return;
    }
    if (reacting) return;
    setReacting(true);

    const prevReaction = userReaction;
    const prevLikes = likes;
    const prevDislikes = dislikes;
    const nextReaction = prevReaction === type ? null : type;

    // Optimistic update mirroring the API's toggle/switch semantics.
    let nextLikes = likes;
    let nextDislikes = dislikes;
    if (prevReaction === 'like') nextLikes -= 1;
    if (prevReaction === 'dislike') nextDislikes -= 1;
    if (nextReaction === 'like') nextLikes += 1;
    if (nextReaction === 'dislike') nextDislikes += 1;
    setLikes(Math.max(0, nextLikes));
    setDislikes(Math.max(0, nextDislikes));
    setUserReaction(nextReaction);

    try {
      const token = await getIdToken();
      if (!token) {
        router.push(`/login?redirect=/meme/${memeId}`);
        return;
      }
      const res = await fetch(`/api/meme-wall/${memeId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setUserReaction(data.userReaction);
      } else {
        setLikes(prevLikes);
        setDislikes(prevDislikes);
        setUserReaction(prevReaction);
      }
    } catch {
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setUserReaction(prevReaction);
    } finally {
      setReacting(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/meme/${memeId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: caption, text: `${caption} — Napravljeno u MyPhoto`, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link kopiran!');
      }
    } catch {
      return;
    }
    setShares(s => s + 1);
    fetch(`/api/meme-wall/${memeId}`, { method: 'POST' }).catch(() => {});
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;
    if (!user) {
      router.push(`/login?redirect=/meme/${memeId}`);
      return;
    }
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) {
        router.push(`/login?redirect=/meme/${memeId}`);
        return;
      }
      const res = await fetch(`/api/meme-wall/${memeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.comment, ...prev]);
        setCommentCount(c => c + 1);
        setCommentText('');
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || 'Slanje komentara nije uspelo.');
      }
    } catch {
      alert('Greška pri slanju komentara.');
    } finally {
      setSubmitting(false);
    }
  };

  const reactionBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? '#f97316' : '#1e293b',
    border: `1px solid ${active ? '#f97316' : '#334155'}`,
    color: '#fff',
    fontWeight: active ? 700 : 500,
    cursor: reacting ? 'wait' : 'pointer',
    fontSize: 14,
    padding: '8px 14px',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  });

  return (
    <div>
      {/* Reaction / share bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => handleReact('like')} disabled={reacting} style={reactionBtnStyle(userReaction === 'like')}>
          👍 {likes}
        </button>
        <button onClick={() => handleReact('dislike')} disabled={reacting} style={reactionBtnStyle(userReaction === 'dislike')}>
          👎 {dislikes}
        </button>
        <a
          href="#comments"
          style={{
            background: '#1e293b', border: '1px solid #334155', color: '#fff',
            fontSize: 14, padding: '8px 14px', borderRadius: 10, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          💬 {commentCount}
        </a>
        <button
          onClick={handleShare}
          style={{
            background: '#1e293b', border: '1px solid #334155', color: '#fff',
            fontSize: 14, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          🔗 {shares}
        </button>
      </div>

      {/* Comments */}
      <div id="comments" style={{ marginBottom: 24, scrollMarginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Komentari ({commentCount})</h3>

        {user ? (
          <form onSubmit={handleSubmitComment} style={{ marginBottom: 16 }}>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Napiši komentar..."
              maxLength={1000}
              rows={2}
              style={{
                width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155',
                backgroundColor: '#1e293b', color: '#fff', fontSize: 14, boxSizing: 'border-box',
                resize: 'vertical', fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              style={{
                marginTop: 8, padding: '8px 20px', borderRadius: 10, border: 'none',
                backgroundColor: (submitting || !commentText.trim()) ? '#475569' : '#f97316',
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: (submitting || !commentText.trim()) ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Šaljem...' : 'Objavi komentar'}
            </button>
          </form>
        ) : (
          <div style={{
            backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 10,
            padding: 14, marginBottom: 16, fontSize: 14, color: '#94a3b8',
          }}>
            <Link href={`/login?redirect=/meme/${memeId}`} style={{ color: '#f97316', fontWeight: 600 }}>
              Prijavi se
            </Link>{' '}
            da ostaviš komentar.
          </div>
        )}

        {commentsLoading ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>Učitavanje komentara...</p>
        ) : comments.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 14 }}>Još nema komentara. Budi prvi!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#1e293b', borderRadius: 10, padding: 12,
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {c.authorId ? (
                    <Link
                      href={`/user/${c.authorId}`}
                      style={{ color: '#f97316', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                    >
                      @{c.authorName}
                    </Link>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>@{c.authorName}</span>
                  )}
                  <span style={{ color: '#64748b', fontSize: 12 }}>{relativeTime(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: 14, color: '#e2e8f0', margin: 0, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
