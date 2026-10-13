'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/client';
import { getIdToken } from '@/lib/firebase';

const REASONS = ['spam', 'nudity', 'hate', 'violence', 'copyright', 'other'] as const;

/**
 * "Report" for a public meme (guests too). Opens a small list of reasons;
 * see /api/meme-wall/[id]/report for what happens next.
 */
export function ReportMemeButton({
  memeId,
  style,
  color = '#94a3b8',
  fontSize = 13,
}: {
  memeId: string;
  style?: React.CSSProperties;
  color?: string;
  fontSize?: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');

  const send = async (reason: string) => {
    setState('sending');
    try {
      const token = await getIdToken().catch(() => null);
      const res = await fetch(`/api/meme-wall/${memeId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reason }),
      });
      setState(res.ok ? 'done' : 'failed');
    } catch {
      setState('failed');
    }
    setOpen(false);
  };

  if (state === 'done') {
    return <span style={{ color: '#94a3b8', fontSize: 12, ...style }}>{t('components.reportMeme.thanks')}</span>;
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={state === 'sending'}
        title={t('components.reportMeme.button')}
        aria-label={t('components.reportMeme.button')}
        aria-expanded={open}
        style={{
          background: 'none', border: 'none', color, cursor: 'pointer', minWidth: 32, minHeight: 32,
          fontSize, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '2px 4px',
        }}
      >
        ⚑ {state === 'failed' ? t('components.reportMeme.failed') : ''}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', right: 0, bottom: '100%', marginBottom: 6, zIndex: 20, width: 250,
            background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 8,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          }}
        >
          <p style={{ margin: '4px 8px 8px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
            {t('components.reportMeme.title')}
          </p>
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="menuitem"
              onClick={() => send(r)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                color: '#e2e8f0', fontSize: 13, padding: '8px', borderRadius: 8, cursor: 'pointer',
              }}
            >
              {t(`components.reportMeme.${r}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
              color: '#94a3b8', fontSize: 13, padding: '8px', cursor: 'pointer',
            }}
          >
            {t('components.reportMeme.cancel')}
          </button>
        </div>
      )}
    </span>
  );
}
