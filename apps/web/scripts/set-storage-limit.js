// Admin tool — overwrite a user's storageLimit (Firestore users/{uid}).
// Used for testing / support: grants a specific account a flat quota
// regardless of free-tier rules and earned bonuses.
//
// Usage: node apps/web/scripts/set-storage-limit.js <email> <gigabytes>

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
const gb = Number(process.argv[3]);

if (!email || !Number.isFinite(gb) || gb <= 0) {
  console.error('Usage: node set-storage-limit.js <email> <gigabytes>');
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(undefined, 'myphoto');
const BYTES_PER_GB = 1024 * 1024 * 1024;

(async () => {
  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch (e) {
    if (e && e.code === 'auth/user-not-found') {
      console.error(`SKIP — no Firebase Auth user with email ${email}`);
      process.exit(2);
    }
    throw e;
  }

  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`SKIP — Firestore users/${user.uid} does not exist (run ensure-user-doc.js first)`);
    process.exit(3);
  }

  const before = snap.data();
  const newLimit = Math.floor(gb * BYTES_PER_GB);

  await ref.update({ storageLimit: newLimit });

  console.log('OK');
  console.log('  email:        ' + email);
  console.log('  uid:          ' + user.uid);
  console.log('  before bytes: ' + (before.storageLimit || 0));
  console.log('  after  bytes: ' + newLimit + '   (' + gb + ' GB)');
  console.log('  used bytes:   ' + (before.storageUsed || 0));
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(4);
});
