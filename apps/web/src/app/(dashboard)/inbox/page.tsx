'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, MessageSquareText, Gift, MessageCircle, Bell, ChevronLeft } from 'lucide-react';
import { authedFetch, useInboxBadge } from '@/lib/hooks/use-inbox';
import { useI18n, useT } from '@/i18n/client';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/inbox/avatar';

interface InboxItem {
  id: string;
  type: 'like' | 'comment' | 'referral_joined' | 'referral_bonus' | 'system';
  actorId: string | null;
  actorName: string | null;
  memeId: string | null;
  text: string | null;
  count: number;
  read: boolean;
  updatedAt: string;
}

interface Conversation {
  id: string;
  other: { id: string; name: string };
  status: 'active' | 'request_in' | 'request_out';
  unread: number;
  lastMessage: { text: string; isMeme: boolean; fromMe: boolean; at: string } | null;
  updatedAt: string;
}

type Tab = 'messages' | 'activity';

function timeAgo(iso: string, sr: boolean): string {
  const min = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return sr ? 'sada' : 'now';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export default function InboxPage() {
  const t = useT();
  const { locale } = useI18n();
  const sr = locale === 'sr';
  const { activity: unreadActivity, messages: unreadMessages, refresh: refreshBadge, clearActivity } = useInboxBadge();
  const [tab, setTab] = useState<Tab>('messages');
  const [showRequests, setShowRequests] = useState(false);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (which: Tab) => {
    setFailed(false);
    try {
      if (which === 'messages') {
        const res = await authedFetch('/api/messages');
        if (!res.ok) throw new Error(String(res.status));
        setConversations((await res.json()).conversations || []);
      } else {
        const res = await authedFetch('/api/inbox');
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setItems(data.items || []);
        // Seen now: clear the badge; rows keep their highlight this visit.
        if ((data.unread || 0) > 0) {
          clearActivity();
          authedFetch('/api/inbox/read', { method: 'POST', body: '{}' }).catch(() => {});
        }
      }
    } catch {
      setFailed(true);
    }
  }, [clearActivity]);

  useEffect(() => {
    load(tab);
    refreshBadge();
  }, [tab, load, refreshBadge]);

  const describe = (item: InboxItem) => {
    const name = item.actorName || t('pages.inbox.someone');
    switch (item.type) {
      case 'like':
        return item.count > 1 ? t('pages.inbox.likeMany', { name, others: item.count - 1 }) : t('pages.inbox.like', { name });
      case 'comment':
        return item.count > 1 ? t('pages.inbox.commentMany', { count: item.count }) : t('pages.inbox.comment', { name, text: item.text || '' });
      case 'referral_joined':
        return t('pages.inbox.referralJoined', { name });
      case 'referral_bonus':
        return t('pages.inbox.referralBonus');
      default:
        return item.text || '';
    }
  };

  const activityHref = (item: InboxItem) =>
    item.memeId ? `/meme/${item.memeId}?view=detail#comments` : '/settings';

  const requests = (conversations || []).filter((c) => c.status === 'request_in');
  const visible = (conversations || []).filter((c) =>
    showRequests ? c.status === 'request_in' : c.status !== 'request_in'
  );

  const preview = (c: Conversation) => {
    if (!c.lastMessage) return '';
    const body = c.lastMessage.text || (c.lastMessage.isMeme ? t('pages.inbox.messages.sentMeme') : '');
    return (c.lastMessage.fromMe ? t('pages.inbox.messages.you') : '') + body;
  };

  const segment = (key: Tab, label: string, count: number) => (
    <button
      type="button"
      onClick={() => { setTab(key); setShowRequests(false); }}
      aria-pressed={tab === key}
      className={cn(
        'flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors',
        tab === key ? 'bg-white text-ink shadow-sm dark:bg-[#2A2D33] dark:text-white' : 'text-[#5E6470] dark:text-[#A3A7B0]'
      )}
    >
      {label}
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E5484D] px-1.5 text-[11px] text-white">{count}</span>
      )}
    </button>
  );

  const empty = (title: string, hint: string, Icon: typeof Bell) => (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-500 dark:bg-primary-500/15 dark:text-[#7B98FF]">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-display text-xl font-bold text-ink dark:text-white">{title}</p>
      <p className="max-w-sm text-sm leading-relaxed text-[#5E6470] dark:text-[#A3A7B0]">{hint}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display px-1 pb-3 text-[28px] font-extrabold tracking-tight text-ink dark:text-white">
        {t('pages.inbox.title')}
      </h1>

      <div className="mb-3 flex gap-1 rounded-full bg-[#F0F0EC] p-1 dark:bg-[#1B1D21]">
        {segment('messages', t('pages.inbox.messages.tabMessages'), unreadMessages)}
        {segment('activity', t('pages.inbox.messages.tabActivity'), unreadActivity)}
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-semibold text-ink dark:text-white">{t('pages.inbox.loadFailed')}</p>
          <button onClick={() => load(tab)} className="rounded-full bg-primary-500 px-5 py-2.5 text-sm font-bold text-white">
            {t('pages.inbox.retry')}
          </button>
        </div>
      ) : tab === 'messages' ? (
        conversations === null ? (
          <Spinner />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#E7E7E3] bg-white dark:border-white/10 dark:bg-[#1B1D21]">
            {showRequests ? (
              <button onClick={() => setShowRequests(false)} className="flex w-full items-center gap-1 px-4 py-3 text-sm font-bold text-primary-500 dark:text-[#7B98FF]">
                <ChevronLeft className="h-4 w-4" /> {t('pages.inbox.messages.backToMessages')}
              </button>
            ) : requests.length > 0 ? (
              <button onClick={() => setShowRequests(true)} className="flex w-full items-center justify-between border-b border-[#E7E7E3] px-4 py-3 dark:border-white/10">
                <span className="font-bold text-ink dark:text-white">{t('pages.inbox.messages.requestsTitle')}</span>
                <span className="text-sm font-bold text-primary-500 dark:text-[#7B98FF]">{t('pages.inbox.messages.requests', { count: requests.length })}</span>
              </button>
            ) : null}
            {visible.length === 0
              ? empty(t('pages.inbox.messages.noMessages'), t('pages.inbox.messages.noMessagesHint'), MessageCircle)
              : visible.map((c) => (
                  <Link
                    key={c.id}
                    href={`/inbox/${c.id}?name=${encodeURIComponent(c.other.name || '')}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFAF8] dark:hover:bg-white/5"
                  >
                    <Avatar name={c.other.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('truncate text-[15px] text-ink dark:text-white', c.unread ? 'font-extrabold' : 'font-semibold')}>
                          {c.other.name || t('pages.inbox.someone')}
                        </p>
                        <span className="shrink-0 text-xs text-[#5E6470] dark:text-[#A3A7B0]">{timeAgo(c.lastMessage?.at || c.updatedAt, sr)}</span>
                      </div>
                      <p className={cn('truncate text-sm', c.unread ? 'font-semibold text-ink dark:text-white' : 'text-[#5E6470] dark:text-[#A3A7B0]')}>
                        {preview(c)}
                      </p>
                    </div>
                    {c.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />}
                  </Link>
                ))}
          </div>
        )
      ) : items === null ? (
        <Spinner />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#E7E7E3] bg-white dark:border-white/10 dark:bg-[#1B1D21]">
          {items.length === 0
            ? empty(t('pages.inbox.empty'), t('pages.inbox.emptyHint'), Bell)
            : items.map((item) => {
                const icon =
                  item.type === 'like'
                    ? { Icon: Heart, cls: 'bg-[#FFEDE4] text-flame' }
                    : item.type === 'comment'
                      ? { Icon: MessageSquareText, cls: 'bg-primary-50 text-primary-500 dark:bg-primary-500/15 dark:text-[#7B98FF]' }
                      : { Icon: Gift, cls: 'bg-ink text-white dark:bg-white dark:text-ink' };
                return (
                  <Link
                    key={item.id}
                    href={activityHref(item)}
                    className={cn('flex items-center gap-3 px-4 py-3', !item.read && 'bg-primary-50 dark:bg-primary-500/10')}
                  >
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', icon.cls)}>
                      <icon.Icon className="h-5 w-5" fill={item.type === 'like' ? 'currentColor' : 'none'} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn('line-clamp-3 text-sm text-ink dark:text-white', item.read ? 'font-medium' : 'font-bold')}>{describe(item)}</p>
                      <p className="text-xs text-[#5E6470] dark:text-[#A3A7B0]">{timeAgo(item.updatedAt, sr)}</p>
                    </div>
                    {!item.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500" />}
                  </Link>
                );
              })}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
    </div>
  );
}
