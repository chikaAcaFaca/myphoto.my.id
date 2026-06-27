// Recompute storageUsed for ONE account, counting files + diskFiles whose
// isTrashed is not true (handles legacy docs that LACK an isTrashed field — a
// `where isTrashed == false` query silently drops those). Keeps storageLimit.
// Usage: node apps/web/scripts/recompute-storage.js <email> [--write]
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
const write = process.argv.includes('--write');
if (!email) { console.error('Usage: recompute-storage.js <email> [--write]'); process.exit(1); }
const GB = 1024 * 1024 * 1024;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

async function sumAll(db, coll, uid) {
  const snap = await db.collection(coll).where('userId', '==', uid).get();
  let bytes = 0, active = 0, trashed = 0;
  snap.forEach((d) => {
    const x = d.data();
    if (x.isTrashed === true) { trashed++; return; }
    active++; if (typeof x.size === 'number') bytes += x.size;
  });
  return { bytes, active, trashed, total: snap.size };
}

(async () => {
  const user = await getAuth().getUserByEmail(email);
  const db = getFirestore();
  const f = await sumAll(db, 'files', user.uid);
  const dk = await sumAll(db, 'diskFiles', user.uid);
  const folders = await db.collection('folders').where('userId', '==', user.uid).get();
  const used = f.bytes + dk.bytes;
  console.log(`uid=${user.uid}`);
  console.log(`files:     ${f.active} active / ${f.total} total (${(f.bytes / GB).toFixed(2)} GB)`);
  console.log(`diskFiles: ${dk.active} active / ${dk.total} total (${(dk.bytes / GB).toFixed(2)} GB)`);
  console.log(`folders:   ${folders.size}`);
  console.log(`REAL storageUsed = ${(used / GB).toFixed(2)} GB`);
  if (write) {
    await db.collection('users').doc(user.uid).update({ storageUsed: used });
    const doc = await db.collection('users').doc(user.uid).get();
    console.log(`WROTE storageUsed=${(used / GB).toFixed(2)}GB (limit stays ${((doc.data().storageLimit || 0) / GB).toFixed(0)}GB)`);
  } else {
    console.log('(dry run — pass --write to persist)');
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
