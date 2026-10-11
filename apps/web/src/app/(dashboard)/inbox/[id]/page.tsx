'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, MoreVertical, Flame, SendHorizontal } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { authedFetch, useInboxBadge } from '@/lib/hooks/use-inbox';
import { Avatar } from '@/components/inbox/avatar';
import { useT } from '@/i18n/client';
import { cn } from '@/lib/utils';

const POLL_MS = 4000;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  meme: { id: string; imageUrl: string; caption: string; mediaType: string } | null;
  createdAt: string;
  pending?: boolean;
}

interface ConversationInfo {
  id: string;
  other: { id: string; name: string };
  status: 'active' | 'request_in' | 'request_out';
  blockedByMe: boolean;
  seenByOther: boolean;
}

const conversationIdFor = (a: string, b: string) => [a, b].sort().join('_');
const KNOWN_ERRORS = ['BLOCKED', 'DAILY_LIMIT', 'REQUEST_PENDING', 'NOT_FOUND'] as const;

/**
 * 1:1 chat. `/inbox/<conversationId>`, or `/inbox/new?userId=…&name=…` to
 * start one (nothing exists on the server until the first message).
 * Full screen on phones (covers the tab bar, like the app), a card on desktop.
 */
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const t = useT();
  const myId = useAuthStore((s) => s.user?.id) || '';
  const refreshInbox = useInboxBadge((s) => s.refresh);

  const paramUserId = search.get('userId') || '';
  const convId = id !== 'new' ? id : paramUserId && myId ? conversationIdFor(myId, paramUserId) : '';

  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastAt = useRef<string | null>(null);
  const exists = useRef(true);
  const bottom = useRef<HTMLDivElement>(null);

  const otherName = info?.other.name || search.get('name') || '';
  const otherId = info?.other.id || paramUserId || (convId && myId ? convId.split('_').find((x) => x !== myId) || '' : '');

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const load = useCallback(async (initial = false) => {
    if (!convId) return;
    try {
      const after = !initial && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : '';
      const res = await authedFetch(`/api/messages/${convId}${after}`);
      if (res.status === 404) {
        exists.current = false;
        return;
      }
      if (!res.ok) return;
      exists.current = true;
      const data = await res.json();
      setInfo(data.conversation);
      const incoming: ChatMessage[] = data.messages || [];
      if (incoming.length) {
        lastAt.current = incoming[incoming.length - 1].createdAt;
        setMessages((prev) => {
          if (initial) return incoming;
          const known = new Set(prev.map((m) => m.id));
          return [...prev.filter((m) => !m.pending), ...incoming.filter((m) => !known.has(m.id))];
        });
        refreshInbox();
      }
    } catch {
      // Offline: the next poll retries.
    } finally {
      if (initial) setLoading(false);
    }
  }, [convId, refreshInbox]);

  useEffect(() => {
    lastAt.current = null;
    load(true);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(false);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const errorText = (code?: string) =>
    t(code && (KNOWN_ERRORS as readonly string[]).includes(code)
      ? (`pages.inbox.messages.errors.${code}` as 'pages.inbox.messages.errors.BLOCKED')
      : 'pages.inbox.messages.errors.generic');

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending || !otherId) return;
    setSending(true);
    const temp: ChatMessage = {
      id: `pending-${Date.now()}`, senderId: myId, text: body, meme: null,
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [...prev, temp]);
    setText('');
    try {
      const res = exists.current
        ? await authedFetch(`/api/messages/${convId}`, { method: 'POST', body: JSON.stringify({ text: body }) })
        : await authedFetch('/api/messages', { method: 'POST', body: JSON.stringify({ toUserId: otherId, text: body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== temp.id));
        setText(body);
        flash(errorText(data?.code));
        return;
      }
      exists.current = true;
      if (id === 'new') router.replace(`/inbox/${convId}?name=${encodeURIComponent(otherName)}`);
      await load(!lastAt.current);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      flash(errorText());
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    const res = await authedFetch(`/api/messages/${convId}`, { method: 'POST', body: JSON.stringify({ action: 'accept' }) });
    if (res.ok) setInfo((i) => (i ? { ...i, status: 'active' } : i));
  };

  const decline = async () => {
    await authedFetch(`/api/messages/${convId}`, { method: 'DELETE' });
    refreshInbox();
    router.push('/inbox');
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    const blocking = !info?.blockedByMe;
    if (blocking && !window.confirm(t('pages.inbox.messages.blockConfirm', { name: otherName }))) return;
    const res = await authedFetch(`/api/users/${otherId}/block`, { method: 'POST', body: JSON.stringify({ blocked: blocking }) });
    if (!res.ok) return flash(errorText());
    setInfo((i) => (i ? { ...i, blockedByMe: blocking } : i));
    if (blocking) {
      refreshInbox();
      router.push('/inbox');
    }
  };

  const report = async (reason: string) => {
    setReportOpen(false);
    const res = await authedFetch('/api/messages/report', {
      method: 'POST',
      body: JSON.stringify({ conversationId: convId, reason }),
    });
    flash(res.ok ? t('pages.inbox.messages.reportThanks') : errorText());
  };

  const lastMine = [...messages].reverse().find((m) => m.senderId === myId && !m.pending);
  const canWrite = !info?.blockedByMe && info?.status !== 'request_in';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas-light dark:bg-canvas-dark lg:relative lg:inset-auto lg:z-auto lg:mx-auto lg:h-[calc(100dvh-8rem)] lg:max-w-2xl lg:overflow-hidden lg:rounded-3xl lg:border lg:border-[#E7E7E3] lg:dark:border-white/10">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-[#E7E7E3] bg-canvas-light px-2 pb-2 pt-[calc(8px+env(safe-area-inset-top))] dark:border-white/10 dark:bg-canvas-dark">
        <Link href="/inbox" aria-label={t('pages.inbox.messages.backToMessages')} className="flex h-11 w-11 items-center justify-center rounded-full text-ink dark:text-white">
          <ChevronLeft className="h-7 w-7" />
        </Link>
        <Link href={otherId ? `/user/${otherId}` : '#'} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={otherName} size={38} />
          <span className="font-display truncate text-xl font-bold text-ink dark:text-white">{otherName}</span>
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((x) => !x)}
            aria-label={t('pages.inbox.messages.more')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink dark:text-white"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-10 w-48 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5 dark:bg-[#1B1D21] dark:ring-white/10">
              <button onClick={toggleBlock} className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#E5484D]">
                {info?.blockedByMe ? t('pages.inbox.messages.unblock') : t('pages.inbox.messages.block')}
              </button>
              <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink dark:text-white">
                {t('pages.inbox.messages.report')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div key={m.id} className={cn('flex max-w-[80%] flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}>
                  {m.meme && (
                    <Link href={`/meme/${m.meme.id}`} className="block w-52 overflow-hidden rounded-2xl bg-[#111214]">
                      {m.meme.imageUrl ? (
                        m.meme.mediaType === 'video' ? (
                          <video src={m.meme.imageUrl} muted playsInline className="h-52 w-52 object-cover" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.meme.imageUrl} alt={m.meme.caption} className="h-52 w-52 object-cover" />
                        )
                      ) : (
                        <div className="h-52 w-52 bg-[#3A3F4A]" />
                      )}
                      <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white">
                        <Flame className="h-3.5 w-3.5 shrink-0 text-flame" fill="currentColor" />
                        <span className="line-clamp-2">{m.meme.caption || 'Meme Wall'}</span>
                      </span>
                    </Link>
                  )}
                  {m.text && (
                    <p
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[15px] leading-snug',
                        mine
                          ? 'rounded-br-md bg-primary-500 text-white dark:bg-[#4A6FFA]'
                          : 'rounded-bl-md border border-[#E7E7E3] bg-white text-ink dark:border-white/10 dark:bg-[#1B1D21] dark:text-white',
                        m.pending && 'opacity-60'
                      )}
                    >
                      {m.text}
                    </p>
                  )}
                  {mine && lastMine?.id === m.id && info?.seenByOther && info.status === 'active' && (
                    <span className="px-1 text-xs text-[#5E6470] dark:text-[#A3A7B0]">{t('pages.inbox.messages.seen')}</span>
                  )}
                </div>
              );
            })}
            <div ref={bottom} />
          </div>
        )}
      </div>

      {notice && (
        <p role="status" className="mx-3 mb-2 rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-ink">
          {notice}
        </p>
      )}

      {/* Request / blocked notes */}
      {info?.status === 'request_in' && (
        <div className="flex flex-col gap-3 border-t border-[#E7E7E3] bg-white p-4 dark:border-white/10 dark:bg-[#1B1D21]">
          <p className="text-sm leading-relaxed text-ink dark:text-white">{t('pages.inbox.messages.requestIncoming', { name: otherName })}</p>
          <div className="flex gap-2.5">
            <button onClick={decline} className="h-11 flex-1 rounded-full bg-[#F0F0EC] font-bold text-ink dark:bg-[#2A2D33] dark:text-white">
              {t('pages.inbox.messages.decline')}
            </button>
            <button onClick={accept} className="h-11 flex-1 rounded-full bg-primary-500 font-bold text-white">
              {t('pages.inbox.messages.accept')}
            </button>
          </div>
        </div>
      )}
      {info?.status === 'request_out' && (
        <p className="px-4 pb-2 text-center text-xs text-[#5E6470] dark:text-[#A3A7B0]">{t('pages.inbox.messages.requestOutgoing', { name: otherName })}</p>
      )}
      {info?.blockedByMe && (
        <p className="px-4 pb-2 text-center text-xs text-[#5E6470] dark:text-[#A3A7B0]">{t('pages.inbox.messages.blocked')}</p>
      )}

      {/* Composer */}
      {canWrite && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-[#E7E7E3] bg-canvas-light px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 dark:border-white/10 dark:bg-canvas-dark">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={t('pages.inbox.messages.placeholder')}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-[22px] border-0 bg-[#F0F0EC] px-4 py-2.5 text-[15px] text-ink placeholder:text-[#8A8F99] focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:bg-[#1B1D21] dark:text-white"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label={t('pages.inbox.messages.send')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-opacity disabled:opacity-40"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </form>
      )}

      {/* Report reasons */}
      {reportOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setReportOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] dark:bg-[#1B1D21] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <p className="font-display mb-3 text-lg font-bold text-ink dark:text-white">{t('pages.inbox.messages.reportTitle')}</p>
            {(['spam', 'harassment', 'inappropriate', 'other'] as const).map((r) => (
              <button key={r} onClick={() => report(r)} className="block w-full rounded-xl px-3 py-3 text-left font-semibold text-ink hover:bg-[#F0F0EC] dark:text-white dark:hover:bg-white/5">
                {t(`pages.inbox.messages.report${r[0].toUpperCase()}${r.slice(1)}` as 'pages.inbox.messages.reportSpam')}
              </button>
            ))}
            <button onClick={() => setReportOpen(false)} className="mt-2 h-11 w-full rounded-full bg-[#F0F0EC] font-bold text-ink dark:bg-[#2A2D33] dark:text-white">
              {t('pages.inbox.messages.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
