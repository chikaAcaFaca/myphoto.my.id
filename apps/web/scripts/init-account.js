// Owner tool: ensure a users profile doc exists for an account, and set its
// storageLimit to FREE + <grantGB>. Creates the doc with app defaults if it's
// missing (account exists in Auth but never got a Firestore profile), else just
// bumps the limit. Precise — touches only this one account.
//
// Usage: node apps/web/scripts/init-account.js <email> <grantGB>
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const email = process.argv[2];
const grantGB = parseFloat(process.argv[3] || '30');
if (!email) { console.error('Usage: init-account.js <email> <grantGB>'); process.exit(1); }
const GB = 1024 * 1024 * 1024;
const FREE = 1 * GB;

function code(n = 8) {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

(async () => {
  const user = await getAuth().getUserByEmail(email);
  // Named DB 'myphoto' — the app reads/writes there, not "(default)".
  const db = getFirestore(undefined, 'myphoto');
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    const before = snap.data().storageLimit || 0;
    const after = before + grantGB * GB;
    // Record in manualBonusBytes so a later recalc preserves this grant.
    await ref.update({
      storageLimit: after,
      manualBonusBytes: FieldValue.increment(grantGB * GB),
    });
    console.log(`Existing profile — limit ${(before / GB).toFixed(2)} -> ${(after / GB).toFixed(2)} GB`);
    return;
  }

  const profile = {
    email: user.email || email,
    displayName: user.displayName || (user.email || email).split('@')[0],
    avatarUrl: user.photoURL || null,
    settings: {
      syncMode: 'wifi_only',
      uploadQuality: 'original',
      autoBackup: true,
      allowRoaming: false,
      faceRecognition: true,
      darkMode: false,
      backupFolders: [],
    },
    storageUsed: 0,
    storageLimit: FREE + grantGB * GB,
    manualBonusBytes: grantGB * GB,
    subscriptionIds: [],
    role: 'user',
    referralCode: code(8),
    referralCount: 0,
    referralBonusBytes: 0,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(profile);
  console.log(`Created profile users/${user.uid} for ${email} with limit ${(profile.storageLimit / GB).toFixed(0)} GB`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
