'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores';
import { useT } from '@/i18n/client';
import { MemeFeed } from '@/components/meme-wall/meme-feed';

export default function MemeWallPage() {
  const { user } = useAuthStore();
  const t = useT();
  const [showCreator, setShowCreator] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        padding: '32px 16px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32 }}>🔥</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>MemeWall</h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: 0 }}>
            {t('marketing.memeWall.subtitle')}
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {user ? (
              <button
                onClick={() => setShowCreator(!showCreator)}
                style={{
                  backgroundColor: '#fff', color: '#f97316', fontWeight: 700,
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 15,
                }}
              >
                {showCreator ? t('marketing.memeWall.closeCreator') : t('marketing.memeWall.makeYourMeme')}
              </button>
            ) : (
              <Link
                href="/login?redirect=/meme-wall"
                style={{
                  backgroundColor: '#fff', color: '#f97316', fontWeight: 700,
                  padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
                }}
              >
                {t('marketing.memeWall.loginToMake')}
              </Link>
            )}
            <Link
              href="/"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600,
                padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              {t('marketing.memeWall.about')}
            </Link>
          </div>
        </div>
      </div>

      <MemeFeed
        guestLimit={10}
        showCreator
        creatorOpen={showCreator}
        onCreatorOpenChange={setShowCreator}
        redirectPath="/meme-wall"
      />

      {/* Footer CTA */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '32px 16px',
        textAlign: 'center',
        marginTop: 40,
      }}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t('marketing.memeWall.footerTitle')}</h3>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          {t('marketing.memeWall.footerText')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {user ? (
            <button
              onClick={() => { setShowCreator(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{
                backgroundColor: '#0ea5e9', color: '#fff', fontWeight: 700,
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
              }}
            >
              {t('marketing.memeWall.makeMeme')}
            </button>
          ) : (
            <Link
              href="/register"
              style={{
                backgroundColor: '#0ea5e9', color: '#fff', fontWeight: 700,
                padding: '10px 24px', borderRadius: 10, textDecoration: 'none',
              }}
            >
              {t('marketing.memeWall.registerFree')}
            </Link>
          )}
        </div>
        <p style={{ color: '#475569', fontSize: 11, marginTop: 24 }}>
          NKNET CONSULTING DOO · myphotomy.space
        </p>
      </div>
    </div>
  );
}
