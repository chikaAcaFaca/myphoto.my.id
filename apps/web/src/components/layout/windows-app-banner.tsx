'use client';

import { useEffect, useState } from 'react';

/**
 * Post-login nudge for Windows users browsing the site to install the desktop
 * app (folder sync lives there). Shown only on real Windows browsers — not on
 * Android, and not inside the desktop app's own Electron shell (its UA contains
 * "Electron"/"MyPhoto Sync"), so we never nag someone already running it.
 * Dismissible once per session.
 */
export function WindowsAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isWindows = /Windows NT/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isElectron = /Electron|MyPhoto Sync/i.test(ua);
    const dismissed =
      sessionStorage.getItem('myphoto-windows-app-banner-dismissed') === '1';
    if (isWindows && !isAndroid && !isElectron && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    sessionStorage.setItem('myphoto-windows-app-banner-dismissed', '1');
    setShow(false);
  };

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-blue-600 px-4 py-2 text-white shadow">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-base">💻</span>
        <span>
          <span className="font-semibold">Instaliraj desktop aplikaciju</span> za
          sinhronizaciju fajlova sa računarom.{' '}
          <a href="/api/download/desktop" className="underline underline-offset-2">
            Preuzmi za Windows
          </a>
        </span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Zatvori"
        className="shrink-0 rounded-md px-2 py-1 text-white/90 hover:bg-white/15"
      >
        ✕
      </button>
    </div>
  );
}
