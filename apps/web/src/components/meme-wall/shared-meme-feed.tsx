'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';
import { getIdToken } from '@/lib/firebase';
import { withRef } from '@/lib/referral-link';
import { useT } from '@/i18n/client';

export interface FeedMeme {
  id: string;
  caption: string;
  topText: string;
  bottomText: string;
  imageUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  authorName: string;
  authorId: string;
  likes: number;
  commentCount: number;
  userReaction?: 'like' | 'dislike' | null;
}

/** How many memes a visitor without an account sees before signing up. */
const GUEST_LIMIT = 10;
const PAGE_SIZE = 10;
const FLAME = '#FF7A3D';
const ON_FLAME = '#111214';
const memeTextShadow = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000';

/** Height of the app tab bar (MobileBottomNav) the feed sits above in `app` mode. */
const TAB_BAR = 'calc(60px + env(safe-area-inset-bottom))';

/**
 * The full-screen, swipe-up Meme Wall feed, same as the app's.
 * - Shared link (`first` set): starts at the shared meme. Visitors without an
 *   account get GUEST_LIMIT memes, then a sign-up gate (credited to whoever
 *   shared the link via `ref`).
 * - `app`: the signed-in phone web app's home tab, above the tab bar.
 */
export function SharedMemeFeed({
  first,
  refCode = null,
  isIos = false,
  app = false,
}: {
  first?: FeedMeme;
  refCode?: string | null;
  isIos?: boolean;
  app?: boolean;
}) {
  const { user, isLoading } = useAuthStore();
  const t = useT();
  const [memes, setMemes] = useState<FeedMeme[]>(first ? [first] : []);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());

  const registerHref = `/register${refCode || first ? `?ref=${encodeURIComponent(refCode || `meme_${first!.id}`)}` : ''}`;
  const loginHref = `/login?redirect=${encodeURIComponent(first ? `/meme/${first.id}` : '/meme-wall')}`;
  const gated = !app && !isLoading && !user && activeIndex >= GUEST_LIMIT;
  const slideHeight = app ? `calc(100dvh - ${TAB_BAR})` : '100dvh';

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      // Signed in: send the token so each meme carries my like state.
      const token = user ? await getIdToken() : null;
      const res = await fetch(`/api/meme-wall?page=${page}&pageSize=${PAGE_SIZE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const mine: Record<string, boolean> = {};
      for (const m of (data.memes || []) as FeedMeme[]) if (m.userReaction === 'like') mine[m.id] = true;
      setLiked((s) => ({ ...mine, ...s }));
      setMemes((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...prev, ...((data.memes || []) as FeedMeme[]).filter((m) => !known.has(m.id))];
      });
      setHasMore(!!data.hasMore);
      setPage((p) => p + 1);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, user]);

  useEffect(() => {
    // First page once auth is known (the token adds my like state).
    if (!isLoading) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Which slide is on screen: drives video playback, prefetch and the gate.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActiveIndex(Number((e.target as HTMLElement).dataset.index));
          }
        }
      },
      { root, threshold: [0.6] }
    );
    root.querySelectorAll('[data-index]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [memes.length]);

  useEffect(() => {
    if (activeIndex >= memes.length - 3) loadMore();
    memes.forEach((m, i) => {
      const v = videos.current.get(m.id);
      if (!v) return;
      if (i === activeIndex && !gated) v.play().catch(() => {});
      else v.pause();
    });
  }, [activeIndex, memes, gated, loadMore]);

  const like = async (m: FeedMeme) => {
    if (!user) {
      window.location.href = registerHref;
      return;
    }
    const was = !!liked[m.id];
    setLiked((s) => ({ ...s, [m.id]: !was }));
    setMemes((list) => list.map((x) => (x.id === m.id ? { ...x, likes: Math.max(0, x.likes + (was ? -1 : 1)) } : x)));
    try {
      const token = await getIdToken();
      await fetch(`/api/meme-wall/${m.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: 'like' }),
      });
    } catch {}
  };

  const share = async (m: FeedMeme) => {
    const url = withRef(`${window.location.origin}/meme/${m.id}`, user?.referralCode || refCode);
    try {
      if (navigator.share) await navigator.share({ title: m.caption, text: t('pages.meme.shareText', { caption: m.caption }), url });
      else {
        await navigator.clipboard.writeText(url);
        alert(t('pages.meme.linkCopied'));
      }
      fetch(`/api/meme-wall/${m.id}`, { method: 'POST' }).catch(() => {});
    } catch {}
  };

  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 40, padding: '0 16px', borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 45, backgroundColor: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <header style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '12px 14px', background: 'linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0))',
      }}>
        <Link href="/meme-wall" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', textDecoration: 'none' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill={FLAME}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.4, fontFamily: 'var(--font-display), system-ui, sans-serif' }}>MemeWall</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {app && (
            <Link href="/meme-creator" style={{ ...pill, backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff' }}>
              {t('pages.inbox.create')}
            </Link>
          )}
          {!app && !isIos && (
            <a href="/api/download/android" style={{ ...pill, backgroundColor: FLAME, color: ON_FLAME }}>
              {t('pages.meme.feed.getApp')}
            </a>
          )}
          {!user && !isLoading && (
            <Link href={loginHref} style={{ ...pill, backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff' }}>
              {t('pages.meme.feed.signIn')}
            </Link>
          )}
        </div>
      </header>

      {/* Swipe-up feed */}
      <div
        ref={scroller}
        style={{
          height: app ? `calc(100% - ${TAB_BAR})` : '100%', overflowY: gated ? 'hidden' : 'auto', scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
        }}
      >
        {memes.map((m, i) => (
          <section
            key={m.id}
            data-index={i}
            style={{ height: slideHeight, scrollSnapAlign: 'start', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {Math.abs(i - activeIndex) <= 2 && m.imageUrl ? (
              <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
                {m.mediaType === 'video' ? (
                  <video
                    ref={(el) => { if (el) videos.current.set(m.id, el); else videos.current.delete(m.id); }}
                    src={m.imageUrl}
                    muted={muted}
                    loop
                    playsInline
                    onClick={() => setMuted((x) => !x)}
                    style={{ width: '100%', maxHeight: '78dvh', display: 'block', objectFit: 'contain' }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt={m.caption} style={{ width: '100%', maxHeight: '78dvh', display: 'block', objectFit: 'contain' }} />
                )}
                {m.mediaType !== 'image' && m.topText && (
                  <span style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 900, fontSize: 30, textTransform: 'uppercase', padding: '0 8px', textShadow: memeTextShadow }}>{m.topText}</span>
                )}
                {m.mediaType !== 'image' && m.bottomText && (
                  <span style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 900, fontSize: 30, textTransform: 'uppercase', padding: '0 8px', textShadow: memeTextShadow }}>{m.bottomText}</span>
                )}
                {m.mediaType === 'video' && muted && i === activeIndex && (
                  <button
                    onClick={() => setMuted(false)}
                    style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', ...pill, border: 'none', backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer' }}
                  >
                    {t('pages.meme.feed.tapForSound')}
                  </button>
                )}
              </div>
            ) : null}

            {/* Right rail */}
            <div style={{ position: 'absolute', right: 10, bottom: app ? 90 : 120, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <button aria-label={t('pages.meme.feed.like')} onClick={() => like(m)} style={railBtn}>
                <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill={liked[m.id] ? FLAME : 'none'} stroke={liked[m.id] ? FLAME : '#fff'} strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                <span style={railCount}>{m.likes}</span>
              </button>
              <Link aria-label={t('pages.meme.feed.comments')} href={user ? `/meme/${m.id}?view=detail#comments` : registerHref} style={{ ...railBtn, textDecoration: 'none' }}>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                <span style={railCount}>{m.commentCount}</span>
              </Link>
              <button aria-label={t('pages.meme.feed.share')} onClick={() => share(m)} style={railBtn}>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
              </button>
            </div>

            {/* Author + caption */}
            <div style={{ position: 'absolute', left: 14, right: 80, bottom: app ? 16 : 28, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <Link href={`/user/${m.authorId}`} style={{ color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>@{m.authorName}</Link>
              {m.caption ? <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.35 }}>{m.caption}</p> : null}
            </div>
          </section>
        ))}
        {loadingMore && (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3A7B0' }}>…</div>
        )}
      </div>

      {/* Sign-up gate after GUEST_LIMIT memes */}
      {gated && (
        <div role="dialog" aria-modal="true" style={{
          position: 'absolute', inset: 0, zIndex: 30, backgroundColor: 'rgba(0,0,0,0.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ width: '100%', maxWidth: 380, backgroundColor: '#1B1D21', borderRadius: 24, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill={FLAME} style={{ alignSelf: 'center' }}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('pages.meme.feed.gateTitle')}</h2>
            <p style={{ margin: 0, color: '#A3A7B0', fontSize: 15, lineHeight: 1.45 }}>{t('pages.meme.feed.gateText')}</p>
            <Link href={registerHref} style={{ ...pill, minHeight: 50, backgroundColor: FLAME, color: ON_FLAME, fontSize: 16 }}>
              {t('pages.meme.feed.gateRegister')}
            </Link>
            {!isIos && (
              <a href="/api/download/android" style={{ ...pill, minHeight: 50, backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 16 }}>
                {t('pages.meme.downloadAndroid')}
              </a>
            )}
            <Link href={loginHref} style={{ color: '#A3A7B0', fontSize: 14, padding: 10 }}>{t('pages.meme.feed.gateLogin')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

const railBtn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  minWidth: 44, minHeight: 44, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0,
};
const railCount: React.CSSProperties = { fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' };
