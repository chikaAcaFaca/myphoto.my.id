// Uploads a local file into a user's MySpace (disk) via the production API,
// so it can be downloaded from anywhere (e.g. distributing the APK).
//
// Usage:
//   node apps/web/scripts/upload-to-myspace.js <email> <password> <filePath> [folderId]

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const [, , email, password, filePath, folderId = 'root'] = process.argv;
if (!email || !password || !filePath) {
  console.error('Usage: node upload-to-myspace.js <email> <password> <filePath> [folderId]');
  process.exit(1);
}

const API = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

(async () => {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error('File not found: ' + abs);
  const stat = fs.statSync(abs);
  const filename = path.basename(abs);
  const ext = filename.toLowerCase().split('.').pop();
  const mimeType =
    ext === 'apk' ? 'application/vnd.android.package-archive' : 'application/octet-stream';

  // 1. Sign in (Firebase REST) to get an ID token.
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const signIn = await signInRes.json();
  if (!signIn.idToken) throw new Error('Sign-in failed: ' + JSON.stringify(signIn.error || signIn));
  const token = signIn.idToken;
  console.log('Signed in as ' + email);

  // 2. Request a presigned upload URL.
  const urlRes = await fetch(`${API}/api/disk-files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, mimeType, size: stat.size, folderId }),
  });
  const urlData = await urlRes.json();
  if (!urlRes.ok) throw new Error('disk-files POST failed: ' + JSON.stringify(urlData));
  const { uploadUrl, fileId, s3Key } = urlData;
  console.log('Got upload URL, uploading ' + (stat.size / 1024 / 1024).toFixed(1) + ' MB...');

  // 3. PUT the file to S3 via curl — Node's fetch (undici) chokes on very
  // large in-memory request bodies; curl streams the file reliably.
  const httpCode = execFileSync(
    'curl',
    [
      '-sS', '-X', 'PUT',
      '-H', `Content-Type: ${mimeType}`,
      '--data-binary', `@${abs}`,
      '-o', '/dev/null',
      '-w', '%{http_code}',
      uploadUrl,
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }
  ).trim();
  if (!/^2\d\d$/.test(httpCode)) throw new Error('S3 PUT failed: HTTP ' + httpCode);
  console.log('Uploaded to S3 (HTTP ' + httpCode + ').');

  // 4. Confirm the upload.
  const confirmRes = await fetch(`${API}/api/disk-files`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, s3Key, filename, mimeType, size: stat.size, folderId }),
  });
  const confirm = await confirmRes.json();
  if (!confirmRes.ok) throw new Error('Confirm failed: ' + JSON.stringify(confirm));

  console.log('DONE — ' + filename + ' is now in ' + email + "'s MySpace (folder: " + folderId + ')');
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
