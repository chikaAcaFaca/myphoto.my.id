import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const REFRESH_MS = 45 * 60 * 1000; // Firebase ID tokens live 1 h

export type ThumbSize = 'small' | 'medium' | 'large';

/**
 * Authorization header for <Image> sources that hit /api/thumbnail. The app
 * has no web session cookie, so without it those images load as blanks.
 * null until the token is ready — render a placeholder until then.
 */
export function useAuthHeaders(): Record<string, string> | null {
  const { user, getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const load = async () => {
      const token = await getTokenRef.current().catch(() => null);
      if (alive && token) setHeaders({ Authorization: `Bearer ${token}` });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [uid]);

  return headers;
}

export function thumbSource(fileId: string, size: ThumbSize, headers: Record<string, string>) {
  return { uri: `${API_URL}/api/thumbnail/${fileId}?size=${size}`, headers };
}

/** A short-lived direct URL for a file's thumbnail (for editing/downloading). */
export async function resolveThumbUrl(fileId: string, size: ThumbSize, token: string | null): Promise<string | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/thumbnail/${fileId}?size=${size}&resolve=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()).url || null;
  } catch {
    return null;
  }
}
