// Admin tool — delete the user's diskFiles whose name matches a prefix,
// keeping the most recently uploaded one. Used to clear out the pile of
// test APKs that accumulate in /myspace during mobile build iteration.
//
// Deletes S3 object + Firestore doc and decrements the user's
// storageUsed in one go.
//
// Usage: node apps/web/scripts/cleanup-old-files.js <email> <name-prefix>
//
// Example:
//   node apps/web/scripts/cleanup-old-files.js chika.aca@example.com MyPhoto-2026-05-19
// → keeps the newest matching file, deletes the rest.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const email = process.argv[2];
const prefix = process.argv[3];
if (!email || !prefix) {
  console.error('Usage: node cleanup-old-files.js <email> <name-prefix>');
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

const cleanCreds = (v) => (v || '').replace(/^[a-z][a-z0-9._-]*=\s*/i, '').trim();
const REGION = 'eu-central-2';
const BUCKET = process.env.WASABI_BUCKET || 'myphoto-prod';
const s3 = new S3Client({
  region: REGION,
  endpoint: `https://s3.${REGION}.wasabisys.com`,
  credentials: {
    accessKeyId: cleanCreds(process.env.WASABI_ACCESS_KEY_ID),
    secretAccessKey: cleanCreds(process.env.WASABI_SECRET_ACCESS_KEY),
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

(async () => {
  const user = await getAuth().getUserByEmail(email);
  console.log(`Scanning diskFiles for ${email}, prefix="${prefix}"…`);

  const snap = await db
    .collection('diskFiles')
    .where('userId', '==', user.uid)
    .get();

  // Filter by name prefix client-side — Firestore where() doesn't do
  // startsWith without an index trick.
  const matches = snap.docs
    .filter((d) => {
      const data = d.data();
      return typeof data.name === 'string'
        && data.name.startsWith(prefix)
        && !data.isTrashed;
    })
    .sort((a, b) => {
      const at = a.data().createdAt?.toMillis?.() || 0;
      const bt = b.data().createdAt?.toMillis?.() || 0;
      return bt - at; // newest first
    });

  if (matches.length === 0) {
    console.log('No matching files.');
    process.exit(0);
  }

  const keep = matches[0];
  const drop = matches.slice(1);

  console.log(`Found ${matches.length} matching files.`);
  console.log(`  Keeping: ${keep.data().name}  (${keep.id})`);
  if (drop.length === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  let freedBytes = 0;
  for (const doc of drop) {
    const data = doc.data();
    console.log(`  Deleting: ${data.name}  (${doc.id})  ${(data.size / 1048576).toFixed(1)} MB`);
    if (data.s3Key) {
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: data.s3Key }));
      } catch (e) {
        console.warn(`    S3 delete failed (${e.message || e}) — continuing with Firestore delete anyway.`);
      }
    }
    await doc.ref.delete();
    freedBytes += data.size || 0;
  }

  if (freedBytes > 0) {
    await db.collection('users').doc(user.uid).update({
      storageUsed: FieldValue.increment(-freedBytes),
    });
  }

  console.log('');
  console.log(`Deleted ${drop.length} files, freed ${(freedBytes / 1048576).toFixed(1)} MB`);
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(2);
});
