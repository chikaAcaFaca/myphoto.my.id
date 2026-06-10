// Identify the account (uid) that owns specific folders the user is looking at,
// to resolve a duplicate-account / wrong-uid situation. Read-only.
// Usage: node find-folder-owner.js <folderName> [<folderName> ...]
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const names = process.argv.slice(2);
if (!names.length) { console.error('Usage: find-folder-owner.js <folderName> ...'); process.exit(1); }
const GB = 1024 * 1024 * 1024;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

(async () => {
  const db = getFirestore();
  const owners = new Map();
  for (const name of names) {
    const snap = await db.collection('folders').where('name', '==', name).get();
    snap.forEach((d) => {
      const uid = d.data().userId;
      owners.set(uid, (owners.get(uid) || 0) + 1);
    });
  }
  console.log(`Owners across folders [${names.join(', ')}]:`);
  for (const [uid, n] of owners) {
    const u = await db.collection('users').doc(uid).get();
    const d = u.data() || {};
    const dk = await db.collection('diskFiles').where('userId', '==', uid).get();
    let bytes = 0; dk.forEach((r) => { if (r.data().isTrashed !== true) bytes += r.data().size || 0; });
    console.log(`  uid=${uid}  folders=${n}  email=${d.email || '(none)'}  docExists=${u.exists}  ` +
      `used=${((d.storageUsed || 0) / GB).toFixed(2)}GB limit=${((d.storageLimit || 0) / GB).toFixed(2)}GB diskFiles=${dk.size} (${(bytes / GB).toFixed(2)}GB)`);
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
