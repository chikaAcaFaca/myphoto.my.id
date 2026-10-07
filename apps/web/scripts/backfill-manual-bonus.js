// One-time migration: back-fill users.manualBonusBytes.
//
// recalculateStorageLimit() rebuilds storageLimit from
//   FREE + backup + desktop + referral + meme + manual + subscriptions.
// Accounts that received a manual/admin top-up (set-storage-limit.js,
// grant-storage.js, init-account.js, or hand edits) have a storageLimit that
// the formula can't reproduce — without this back-fill, the first recalc that
// fires for such a user (a Paddle event, a referral/meme qualification) would
// silently shrink their quota to the formula value.
//
// This computes the "unexplained" storage (current storageLimit minus every
// known source) and parks it in manualBonusBytes, so recalc reproduces today's
// limit exactly. Idempotent: skips users that already have manualBonusBytes set.
//
// Usage:
//   node apps/web/scripts/backfill-manual-bonus.js          # DRY RUN (no writes)
//   node apps/web/scripts/backfill-manual-bonus.js --apply  # write changes

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const APPLY = process.argv.includes('--apply');

// Mirror packages/shared/src/constants — keep in sync if those change.
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;
const FREE_STORAGE_LIMIT = 1 * GB;
const BACKUP_BONUS = 1 * GB; // APP_INSTALL_BONUS
const DESKTOP_INSTALL_BONUS = 512 * MB;
const MAX_REFERRAL_BONUS = 7.5 * GB;
const MAX_MEME_REFERRAL_BONUS = 10 * GB;
const EPSILON = 1 * MB; // ignore sub-MB noise

if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is set (this migration targets production).');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(undefined, 'myphoto');

async function activeSubStorage(uid) {
  const subs = await db.collection('subscriptions')
    .where('userId', '==', uid)
    .where('status', '==', 'active')
    .get();
  let total = 0;
  subs.forEach((d) => { total += d.data().storageAmount || 0; });
  return total;
}

(async () => {
  console.log(APPLY ? '=== APPLY MODE (writing) ===' : '=== DRY RUN (no writes) — pass --apply to write ===');
  const usersSnap = await db.collection('users').get();
  console.log(`Scanning ${usersSnap.size} users...\n`);

  let toFix = 0, skippedHasManual = 0, clean = 0, owed = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const storageLimit = u.storageLimit || 0;

    if (u.manualBonusBytes != null) { skippedHasManual++; continue; }

    const formula =
      FREE_STORAGE_LIMIT +
      (u.backupBonusClaimed ? BACKUP_BONUS : 0) +
      (u.desktopBonusClaimed ? DESKTOP_INSTALL_BONUS : 0) +
      Math.min(u.referralBonusBytes || 0, MAX_REFERRAL_BONUS) +
      Math.min(u.memeReferralBonus || 0, MAX_MEME_REFERRAL_BONUS) +
      (await activeSubStorage(doc.id));

    const unexplained = storageLimit - formula;

    if (unexplained > EPSILON) {
      toFix++;
      console.log(
        `  FIX ${u.email || doc.id}: storageLimit ${(storageLimit / GB).toFixed(2)}GB, ` +
          `formula ${(formula / GB).toFixed(2)}GB -> manualBonusBytes = ${(unexplained / GB).toFixed(2)}GB`
      );
      if (APPLY) {
        batch.update(doc.ref, { manualBonusBytes: unexplained });
        if (++batchCount === 400) { await batch.commit(); batch = db.batch(); batchCount = 0; }
      }
    } else if (unexplained < -EPSILON) {
      // storageLimit is BELOW formula — user is under-credited; recalc would
      // raise them. Nothing to preserve; set manualBonusBytes=0 so they're
      // marked as processed (and not re-scanned).
      owed++;
      if (APPLY) {
        batch.update(doc.ref, { manualBonusBytes: 0 });
        if (++batchCount === 400) { await batch.commit(); batch = db.batch(); batchCount = 0; }
      }
    } else {
      clean++;
      if (APPLY) {
        batch.update(doc.ref, { manualBonusBytes: 0 });
        if (++batchCount === 400) { await batch.commit(); batch = db.batch(); batchCount = 0; }
      }
    }
  }

  if (APPLY && batchCount > 0) await batch.commit();

  console.log('\n=== Summary ===');
  console.log(`  manual grants to preserve (FIX): ${toFix}`);
  console.log(`  already had manualBonusBytes:     ${skippedHasManual}`);
  console.log(`  matches formula (manual=0):       ${clean}`);
  console.log(`  under-credited (manual=0):        ${owed}`);
  console.log(APPLY ? '  -> changes written.' : '  -> DRY RUN, nothing written. Re-run with --apply.');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
