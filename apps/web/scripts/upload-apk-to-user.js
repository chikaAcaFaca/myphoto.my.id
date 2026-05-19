// Admin tool — upload a local file directly into a user's MySpace.
// Bypasses the normal upload-url + PATCH dance because we're acting as
// admin: writes to S3 with the user's storage key prefix, creates the
// diskFiles doc, and bumps storageUsed in lockstep.
//
// Usage: node apps/web/scripts/upload-apk-to-user.js <email> <local-file-path> [folder-name]

const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const email = process.argv[2];
const localPath = process.argv[3];
const folderName = process.argv[4] || 'Downloads';

if (!email || !localPath) {
  console.error('Usage: node upload-apk-to-user.js <email> <local-file-path> [folder-name]');
  process.exit(1);
}
const abs = path.resolve(localPath);
if (!fs.existsSync(abs)) {
  console.error('File not found:', abs);
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

// Wasabi creds — clean any "label= " prefix the local .env keeps
// (the deployed env doesn't have it, so this matches upload-public-apk.js).
const cleanCreds = (v) => (v || '').replace(/^[a-z][a-z0-9._-]*=\s*/i, '').trim();
const REGION = 'eu-central-2';
const ENDPOINT = `https://s3.${REGION}.wasabisys.com`;
const BUCKET = process.env.WASABI_BUCKET || 'myphoto-prod';
const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: cleanCreds(process.env.WASABI_ACCESS_KEY_ID),
    secretAccessKey: cleanCreds(process.env.WASABI_SECRET_ACCESS_KEY),
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

function genId(len = 24) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function putFileViaHttps(uploadUrl, absPath, size, contentType) {
  return new Promise((resolve, reject) => {
    const u = new URL(uploadUrl);
    const req = https.request(
      {
        method: 'PUT',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'Content-Type': contentType, 'Content-Length': size },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { if (body.length < 2000) body += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.statusCode);
          else reject(new Error(`S3 PUT ${res.statusCode}: ${body.slice(0, 400)}`));
        });
      }
    );
    req.on('error', reject);
    let sent = 0;
    let lastPct = -1;
    const stream = fs.createReadStream(absPath);
    stream.on('data', (chunk) => {
      sent += chunk.length;
      const pct = Math.floor((sent / size) * 100);
      if (pct !== lastPct && pct % 10 === 0) {
        lastPct = pct;
        console.log(`  ${pct}% (${(sent / 1048576).toFixed(0)}/${(size / 1048576).toFixed(0)} MB)`);
      }
    });
    stream.pipe(req);
  });
}

(async () => {
  const user = await getAuth().getUserByEmail(email);
  const stat = fs.statSync(abs);
  const fileName = path.basename(abs);
  const ext = path.extname(fileName).slice(1).toLowerCase() || 'bin';

  // Pick a sensible MIME type for the file we're shipping. APK is the
  // common case; everything else falls through to octet-stream.
  const mimeMap = {
    apk: 'application/vnd.android.package-archive',
    exe: 'application/x-msdownload',
    zip: 'application/zip',
    pdf: 'application/pdf',
  };
  const mimeType = mimeMap[ext] || 'application/octet-stream';

  // Make sure the destination folder exists in this user's MySpace —
  // create it on demand so the upload doesn't dump into root.
  let folderId = 'root';
  if (folderName && folderName !== 'root') {
    const existing = await db
      .collection('folders')
      .where('userId', '==', user.uid)
      .where('name', '==', folderName)
      .where('parentId', '==', 'root')
      .where('isTrashed', '==', false)
      .limit(1)
      .get();
    if (!existing.empty) {
      folderId = existing.docs[0].id;
    } else {
      const ref = await db.collection('folders').add({
        userId: user.uid,
        name: folderName,
        parentId: 'root',
        isTrashed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      folderId = ref.id;
      console.log(`Created folder "${folderName}" (${folderId})`);
    }
  }

  const fileId = genId();
  const s3Key = `disk/${user.uid}/${fileId}.${ext}`;

  console.log(`Uploading ${(stat.size / 1048576).toFixed(1)} MB → s3://${BUCKET}/${s3Key}`);

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, ContentType: mimeType, ContentLength: stat.size }),
    { expiresIn: 3600 }
  );
  await putFileViaHttps(url, abs, stat.size, mimeType);

  const now = new Date();
  await db.collection('diskFiles').doc(fileId).set({
    userId: user.uid,
    name: fileName,
    s3Key,
    mimeType,
    size: stat.size,
    folderId,
    isTrashed: false,
    createdAt: now,
    updatedAt: now,
  });

  // Bump quota so the user's storage page reflects the new file.
  await db.collection('users').doc(user.uid).update({
    storageUsed: FieldValue.increment(stat.size),
  });

  console.log('OK');
  console.log(`  email:   ${email}`);
  console.log(`  file:    ${fileName} (${(stat.size / 1048576).toFixed(1)} MB)`);
  console.log(`  folder:  ${folderName} (${folderId})`);
  console.log(`  fileId:  ${fileId}`);
  console.log(`  visible: https://myphotomy.space/myspace`);
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
