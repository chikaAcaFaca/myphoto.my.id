'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { getIdToken } from '@/lib/firebase';
import { useAuthStore } from '@/lib/stores';

const POLL_MS = 60_000;

interface InboxBadgeState {
  activity: number;
  messages: number;
  refresh: () => Promise<void>;
  clearActivity: () => void;
}

/** Fetch with the signed-in user's token; JSON body by default. */
export async function authedFetch(path: string, init: RequestInit = {}) {
  const token = await getIdToken();
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
}

/** Unread counts for the Inbox badge, shared by the header and the tab bar. */
export const useInboxBadge = create<InboxBadgeState>((set) => ({
  activity: 0,
  messages: 0,
  refresh: async () => {
    try {
      const res = await authedFetch('/api/inbox/unread');
      if (!res.ok) return;
      const data = await res.json();
      set({ activity: data.activity || 0, messages: data.messages || 0 });
    } catch {
      // Offline: keep the last counts.
    }
  },
  clearActivity: () => set({ activity: 0 }),
}));

/** Polls the badge while the page is visible. Mount once (dashboard shell). */
export function useInboxPolling() {
  const user = useAuthStore((s) => s.user);
  const refresh = useInboxBadge((s) => s.refresh);

  useEffect(() => {
    if (!user) return;
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, refresh]);
}
