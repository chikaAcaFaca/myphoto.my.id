'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Post-login nudge for Android users browsing the site to install the native
 * app — reliable background auto-backup only exists there. The web can't read
 * an installed native app's version, so this is a plain dismissible offer
 * (once per session). Version-aware "update available" prompting lives INSIDE
 * the app (it knows its own version); this banner is just the install nudge.
 *
 * Shown only on real Android browsers (in-app webviews are excluded so we don't
 * nag someone who's already inside an app).
 */
export function AndroidAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua) && !/wv\)/.test(ua); // exclude in-app webviews
    const dismissed =
      sessionStorage.getItem('myphoto-android-app-banner-dismissed') === '1';
    if (isAndroid && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    sessionStorage.setItem('myphoto-android-app-banner-dismissed', '1');
    setShow(false);
  };

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-green-600 px-4 py-2 text-white shadow">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-base">📱</span>
        <span>
          <span className="font-semibold">Instaliraj Android aplikaciju</span> za
          automatski backup slika u pozadini.{' '}
          <a href="/api/download/android" className="underline underline-offset-2">
            Preuzmi APK
          </a>{' '}
          ·{' '}
          <Link href="/download" className="underline underline-offset-2">
            Uputstvo
          </Link>
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
