'use client';

import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useT } from '@/i18n/client';

/**
 * Desktop web-window sign-in.
 *
 * The desktop app opens its built-in browser window at
 * `/desktop-session#t=<custom token>&next=/meme-wall`, with a custom token
 * from /api/auth/custom-token. The token travels in the URL fragment, so it
 * never reaches a server or a log. We sign in with it and continue to `next`
 * — the user is in the same account as the app without typing anything.
 */
export default function DesktopSessionPage() {
  const t = useT();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('t');
    const nextParam = params.get('next') || '/meme-wall';
    // Same-site paths only — never bounce to another origin.
    const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/meme-wall';
    // Drop the token from the address bar / history right away.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setFailed(true);
      return;
    }
    signInWithCustomToken(auth, token)
      .then(() => window.location.replace(next))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#FAFAF8',
        color: failed ? '#b91c1c' : '#5E6470',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {failed ? t('pages.desktopAuth.sessionFailed') : t('pages.desktopAuth.sessionSigningIn')}
    </div>
  );
}
