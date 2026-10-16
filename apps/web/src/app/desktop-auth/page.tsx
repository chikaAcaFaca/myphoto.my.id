'use client';

import { useState } from 'react';
import { signInWithGoogle, auth } from '@/lib/firebase';
import { useT } from '@/i18n/client';

/**
 * Desktop Google sign-in bridge.
 *
 * The Electron desktop app opens this page in the system browser
 * (`/desktop-auth?port=PORT&state=NONCE`), pointing at a temporary loopback
 * HTTP server it runs on 127.0.0.1. We reuse the exact same web Google sign-in,
 * then hand the resulting Firebase idToken + refreshToken back to the desktop
 * app over the loopback so it can persist them like a normal email/password
 * login. The `state` nonce ties the response to the request the desktop opened.
 *
 * signInWithPopup must run from a user gesture, so this is a button, not auto.
 */
export default function DesktopAuthPage() {
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const t = useT();

  async function start() {
    const params = new URLSearchParams(window.location.search);
    const port = params.get('port');
    const state = params.get('state');
    if (!port || !state) {
      setStatus('error');
      setMessage(t('pages.desktopAuth.badLink'));
      return;
    }

    try {
      setStatus('busy');
      setMessage(t('pages.desktopAuth.signingIn'));
      const user = await signInWithGoogle();
      const idToken = await user.getIdToken();
      const refreshToken = user.refreshToken || auth.currentUser?.refreshToken || '';

      setMessage(t('pages.desktopAuth.connecting'));
      await fetch(`http://127.0.0.1:${port}/callback?state=${encodeURIComponent(state)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Firebase ID tokens last 1h; the desktop refreshes via /api/auth/refresh.
        body: JSON.stringify({ idToken, refreshToken, expiresIn: 3600 }),
      });

      setStatus('done');
      setMessage(t('pages.desktopAuth.done'));
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : t('pages.desktopAuth.failed'));
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#f9fafb',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 380,
          width: '100%',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>MyPhoto Desktop</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          {t('pages.desktopAuth.subtitle')}
        </p>

        {status !== 'done' && (
          <button
            onClick={start}
            disabled={status === 'busy'}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: status === 'busy' ? '#f3f4f6' : '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: status === 'busy' ? 'default' : 'pointer',
            }}
          >
            {status === 'busy' ? t('pages.desktopAuth.wait') : t('pages.desktopAuth.continue')}
          </button>
        )}

        {message && (
          <p
            style={{
              marginTop: 20,
              fontSize: 13,
              color: status === 'error' ? '#dc2626' : status === 'done' ? '#059669' : '#6b7280',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
