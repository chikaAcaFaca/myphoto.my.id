// Uploads a local file into a user's MySpace (disk) via the production API,
// so it can be downloaded from anywhere (e.g. distributing the APK).
//
// Usage:
//   node apps/web/scripts/upload-to-myspace.js <email> <password> <filePath> [folderId]

const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const [, , email, password, filePath, folderId = 'root'] = process.argv;
if (!email || !password || !filePath) {
  console.error('Usage: node upload-to-myspace.js <email> <password> <filePath> [folderId]');
  process.exit(1);
}

const API = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

// Stream a local file to a presigned S3 PUT URL. Node's https handles large
// bodies via streaming — no whole-file buffering, no curl dependency.
function putFileToS3(uploadUrl, absPath, size, contentType) {
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
  console.log('Got upload URL, uploading ' + (stat.size / 1048576).toFixed(1) + ' MB...');

  // 3. Stream the file to S3.
  const code = await putFileToS3(uploadUrl, abs, stat.size, mimeType);
  console.log('Uploaded to S3 (HTTP ' + code + ').');

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
