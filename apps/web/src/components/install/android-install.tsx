'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/client';
import { getStoredRef, isValidRef, withRef } from '@/lib/referral-link';

/**
 * "Download the app" for people who arrive from a shared meme or profile link.
 * The APK is not on Google Play, so Android shows a "can't install apps from
 * this source" block the first time. A web page cannot open that settings
 * screen itself (Chrome refuses settings intents), but Android offers a
 * Settings button on that block. So we start the download and show, step by
 * step, what each screen looks like and what to tap.
 */

const APK_URL = '/api/download/android';

/** The APK link carrying the sharer's ?ref=, so the app signup is credited. */
function apkUrl(): string {
  if (typeof window === 'undefined') return APK_URL;
  const fromUrl = new URLSearchParams(window.location.search).get('ref');
  return withRef(APK_URL, isValidRef(fromUrl) ? fromUrl : getStoredRef());
}
// Opens the installed app; without it Chrome falls back to the download page.
const OPEN_APP_URL =
  'intent://meme-wall#Intent;scheme=myphoto;package=id.my.myphoto;' +
  'S.browser_fallback_url=https%3A%2F%2Fmyphotomy.space%2Fdownload;end';

// Intro video per site language (avatar explains the install), served from
// public/videos with a .jpg poster of the same name. Empty = the video block
// is hidden.
export const INSTALL_VIDEOS: Record<'sr' | 'en', string> = {
  sr: '/videos/install-sr.mp4',
  en: '',
};

const FLAME = '#FF7A3D';
const ON_FLAME = '#16181D';
const SURFACE = '#1B1D21';
const LINE = '#2C2F36';
const MUTED = '#A3A7B0';

function isIosUa() {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Plain APK download link (e.g. the /download page) that keeps the ?ref=. */
export function ApkDownloadLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a href={APK_URL} className={className} onClick={(e) => { e.currentTarget.href = apkUrl(); }}>
      {children}
    </a>
  );
}

export function InstallAppButton({
  style,
  className,
  children,
  registerHref = '/register',
}: {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  registerHref?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);

  return (
    <>
      <a
        href={APK_URL}
        className={className}
        style={style}
        onClick={(e) => {
          // The link itself starts the download (works without JS too); the
          // guide opens on top so the user knows what comes next.
          const iosNow = isIosUa();
          setIos(iosNow);
          if (iosNow) e.preventDefault();
          else e.currentTarget.href = apkUrl();
          setOpen(true);
        }}
      >
        {children ?? t('components.installGuide.button')}
      </a>
      {open && <InstallGuide ios={ios} registerHref={registerHref} onClose={() => setOpen(false)} />}
    </>
  );
}

export function InstallGuide({
  ios,
  registerHref,
  onClose,
}: {
  ios: boolean;
  registerHref: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const video = INSTALL_VIDEOS[locale as 'sr' | 'en'] || '';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  type GuideKey = keyof typeof import('@/i18n/messages/en/components').components.installGuide;
  const k = (key: GuideKey) => t(`components.installGuide.${key}`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80, backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', color: '#fff',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '92dvh', overflowY: 'auto',
          backgroundColor: SURFACE, borderRadius: '24px 24px 0 0', padding: '20px 16px 28px',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <h2 id="install-guide-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
            {ios ? 'MyPhoto' : k('title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={k('close')}
            style={{ minWidth: 44, minHeight: 44, border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {ios ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            <p style={{ margin: 0, color: MUTED, fontSize: 15, lineHeight: 1.5 }}>{k('iosText')}</p>
            <a href={registerHref} style={primaryBtn}>{k('iosButton')}</a>
          </div>
        ) : (
          <>
            <p style={{ margin: '6px 0 0', color: MUTED, fontSize: 15, lineHeight: 1.5 }}>{k('subtitle')}</p>
            <p style={{ margin: '12px 0 0', fontSize: 14, color: MUTED }}>
              {k('started')}{' '}
              <a href={APK_URL} onClick={(e) => { e.currentTarget.href = apkUrl(); }} style={{ color: FLAME, fontWeight: 700 }}>{k('retry')}</a>
            </p>

            {video ? (
              <video
                src={video}
                poster={video.replace(/\.mp4$/, '.jpg')}
                preload="metadata"
                controls
                autoPlay
                playsInline
                aria-label={k('videoLabel')}
                style={{ width: '100%', marginTop: 16, borderRadius: 16, backgroundColor: '#000', aspectRatio: '9 / 16', maxHeight: '60dvh' }}
              />
            ) : null}

            <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Step n={1} title={k('s1Title')} text={k('s1Text')}>
                <Phone>
                  <div style={notif}>
                    <span style={{ fontSize: 18 }}>⬇</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{k('mockDone')}</div>
                      <div style={{ fontSize: 10, color: '#5f6368', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k('mockFile')}</div>
                    </div>
                    <span style={{ ...tapTarget, color: '#1a73e8' }}>{k('mockOpen')}</span>
                  </div>
                </Phone>
              </Step>
              <Step n={2} title={k('s2Title')} text={k('s2Text')}>
                <Phone>
                  <div style={dialog}>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>{k('mockBlocked')}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10, fontSize: 11, fontWeight: 700, color: '#1a73e8' }}>
                      <span>{k('mockCancel')}</span>
                      <span style={tapTarget}>{k('mockSettings')}</span>
                    </div>
                  </div>
                  <div style={{ ...dialog, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{k('mockAllow')}</span>
                    <span aria-hidden="true" style={{ ...tapTarget, padding: 0, width: 34, height: 20, borderRadius: 999, backgroundColor: '#1a73e8', position: 'relative', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', right: 2, top: 2, width: 16, height: 16, borderRadius: 999, backgroundColor: '#fff' }} />
                    </span>
                  </div>
                </Phone>
              </Step>
              <Step n={3} title={k('s3Title')} text={k('s3Text')}>
                <Phone>
                  <div style={dialog}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AppIcon />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>MyPhoto</span>
                    </div>
                    <div style={{ fontSize: 11, marginTop: 8 }}>{k('mockInstallQ')}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10, fontSize: 11, fontWeight: 700, color: '#1a73e8' }}>
                      <span>{k('mockCancel')}</span>
                      <span style={tapTarget}>{k('mockInstall')}</span>
                    </div>
                  </div>
                </Phone>
              </Step>
              <Step n={4} title={k('s4Title')} text={k('s4Text')}>
                <Phone dark>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                    <AppIcon />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>MyPhoto</span>
                    <span style={{ fontSize: 10, color: FLAME, fontWeight: 700 }}>{k('freeBadge')}</span>
                    <span style={{ ...tapTarget, backgroundColor: '#fff', color: '#16181D', borderRadius: 999, padding: '6px 12px', fontSize: 11, fontWeight: 700 }}>
                      G&nbsp; {k('mockGoogle')}
                    </span>
                  </div>
                </Phone>
              </Step>
            </ol>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <a href={OPEN_APP_URL} style={primaryBtn}>{k('openApp')}</a>
              <button onClick={onClose} style={{ ...primaryBtn, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {k('close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 999, backgroundColor: FLAME, color: ON_FLAME,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14,
      }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
        <p style={{ margin: '4px 0 10px', fontSize: 14, lineHeight: 1.5, color: '#D6D8DD' }}>{text}</p>
        {children}
      </div>
    </li>
  );
}

// A small drawing of the Android screen, so people recognise it when it shows up.
function Phone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div aria-hidden="true" style={{
      width: '100%', maxWidth: 240, border: `6px solid ${LINE}`, borderRadius: 22,
      backgroundColor: dark ? '#0f1012' : '#e8eaed', padding: 10, color: dark ? '#fff' : '#202124',
    }}>
      {children}
    </div>
  );
}

function AppIcon() {
  return (
    <span style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: FLAME, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill={ON_FLAME}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
    </span>
  );
}

const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: 999,
  backgroundColor: FLAME, color: ON_FLAME, fontWeight: 800, fontSize: 16, textDecoration: 'none', padding: '0 20px', textAlign: 'center',
};
const notif: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: '8px 10px',
};
const dialog: React.CSSProperties = { backgroundColor: '#fff', borderRadius: 12, padding: 12 };
// Highlights what to tap in the drawings.
const tapTarget: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: 6, outline: `2px solid ${FLAME}`, outlineOffset: 2,
};
