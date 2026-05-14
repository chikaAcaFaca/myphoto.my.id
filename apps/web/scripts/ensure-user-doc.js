// Ensures a Firestore users/{uid} document exists for a given email.
// Firebase Admin createUser() only makes the Auth record — without the
// Firestore doc, web login "succeeds" then bounces (no profile) and
// /api/disk-files returns 404 "User not found".
//
// Usage: node apps/web/scripts/ensure-user-doc.js <email>

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node ensure-user-doc.js <email>');
  process.exit(1);
}

const FREE_STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1 GB — must match packages/shared

function randomCode(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(undefined, 'myphoto');

(async () => {
  const user = await getAuth().getUserByEmail(email);
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();

  if (snap.exists) {
    console.log('OK — users/' + user.uid + ' already exists (' + email + ')');
    process.exit(0);
  }

  await ref.set({
    email: user.email || email,
    displayName: user.displayName || (email.split('@')[0]),
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
    storageLimit: FREE_STORAGE_LIMIT,
    subscriptionIds: [],
    role: 'user',
    referralCode: randomCode(8),
    referralCount: 0,
    referralBonusBytes: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log('CREATED users/' + user.uid + ' (' + email + ')');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
