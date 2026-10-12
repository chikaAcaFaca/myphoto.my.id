import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { verifyAuthWithRateLimit } from '@/lib/auth-utils';
import { BILLING_PERIODS, STORAGE_TIERS, getTierPrice, isBillingPeriod } from '@myphoto/shared';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 8;

/**
 * GET /api/admin/funnel — owner-only numbers: APK downloads → sign-ups →
 * started backup → referred → storage ≥60 % → paying, overall and per
 * sign-up week. Admin = users.role 'admin' (clients cannot set role, see
 * firebase/firestore.rules). Reads every user doc: fine for thousands of
 * users; move to counters before that becomes slow.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyAuthWithRateLimit(request, 'api');
  if (!authResult.success) return authResult.response;
  const me = (await db.collection('users').doc(authResult.userId).get()).data();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = Date.now();
  const [usersSnap, subsSnap, refSnap, memesCount, statsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('subscriptions').where('status', '==', 'active').get(),
    db.collection('referrals').get(),
    db.collection('memes').count().get(),
    db.collection('dailyStats').where('__name__', '>=', new Date(now - 30 * DAY).toISOString().slice(0, 10)).get(),
  ]);

  const paying = new Set<string>();
  let revenueYearly = 0;
  for (const d of subsSnap.docs) {
    const s = d.data();
    if (!s.userId) continue;
    paying.add(s.userId);
    // Annualised list price (VAT excluded, before Creem's fee).
    const tier = STORAGE_TIERS.find((t) => t.tier === s.tier);
    if (tier && isBillingPeriod(s.billingPeriod)) {
      revenueYearly += (getTierPrice(tier, s.billingPeriod) * 12) / BILLING_PERIODS[s.billingPeriod].months;
    }
  }

  const weekStart = (ms: number) => {
    const d = new Date(ms);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday
    return d.toISOString().slice(0, 10);
  };
  const cohorts = new Map<string, { week: string; signups: number; backup: number; referred: number; over60: number; paying: number }>();
  for (let i = WEEKS - 1; i >= 0; i--) {
    const w = weekStart(now - i * 7 * DAY);
    cohorts.set(w, { week: w, signups: 0, backup: 0, referred: 0, over60: 0, paying: 0 });
  }

  const total = { users: 0, new7: 0, new30: 0, backup: 0, referred: 0, over60: 0, full: 0, paying: 0, optedOut: 0 };
  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const created = u.createdAt?.toMillis?.() ?? 0;
    const used = Number(u.storageUsed) || 0;
    const limit = Number(u.storageLimit) || 1;
    const flags = {
      backup: used > 0,
      referred: !!u.referredBy,
      over60: used / limit >= 0.6,
      paying: paying.has(doc.id),
    };
    total.users++;
    if (created > now - 7 * DAY) total.new7++;
    if (created > now - 30 * DAY) total.new30++;
    if (flags.backup) total.backup++;
    if (flags.referred) total.referred++;
    if (flags.over60) total.over60++;
    if (used >= limit) total.full++;
    if (flags.paying) total.paying++;
    if (u.storageEmailsOptOut) total.optedOut++;

    const c = created ? cohorts.get(weekStart(created)) : undefined;
    if (c) {
      c.signups++;
      if (flags.backup) c.backup++;
      if (flags.referred) c.referred++;
      if (flags.over60) c.over60++;
      if (flags.paying) c.paying++;
    }
  }

  let qualifiedReferrals = 0;
  const referralSources: Record<string, number> = {};
  for (const d of refSnap.docs) {
    const r = d.data();
    if (r.qualified) qualifiedReferrals++;
    const src = r.source || 'direct';
    referralSources[src] = (referralSources[src] || 0) + 1;
  }

  const downloads = statsSnap.docs
    .map((d) => ({ day: d.id, apk: d.data().apkDownloads || 0, withRef: d.data().apkDownloadsWithRef || 0 }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const downloads30 = downloads.reduce((n, d) => n + d.apk, 0);

  return NextResponse.json({
    generatedAt: new Date(now).toISOString(),
    total: { ...total, downloads30, memes: memesCount.data().count, referrals: refSnap.size, qualifiedReferrals },
    referralSources,
    cohorts: [...cohorts.values()].reverse(),
    downloads,
    revenueYearly: Math.round(revenueYearly * 100) / 100,
  });
}
