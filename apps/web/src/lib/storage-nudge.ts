import { createHmac } from 'crypto';
import { after } from 'next/server';
import {
  STORAGE_TIERS,
  formatBytes,
  getTierCreemProductId,
  getTierPeriods,
  getTierPrice,
  type BillingPeriod,
  type StorageTier,
} from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';
import { renderEmail, sendEmail } from '@/lib/email';

/**
 * "Your storage is filling up" emails at 60 %, 85 % and 100 % of the limit.
 *
 * The Play build may not show prices or link to the website (Play payments
 * policy), so email is how app users learn that bigger plans exist. Each
 * email offers the cheapest next plan; when several plans cost the same
 * single charge (e.g. Lite 24 GB yearly and Mini 32 GB for 6 months, both
 * €4.99) the user picks, with a couple of slightly dearer steps after them.
 *
 * One email per level per storage limit: buying a plan raises the limit and
 * the ladder starts again for the next plan. Over-quota users get the
 * over-quota warnings instead (lib/over-quota.ts).
 */

const LEVELS = [100, 85, 60] as const;
type Level = (typeof LEVELS)[number];
const RESET_BELOW = 0.5; // after deleting down to <50 %, the ladder restarts
const MIN_GAP_MS = 3 * 24 * 60 * 60 * 1000; // 60 → 85 not within 3 days; 100 % always goes out
const MAX_CHOICES = 4;

const PERIOD_LABEL: Record<BillingPeriod, { sr: string; en: string }> = {
  monthly: { sr: '1 mesec', en: '1 month' },
  quarterly: { sr: '3 meseca', en: '3 months' },
  semiannual: { sr: '6 meseci', en: '6 months' },
  yearly: { sr: '12 meseci', en: '12 months' },
};

const eur = (n: number) => `€${n.toFixed(2)}`;

export interface PlanChoice {
  tier: StorageTier;
  period: BillingPeriod;
  price: number;
}

function choicesFor(tier: StorageTier): PlanChoice[] {
  return getTierPeriods(tier)
    .filter((period) => !!getTierCreemProductId(tier, period))
    .map((period) => ({ tier, period, price: getTierPrice(tier, period) }))
    .sort((a, b) => a.price - b.price);
}

/**
 * The next plan up, cheapest period first (the recommendation); other plans
 * that cost exactly the same, so the user picks; the cheapest option of the
 * plan after that; then the next plan's longer periods.
 */
export function nextPlanChoices(limit: number): PlanChoice[] {
  const bigger = STORAGE_TIERS.filter((t) => t.tier > 0 && t.storageBytes > limit).sort(
    (a, b) => a.storageBytes - b.storageBytes
  );
  const next = bigger.length ? choicesFor(bigger[0]) : [];
  if (!next.length) return [];
  const best = next[0];
  const samePrice = bigger.slice(1).flatMap(choicesFor).filter((c) => Math.abs(c.price - best.price) < 0.005);
  const after = bigger[1] ? choicesFor(bigger[1]).slice(0, 1) : [];

  const out: PlanChoice[] = [];
  for (const c of [best, ...samePrice, ...after, ...next.slice(1)]) {
    if (!out.some((o) => o.tier.tier === c.tier.tier && o.period === c.period)) out.push(c);
  }
  return out.slice(0, MAX_CHOICES);
}

function unsubscribeSecret(): string | null {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null;
}

export function unsubscribeToken(userId: string): string | null {
  const secret = unsubscribeSecret();
  return secret ? createHmac('sha256', secret).update(`unsub:${userId}`).digest('hex').slice(0, 32) : null;
}

function levelFor(used: number, limit: number): Level | null {
  if (limit <= 0) return null;
  const ratio = used / limit;
  return LEVELS.find((l) => ratio >= l / 100) ?? null;
}

function nudgeEmail(level: Level, used: number, limit: number, choices: PlanChoice[], unsubscribeUrl: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
  const usedF = formatBytes(used, 1);
  const limitF = formatBytes(limit, 1);
  const best = choices[0];
  const sameAsBest = choices.filter((c) => Math.abs(c.price - best.price) < 0.005).length;

  const subject =
    level === 100
      ? 'Prostor je pun, backup je pauziran · Your MyPhoto storage is full'
      : level === 85
        ? `Prostor ti je skoro pun (85%) · Your MyPhoto storage is 85% full`
        : `Popunio si 60% prostora · You've used 60% of your MyPhoto storage`;

  const sr =
    level === 100
      ? `Iskoristio si ${usedF} od ${limitF}. Prostor je pun, pa se nove slike i video snimci više ne čuvaju u cloudu dok ne oslobodiš mesto ili uzmeš veći paket. Sve što je već sačuvano ostaje.`
      : level === 85
        ? `Iskoristio si ${usedF} od ${limitF}. Još malo i backup će stati, a nove slike neće biti sačuvane u cloudu.`
        : `Iskoristio si ${usedF} od ${limitF}. Sve radi kako treba. Samo da znaš: kad se prostor napuni, backup staje.`;
  const en =
    level === 100
      ? `You've used ${usedF} of ${limitF}. Your storage is full, so new photos and videos are no longer backed up until you free up space or move to a bigger plan. Everything already saved stays.`
      : level === 85
        ? `You've used ${usedF} of ${limitF}. A little more and backup will stop, so new photos won't be saved to the cloud.`
        : `You've used ${usedF} of ${limitF}. Everything is working. Just so you know: when storage fills up, backup stops.`;

  const offerSr =
    sameAsBest > 1
      ? `Za ${eur(best.price)} imaš ${sameAsBest} izbora, pa biraj šta ti više odgovara:`
      : `Najpovoljniji sledeći korak je ${formatBytes(best.tier.storageBytes, 0)} za ${eur(best.price)} (${PERIOD_LABEL[best.period].sr}). Ili izaberi nešto drugo:`;
  const offerEn =
    sameAsBest > 1
      ? `For ${eur(best.price)} you have ${sameAsBest} options; pick the one that suits you:`
      : `The cheapest next step is ${formatBytes(best.tier.storageBytes, 0)} for ${eur(best.price)} (${PERIOD_LABEL[best.period].en}). Or choose another:`;

  return {
    subject,
    ...renderEmail({
      paragraphs: [sr, en, offerSr, offerEn],
      choices: choices.map((c) => ({
        label: `${formatBytes(c.tier.storageBytes, 0)} · ${PERIOD_LABEL[c.period].sr} / ${PERIOD_LABEL[c.period].en} · ${eur(c.price)}`,
        url: `${origin}/checkout?tier=${c.tier.tier}&period=${c.period}`,
      })),
      ctaLabel: 'Svi paketi · All plans',
      ctaUrl: `${origin}/pricing`,
      unsubscribeUrl,
    }),
  };
}

/**
 * Send the storage email that is due for this user, if any. Never throws.
 * Safe to call after every upload: it only reads one doc unless a level
 * was crossed.
 */
export async function maybeSendStorageNudge(userId: string): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    const u = snap.data();
    if (!u?.email || u.storageEmailsOptOut || u.overQuotaSince) return 'skipped';

    const used = Number(u.storageUsed) || 0;
    const limit = Number(u.storageLimit) || 0;
    const prev = u.storageNudge as { level?: number; limit?: number; at?: number } | undefined;

    const level = levelFor(used, limit);
    if (!level) {
      if (prev && limit > 0 && used / limit < RESET_BELOW) await ref.update({ storageNudge: null });
      return 'skipped';
    }
    const sameLimit = prev?.limit === limit;
    if (sameLimit && (prev?.level || 0) >= level) return 'skipped';
    if (sameLimit && level !== 100 && prev?.at && Date.now() - prev.at < MIN_GAP_MS) return 'skipped';

    const choices = nextPlanChoices(limit);
    const token = unsubscribeToken(userId);
    if (!choices.length || !token) return 'skipped';

    // Claim the level first so parallel uploads send one email.
    const claimed = await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data()?.storageNudge as typeof prev;
      if (cur?.limit === limit && (cur?.level || 0) >= level) return false;
      tx.update(ref, { storageNudge: { level, limit, at: Date.now() } });
      return true;
    });
    if (!claimed) return 'skipped';

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://myphotomy.space';
    const unsubscribeUrl = `${origin}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`;
    const mail = nudgeEmail(level, used, limit, choices, unsubscribeUrl);
    const ok = await sendEmail({
      to: u.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (!ok) {
      // Give the next upload or the daily cron another chance.
      await ref.update({ storageNudge: prev ?? null });
      return 'failed';
    }
    console.log(`storage nudge ${level}% sent`, userId);
    return 'sent';
  } catch (e) {
    console.error('storage nudge failed', userId, e);
    return 'failed';
  }
}

/** After the response is sent, check whether this upload crossed a level. */
export function scheduleStorageNudge(userId: string) {
  try {
    after(() => maybeSendStorageNudge(userId).then(() => undefined));
  } catch {
    // Outside a request scope (scripts): skip.
  }
}
