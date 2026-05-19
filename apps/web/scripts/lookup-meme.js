// Quick one-off — look up a single meme by id and print its owner +
// s3Key, so we can figure out which account published it when the
// per-user cleanup script comes back empty.
//
// Usage: node apps/web/scripts/lookup-meme.js <memeId>

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const memeId = process.argv[2];
if (!memeId) { console.error('Usage: node lookup-meme.js <memeId>'); process.exit(1); }

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore(undefined, 'myphoto');

(async () => {
  const doc = await db.collection('memes').doc(memeId).get();
  if (!doc.exists) {
    console.log(`No meme with id ${memeId}`);
    process.exit(0);
  }
  const data = doc.data() || {};
  console.log('ALL fields:', JSON.stringify(Object.keys(data)));
  console.log(JSON.stringify({
    id: doc.id,
    userId: data.userId,
    s3Key: data.s3Key,
    caption: data.caption,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt,
  }, null, 2));
  if (data.userId) {
    try {
      const user = await getAuth().getUser(data.userId);
      console.log(`\nOwner: ${user.email} (${user.displayName || ''})`);
    } catch {}
  }
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(2);
});
