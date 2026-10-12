import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { REFERRAL_BONUS, MAX_REFERRALS } from '@myphoto/shared';
import { db } from '@/lib/firebase-admin';
import { notify } from '@/lib/inbox';

const REFEREE_MAX_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 48 * 60 * 60 * 1000;
const REF_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export type ClaimResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Record that `userId` was invited by the owner of `referralCode`. The
 * referrer's bonus is granted later, once the new user uploads 100 MB
 * (confirm-upload → maybeQualifyReferral).
 */
export async function claimReferral(
  userId: string,
  referralCode: string,
  source: string,
  shareToken?: string | null
): Promise<ClaimResult> {
  const referrerQuery = await db.collection('users').where('referralCode', '==', referralCode).limit(1).get();
  if (referrerQuery.empty) return { ok: false, status: 404, error: 'Invalid referral code' };

  const referrerDoc = referrerQuery.docs[0];
  const referrerData = referrerDoc.data();
  const referrerUserId = referrerDoc.id;
  if (referrerUserId === userId) return { ok: false, status: 400, error: 'Cannot refer yourself' };

  const refereeRef = db.collection('users').doc(userId);
  const refereeDoc = await refereeRef.get();
  if (!refereeDoc.exists) return { ok: false, status: 404, error: 'User not found' };
  const refereeData = refereeDoc.data()!;
  if (refereeData.referredBy) return { ok: false, status: 400, error: 'Already referred' };

  // Only a fresh signup can be credited to someone. A remembered ?ref= code
  // must not turn an existing user who later visits /register into a referral.
  const createdAtMs = refereeData.createdAt?.toMillis?.() ?? 0;
  if (Date.now() - createdAtMs > REFEREE_MAX_ACCOUNT_AGE_MS) {
    return { ok: false, status: 400, error: 'Account too old to be referred' };
  }
  if ((referrerData.referralCount || 0) >= MAX_REFERRALS) {
    return { ok: false, status: 400, error: 'Referrer has reached maximum referrals' };
  }

  // In a transaction: two simultaneous claims (e.g. two tabs with different
  // ?ref codes) must not credit two referrers.
  const referralRef = db.collection('referrals').doc();
  const claimed = await db.runTransaction(async (tx) => {
    if ((await tx.get(refereeRef)).data()?.referredBy) return false;
    tx.set(referralRef, {
      referrerUserId,
      refereeUserId: userId,
      refereeEmail: refereeData.email || '',
      bonusBytes: REFERRAL_BONUS,
      qualified: false, // becomes true after referee uploads 100MB
      source: source || 'direct', // 'share', 'direct', 'app', 'download', etc.
      shareToken: shareToken || null, // which shared content brought this user
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(refereeRef, { referredBy: referrerUserId });
    return true;
  });
  if (!claimed) return { ok: false, status: 400, error: 'Already referred' };

  await notify(referrerUserId, {
    type: 'referral_joined',
    actorId: userId,
    actorName: refereeData.displayName || '',
  });
  return { ok: true };
}

/*
 * Referral across the APK install. A visitor opens a shared link (?ref=CODE),
 * taps "Download the app", installs the APK and signs up inside the app,
 * where the browser's remembered code is out of reach. The download request
 * records the code against a hash of the visitor's IP for 48 h; when the app
 * provisions a brand-new account from the same IP, the code is claimed.
 * Mobile carriers share IPs between many users (CGNAT), so an IP that saw
 * more than one different code in the window is ignored rather than guessed.
 */

function ipKey(ip: string): string | null {
  if (!ip || ip === 'unknown') return null;
  return createHash('sha256').update(`pending-ref:${ip}`).digest('hex').slice(0, 40);
}

export async function recordPendingReferral(ip: string, code: string): Promise<void> {
  const key = ipKey(ip);
  if (!key || !REF_PATTERN.test(code)) return;
  const ref = db.collection('pendingReferrals').doc(key);
  try {
    await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data();
      const fresh = cur && Date.now() - (cur.at || 0) < PENDING_TTL_MS;
      const ambiguous = !!fresh && (cur!.ambiguous || cur!.code !== code);
      tx.set(ref, { code, at: Date.now(), ambiguous });
    });
  } catch (e) {
    console.error('recordPendingReferral failed', e);
  }
}

/** Claim the code recorded for this IP, if any, for a just-created account. Never throws. */
export async function claimPendingReferral(userId: string, ip: string): Promise<void> {
  const key = ipKey(ip);
  if (!key) return;
  try {
    const ref = db.collection('pendingReferrals').doc(key);
    const pending = (await ref.get()).data();
    if (!pending || pending.ambiguous || Date.now() - (pending.at || 0) > PENDING_TTL_MS) return;
    const result = await claimReferral(userId, pending.code, 'download');
    if (result.ok) {
      await ref.delete().catch(() => {});
      console.log('pending referral claimed', userId);
    }
  } catch (e) {
    console.error('claimPendingReferral failed', userId, e);
  }
}
