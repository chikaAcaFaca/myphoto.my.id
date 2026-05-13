// Finds meme records whose image is missing on Wasabi (no s3Key, or the
// object returns NoSuchKey on HEAD). Pass --delete to actually remove them;
// without that flag the script only reports.
//
// Usage:
//   node apps/web/scripts/cleanup-broken-memes.js          # dry-run
//   node apps/web/scripts/cleanup-broken-memes.js --delete # actually delete

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const shouldDelete = process.argv.includes('--delete');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(undefined, 'myphoto');

const s3 = new S3Client({
  region: process.env.WASABI_REGION || 'eu-central-2',
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.eu-central-2.wasabisys.com',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.WASABI_BUCKET || 'myphoto-prod';

async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

(async () => {
  const snap = await db.collection('memes').get();
  console.log('Scanning ' + snap.size + ' meme record(s)…');
  const broken = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const s3Key = d.s3Key || null;
    let reason = null;
    if (!s3Key) {
      reason = 'no s3Key';
    } else {
      const ok = await objectExists(s3Key);
      if (!ok) reason = 'NoSuchKey: ' + s3Key;
    }
    if (reason) {
      broken.push({ id: doc.id, caption: d.caption, reason });
    }
  }

  if (!broken.length) {
    console.log('No broken memes found.');
    process.exit(0);
  }

  console.log('\nBroken memes (' + broken.length + '):');
  for (const b of broken) {
    console.log('  ' + b.id + '  | ' + (b.caption || '').slice(0, 40) + '  [' + b.reason + ']');
  }

  if (!shouldDelete) {
    console.log('\nDry run. Re-run with --delete to remove these records.');
    process.exit(0);
  }

  console.log('\nDeleting ' + broken.length + ' record(s)…');
  for (const b of broken) {
    await db.collection('memes').doc(b.id).delete();
    console.log('  DELETED ' + b.id);
  }
  console.log('Done.');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
