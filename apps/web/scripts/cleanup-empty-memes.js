// Admin tool — delete meme records whose S3 image upload never
// succeeded (so the meme shows up on /meme-wall as a broken tile).
//
// Walks the memes collection for a given user, HEAD-checks each
// referenced s3Key, and deletes the Firestore doc when the object
// doesn't exist on Wasabi. Subcollections (reactions, comments)
// are best-effort-deleted alongside so we don't leave orphans.
//
// Usage: node apps/web/scripts/cleanup-empty-memes.js <email> [--dry-run]

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const email = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!email) {
  console.error('Usage: node cleanup-empty-memes.js <email> [--dry-run]');
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

async function s3KeyExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    if (e?.$metadata?.httpStatusCode === 404) return false;
    if (e?.name === 'NotFound' || e?.name === 'NoSuchKey') return false;
    // Other errors (network etc) — surface but be conservative and
    // don't delete to avoid losing a meme that's actually fine.
    console.warn(`HEAD failed for ${key}:`, e?.message || e);
    return true;
  }
}

async function deleteSubcollection(memeRef, name) {
  const snap = await memeRef.collection(name).limit(500).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

(async () => {
  const user = await getAuth().getUserByEmail(email);
  console.log(`Scanning memes for ${email} (uid: ${user.uid})…`);

  // Memes use `authorId` (not `userId` like most other collections) —
  // mismatch the field name and the query silently returns empty.
  const memesSnap = await db
    .collection('memes')
    .where('authorId', '==', user.uid)
    .get();

  if (memesSnap.empty) {
    console.log('No memes for this user.');
    process.exit(0);
  }

  let kept = 0;
  let deleted = 0;
  let skipped = 0;

  for (const doc of memesSnap.docs) {
    const data = doc.data() || {};
    const s3Key = data.s3Key;
    if (!s3Key) {
      // No s3Key at all — definitely empty.
      console.log(`EMPTY (no s3Key)   ${doc.id}  caption="${(data.caption || '').slice(0, 40)}"`);
      if (!dryRun) {
        await deleteSubcollection(doc.ref, 'reactions');
        await deleteSubcollection(doc.ref, 'comments');
        await doc.ref.delete();
      }
      deleted++;
      continue;
    }
    const exists = await s3KeyExists(s3Key);
    if (!exists) {
      console.log(`EMPTY (no s3 obj)  ${doc.id}  key=${s3Key}  caption="${(data.caption || '').slice(0, 40)}"`);
      if (!dryRun) {
        await deleteSubcollection(doc.ref, 'reactions');
        await deleteSubcollection(doc.ref, 'comments');
        await doc.ref.delete();
      }
      deleted++;
    } else {
      kept++;
    }
  }

  console.log('');
  console.log(`Total: ${memesSnap.size}  Kept: ${kept}  Deleted: ${deleted}  Skipped: ${skipped}`);
  if (dryRun) console.log('DRY RUN — no documents were actually deleted.');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(2);
});
