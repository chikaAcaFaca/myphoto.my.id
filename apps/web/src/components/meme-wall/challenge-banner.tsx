'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/client';

interface Challenge {
  theme: { sr: string; en: string };
  endsAt: string;
  prizeGB: number;
  lastWinner: { memeId: string; displayName: string; likes: number } | null;
}

/** "Meme of the week" strip: this week's theme, prize, and last week's winner. */
export function MemeChallengeBanner() {
  const { locale } = useI18n();
  const sr = locale === 'sr';
  const [c, setC] = useState<Challenge | null>(null);

  useEffect(() => {
    fetch('/api/meme-wall/challenge')
      .then((r) => (r.ok ? r.json() : null))
      .then(setC)
      .catch(() => {});
  }, []);

  if (!c) return null;
  const days = Math.max(0, Math.ceil((new Date(c.endsAt).getTime() - Date.now()) / 86400000));

  return (
    <div
      style={{
        marginTop: 16, display: 'inline-block', maxWidth: 560, padding: '12px 16px', borderRadius: 12,
        background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 14, lineHeight: 1.45, textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 15 }}>
        🏆 {sr ? 'Mim nedelje' : 'Meme of the week'}: „{sr ? c.theme.sr : c.theme.en}"
      </div>
      <div style={{ opacity: 0.9 }}>
        {sr
          ? `Mim sa najviše lajkova ove nedelje osvaja ${c.prizeGB} GB na godinu dana. Još ${days} dana.`
          : `The meme with the most likes this week wins ${c.prizeGB} GB for a year. ${days} days left.`}
      </div>
      {c.lastWinner && (
        <div style={{ marginTop: 6, opacity: 0.9 }}>
          {sr ? 'Prošle nedelje: ' : 'Last week: '}
          <Link href={`/meme/${c.lastWinner.memeId}`} style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>
            {c.lastWinner.displayName || (sr ? 'pobednički mim' : 'the winning meme')}
          </Link>{' '}
          ({c.lastWinner.likes} ❤)
        </div>
      )}
    </div>
  );
}
