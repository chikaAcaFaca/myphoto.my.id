import { db } from '@/lib/firebase-admin';
import {
  FREE_STORAGE_LIMIT,
  MAX_REFERRAL_BONUS,
  MAX_MEME_REFERRAL_BONUS,
  MAX_FREE_STORAGE,
} from '@myphoto/shared';
import { syncOverQuotaState } from '@/lib/over-quota';

/**
 * Single source of truth for a user's storage quota (`storageLimit`).
 *
 * storageLimit = min(free tier (1GB)
 *                  + referral bonus (250MB per qualified referral,
 *                                    clamped to MAX_REFERRAL_BONUS),
 *                  MAX_FREE_STORAGE)
 *              + meme referral bonus  (clamped to MAX_MEME_REFERRAL_BONUS)
 *              + Σ active subscriptions
 *              + archiveBytes (one-time keep-only purchase, while archiveUntil > now)
 *
 * IMPORTANT: every place that grants a bonus must update the underlying bonus
 * field (e.g. `referralBonusBytes`, `memeReferralBonus`, `backupBonusClaimed`)
 * and then call this — never write `storageLimit` directly with a raw
 * FieldValue.increment, or the next recalc (e.g. a Paddle webhook) will clobber
 * the bonus. Previously `recalculateStorageLimit` omitted `memeReferralBonus`,
 * so any Paddle event silently wiped meme-referral bonuses.
 */
export async function recalculateStorageLimit(userId: string): Promise<number> {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data() || {};

  const referralBonus = Math.min(userData.referralBonusBytes || 0, MAX_REFERRAL_BONUS);
  const memeBonus = Math.min(userData.memeReferralBonus || 0, MAX_MEME_REFERRAL_BONUS);
  // Admin-granted storage — deliberate, unbounded, never clamped. Without this
  // a recalc would silently reset a manually-topped-up account to the formula.
  const manualBonus = userData.manualBonusBytes || 0;

  // Sum storage from all active subscriptions (stacking)
  const subsSnapshot = await db
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', '==', 'active')
    .get();

  let subscriptionStorage = 0;
  for (const doc of subsSnapshot.docs) {
    subscriptionStorage += doc.data().storageAmount || 0;
  }

  // Everything obtainable without paying is capped as a whole (2.5GB). Admin
  // grants and paid subscriptions stack on top and stay uncapped. Install
  // bonuses (backupBonusClaimed / desktopBonusClaimed) no longer add storage.
  const freeAllowance = Math.min(
    FREE_STORAGE_LIMIT + referralBonus + memeBonus,
    MAX_FREE_STORAGE
  );

  // An archive freezes the limit at the bytes stored when it was bought, so
  // the files stay read-only-safe until archiveUntil, then the over-quota
  // clock starts again (the daily cron recalculates expired archives).
  const archiveUntil = userData.archiveUntil?.toDate?.() as Date | undefined;
  const archiveActive = !!archiveUntil && archiveUntil.getTime() > Date.now();
  const archiveBytes = archiveActive ? Math.max(0, userData.archiveBytes || 0) : 0;

  const totalStorage = Math.max(freeAllowance + manualBonus + subscriptionStorage, archiveBytes);

  await db.collection('users').doc(userId).update({
    storageLimit: totalStorage,
  });

  // Starts (or clears) the read-only grace period when a subscription or
  // archive ends with the user still over their free allowance.
  await syncOverQuotaState(userId, { ...userData, storageLimit: totalStorage });

  console.log(
    `Recalculated storageLimit for ${userId}: ${totalStorage} ` +
      `(referral:${referralBonus} meme:${memeBonus} manual:${manualBonus} subs:${subscriptionStorage} archive:${archiveBytes})`
  );

  return totalStorage;
}
