import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { notify } from '@/lib/inbox';
import { recalculateStorageLimit } from '@/lib/storage-limit';
import { renderEmail, sendEmail } from '@/lib/email';

/**
 * "Meme of the week". Every week (Monday 00:00 UTC) has a theme from the list
 * below, rotating by itself so nobody has to pick one. After the week ends,
 * the daily cron picks the public meme from that week with the most likes
 * (at least one) and gives its author 5 GB for a year. The theme is a
 * suggestion: every public meme of the week competes.
 */

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
// Monday 2026-10-12 00:00 UTC: week 0 of the rotation.
const EPOCH = Date.UTC(2026, 9, 12);
export const PRIZE_BYTES = 5 * 1024 ** 3;
const PRIZE_DAYS = 365;
const MIN_LIKES = 1;

export const THEMES: Array<{ sr: string; en: string }> = [
  { sr: 'Ponedeljak ujutru', en: 'Monday morning' },
  { sr: 'Kad mama nađe', en: 'When mum finds out' },
  { sr: 'Ljubimci koji vladaju kućom', en: 'Pets who run the house' },
  { sr: 'Gužva u gradskom prevozu', en: 'Rush-hour commute' },
  { sr: 'Slava, svadba, rođendan', en: 'Family celebrations' },
  { sr: 'Kafa kao gorivo', en: 'Coffee as fuel' },
  { sr: 'Na poslu vs. kod kuće', en: 'At work vs at home' },
  { sr: 'Utakmica i navijači', en: 'Match day and fans' },
  { sr: 'Vikend planovi vs. stvarnost', en: 'Weekend plans vs reality' },
  { sr: 'Školski dani', en: 'School days' },
  { sr: 'Kuvanje kao profesionalac', en: 'Cooking like a pro' },
  { sr: 'Telefon na 1%', en: 'Phone at 1%' },
  { sr: 'Leto, more, gužva', en: 'Summer, sea, crowds' },
  { sr: 'Zima i grejanje', en: 'Winter and heating' },
  { sr: 'Komšije', en: 'Neighbours' },
  { sr: 'Teretana od sutra', en: 'Gym starts tomorrow' },
  { sr: 'Deca i roditelji', en: 'Kids and parents' },
  { sr: 'Šef je u blizini', en: 'The boss is nearby' },
  { sr: 'Plata je legla', en: 'Payday' },
  { sr: 'Ko ovo radi?', en: 'Who even does this?' },
];

export interface WeekInfo {
  index: number;
  start: Date;
  end: Date;
  theme: { sr: string; en: string };
  id: string; // yyyy-mm-dd of the Monday
}

export function weekAt(ms: number): WeekInfo {
  const index = Math.floor((ms - EPOCH) / WEEK);
  const start = new Date(EPOCH + index * WEEK);
  const theme = THEMES[((index % THEMES.length) + THEMES.length) % THEMES.length];
  return { index, start, end: new Date(start.getTime() + WEEK), theme, id: start.toISOString().slice(0, 10) };
}

/** Settle last week once: pick the winner and grant the prize. Idempotent. */
export async function settleLastWeek(): Promise<'settled' | 'no-entries' | 'already' | 'failed'> {
  const week = weekAt(Date.now() - WEEK);
  const ref = db.collection('memeChallenges').doc(week.id);
  try {
    if ((await ref.get()).exists) return 'already';

    const snap = await db
      .collection('memes')
      .where('isPublic', '==', true)
      .where('createdAt', '>=', week.start)
      .where('createdAt', '<', week.end)
      .orderBy('createdAt', 'desc') // same index as the Meme Wall feed
      .get();
    let best: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    for (const d of snap.docs) {
      const likes = d.data().likes || 0;
      if (likes < MIN_LIKES || !d.data().userId) continue;
      if (!best || likes > (best.data().likes || 0)) best = d;
    }

    if (!best) {
      await ref.create({ theme: week.theme, winner: null, entries: snap.size, settledAt: FieldValue.serverTimestamp() });
      return 'no-entries';
    }

    const m = best.data();
    // create() fails if a parallel run already settled this week.
    await ref.create({
      theme: week.theme,
      winner: { memeId: best.id, userId: m.userId, likes: m.likes || 0 },
      entries: snap.size,
      settledAt: FieldValue.serverTimestamp(),
    });

    const userRef = db.collection('users').doc(m.userId);
    const user = (await userRef.get()).data();
    if (!user) return 'settled';
    const currentUntil = user.prizeBonusUntil?.toDate?.() as Date | undefined;
    const from = currentUntil && currentUntil.getTime() > Date.now() ? currentUntil : new Date();
    await userRef.update({
      prizeBonusBytes: PRIZE_BYTES,
      prizeBonusUntil: new Date(from.getTime() + PRIZE_DAYS * DAY),
    });
    await recalculateStorageLimit(m.userId);

    await notify(m.userId, {
      type: 'system',
      memeId: best.id,
      text: `Tvoj mim je Mim nedelje („${week.theme.sr}")! Dobijaš 5 GB na godinu dana. · Your meme is Meme of the Week! You get 5 GB for a year.`,
    });
    if (user.email) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
      const mail = renderEmail({
        paragraphs: [
          `Čestitamo! Tvoj mim je pobedio kao Mim nedelje (tema: „${week.theme.sr}") sa ${m.likes} lajkova.`,
          'Nagrada: 5 GB više prostora na godinu dana. Već je na tvom nalogu.',
          `Congratulations! Your meme won Meme of the Week (theme: "${week.theme.en}") with ${m.likes} likes. Your prize, 5 GB more storage for a year, is already on your account.`,
        ],
        ctaLabel: 'Pogledaj mim · See the meme',
        ctaUrl: `${origin}/meme/${best.id}`,
      });
      await sendEmail({ to: user.email, subject: 'Tvoj mim je Mim nedelje! · Meme of the Week', html: mail.html, text: mail.text });
    }
    return 'settled';
  } catch (e) {
    console.error('meme challenge settle failed', week.id, e);
    return 'failed';
  }
}

/** Expired prizes: remove the bonus and recalculate the limit. */
export async function expirePrizes(): Promise<number> {
  const snap = await db.collection('users').where('prizeBonusUntil', '<=', new Date()).get();
  let n = 0;
  for (const d of snap.docs) {
    if (!d.data().prizeBonusBytes) continue;
    await d.ref.update({ prizeBonusBytes: 0, prizeBonusUntil: null });
    await recalculateStorageLimit(d.id);
    n++;
  }
  return n;
}
