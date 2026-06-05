// Owner admin tool: grant extra storage to ONE account by email.
// Precise — looks up only that user (no listing of others) and bumps their
// storageLimit. Uses the same Firebase Admin creds as the app.
//
// Usage: node apps/web/scripts/grant-storage.js <email> <GB>

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
const addGB = parseFloat(process.argv[3] || '0');
if (!email || !addGB || addGB <= 0) {
  console.error('Usage: node grant-storage.js <email> <GB>');
  process.exit(1);
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

(async () => {
  const user = await getAuth().getUserByEmail(email);
  const db = getFirestore();
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`No users/${user.uid} doc for ${email}`);
  const before = snap.data().storageLimit || 0;
  const after = before + addGB * BYTES_PER_GB;
  await ref.update({ storageLimit: after });
  console.log(
    `Granted ${addGB} GB to ${email} (${user.uid}): ` +
      `${(before / BYTES_PER_GB).toFixed(2)} GB -> ${(after / BYTES_PER_GB).toFixed(2)} GB`
  );
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
