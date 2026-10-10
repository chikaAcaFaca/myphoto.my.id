import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './auth-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const POLL_MS = 60_000;

interface InboxContextValue {
  /** Unread activity + messages, shown as the badge on the Inbox tab. */
  unread: number;
  refresh: () => Promise<void>;
  setUnread: (n: number) => void;
}

const InboxContext = createContext<InboxContextValue>({
  unread: 0,
  refresh: async () => {},
  setUnread: () => {},
});

export function InboxProvider({ children }: { children: ReactNode }) {
  const { user, getToken } = useAuth();
  const [unread, setUnread] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || inFlight.current) return;
    inFlight.current = true;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/inbox/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnread(Number(data.unread) || 0);
      }
    } catch {
      // Offline or server hiccup: keep the last known count.
    } finally {
      inFlight.current = false;
    }
  }, [user, getToken]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
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
  }, [user, refresh]);

  return (
    <InboxContext.Provider value={{ unread, refresh, setUnread }}>
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox() {
  return useContext(InboxContext);
}
