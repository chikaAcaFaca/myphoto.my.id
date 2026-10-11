import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './auth-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
// Pushes refresh the badge right away; polling is only a fallback.
const POLL_MS = 5 * 60_000;

interface InboxContextValue {
  /** Unread activity + messages, shown as the badge on the Inbox tab. */
  unread: number;
  unreadActivity: number;
  unreadMessages: number;
  refresh: () => Promise<void>;
  /** Opening the Activity list clears its part of the badge. */
  clearActivity: () => void;
}

const InboxContext = createContext<InboxContextValue>({
  unread: 0,
  unreadActivity: 0,
  unreadMessages: 0,
  refresh: async () => {},
  clearActivity: () => {},
});

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user, getToken } = useAuth();
  const [counts, setCounts] = useState({ activity: 0, messages: 0 });
  const unread = counts.activity + counts.messages;
  const clearActivity = useCallback(() => setCounts((c) => ({ ...c, activity: 0 })), []);
  const inFlight = useRef(false);
  // getToken is a new function on every auth render; read it through a ref so
  // refresh (and the polling effect) stay stable.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const uid = user?.uid;

  const refresh = useCallback(async () => {
    if (!uid || inFlight.current) return;
    inFlight.current = true;
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/inbox/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCounts({ activity: Number(data.activity) || 0, messages: Number(data.messages) || 0 });
      }
    } catch {
      // Offline or server hiccup: keep the last known count.
    } finally {
      inFlight.current = false;
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setCounts({ activity: 0, messages: 0 });
      return;
    }
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [uid, refresh]);

  return (
    <InboxContext.Provider
      value={{ unread, unreadActivity: counts.activity, unreadMessages: counts.messages, refresh, clearActivity }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  return useContext(InboxContext);
}
