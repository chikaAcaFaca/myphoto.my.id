// Find every users/* profile doc whose email field matches — reveals duplicate
// profiles for the same account (e.g. an auth uid that doesn't match the doc
// holding the real storage). Usage: node find-users-by-email.js <email>
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const email = process.argv[2];
if (!email) { console.error('Usage: find-users-by-email.js <email>'); process.exit(1); }
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
  try {
    const authUser = await getAuth().getUserByEmail(email);
    console.log(`AUTH uid for ${email}: ${authUser.uid}`);
  } catch (e) {
    console.log(`AUTH lookup: ${e.message}`);
  }
  const snap = await db.collection('users').where('email', '==', email).get();
  console.log(`users docs with email=${email}: ${snap.size}`);
  for (const d of snap.docs) {
    const x = d.data();
    // count real files for this uid
    const f = await db.collection('files').where('userId', '==', d.id).where('isTrashed', '==', false).get();
    const dk = await db.collection('diskFiles').where('userId', '==', d.id).where('isTrashed', '==', false).get();
    let bytes = 0;
    f.forEach((r) => (bytes += r.data().size || 0));
    dk.forEach((r) => (bytes += r.data().size || 0));
    console.log(
      `  uid=${d.id}  used=${((x.storageUsed || 0) / GB).toFixed(2)}GB limit=${((x.storageLimit || 0) / GB).toFixed(2)}GB  ` +
        `realFiles=${f.size + dk.size} (${(bytes / GB).toFixed(2)}GB)`
    );
  }
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
