import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { PRIZE_BYTES, weekAt } from '@/lib/meme-challenge';

export const dynamic = 'force-dynamic';

/** GET /api/meme-wall/challenge: this week's theme and last week's winner. Public. */
export async function GET() {
  const now = Date.now();
  const week = weekAt(now);
  const last = weekAt(now - 7 * 24 * 60 * 60 * 1000);
  const settled = (await db.collection('memeChallenges').doc(last.id).get()).data();

  let lastWinner: { memeId: string; displayName: string; likes: number } | null = null;
  if (settled?.winner?.memeId) {
    const author = (await db.collection('users').doc(settled.winner.userId).get()).data();
    lastWinner = {
      memeId: settled.winner.memeId,
      displayName: author?.displayName || '',
      likes: settled.winner.likes || 0,
    };
  }

  return NextResponse.json(
    { theme: week.theme, endsAt: week.end.toISOString(), prizeGB: PRIZE_BYTES / 1024 ** 3, lastWinner },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
