// Read-only diagnostic: for an account email, report its uid, whether a users
// profile doc exists, and how much real data (files + diskFiles) it has.
// Usage: node apps/web/scripts/check-account.js <email>
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
if (!email) { console.error('Usage: check-account.js <email>'); process.exit(1); }
const GB = 1024 * 1024 * 1024;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

async function sumColl(db, coll, uid) {
  const snap = await db.collection(coll).where('userId', '==', uid).get();
  let bytes = 0, n = 0, trashed = 0;
  snap.forEach((d) => {
    const x = d.data();
    if (x.isTrashed) { trashed++; return; }
    n++; if (typeof x.size === 'number') bytes += x.size;
  });
  return { n, trashed, bytes };
}

(async () => {
  const user = await getAuth().getUserByEmail(email);
  console.log(`uid: ${user.uid}  providers: ${user.providerData.map(p => p.providerId).join(',')}`);
  const db = getFirestore();
  const doc = await db.collection('users').doc(user.uid).get();
  console.log(`users/${user.uid} doc exists: ${doc.exists}`);
  if (doc.exists) {
    const d = doc.data();
    console.log(`  storageUsed=${((d.storageUsed||0)/GB).toFixed(2)}GB storageLimit=${((d.storageLimit||0)/GB).toFixed(2)}GB`);
  }
  const files = await sumColl(db, 'files', user.uid);
  const disk = await sumColl(db, 'diskFiles', user.uid);
  console.log(`files:     ${files.n} active (${(files.bytes/GB).toFixed(2)}GB), ${files.trashed} trashed`);
  console.log(`diskFiles: ${disk.n} active (${(disk.bytes/GB).toFixed(2)}GB), ${disk.trashed} trashed`);
  console.log(`REAL TOTAL active: ${((files.bytes+disk.bytes)/GB).toFixed(2)}GB`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
