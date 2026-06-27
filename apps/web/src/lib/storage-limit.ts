import { db } from '@/lib/firebase-admin';
import {
  FREE_STORAGE_LIMIT,
  BACKUP_BONUS,
  DESKTOP_INSTALL_BONUS,
  MAX_REFERRAL_BONUS,
  MAX_MEME_REFERRAL_BONUS,
} from '@myphoto/shared';

/**
 * Single source of truth for a user's storage quota (`storageLimit`).
 *
 * storageLimit = free tier
 *              + claimed install bonuses (app/backup + desktop)
 *              + referral bonus       (clamped to MAX_REFERRAL_BONUS)
 *              + meme referral bonus  (clamped to MAX_MEME_REFERRAL_BONUS)
 *              + Σ active subscriptions
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

  const backupBonus = userData.backupBonusClaimed ? BACKUP_BONUS : 0;
  const desktopBonus = userData.desktopBonusClaimed ? DESKTOP_INSTALL_BONUS : 0;
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

  const totalStorage =
    FREE_STORAGE_LIMIT + backupBonus + desktopBonus + referralBonus + memeBonus + manualBonus + subscriptionStorage;

  await db.collection('users').doc(userId).update({
    storageLimit: totalStorage,
  });

  console.log(
    `Recalculated storageLimit for ${userId}: ${totalStorage} ` +
      `(backup:${backupBonus} desktop:${desktopBonus} referral:${referralBonus} meme:${memeBonus} manual:${manualBonus} subs:${subscriptionStorage})`
  );

  return totalStorage;
}
