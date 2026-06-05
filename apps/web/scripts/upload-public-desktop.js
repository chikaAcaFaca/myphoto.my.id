// Upload the desktop build zip to a stable public S3 key so the website serves
// it from /api/download/desktop. Mirrors upload-public-apk.js.
//
// Usage: node apps/web/scripts/upload-public-desktop.js <zipPath>

const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const zipPath = process.argv[2];
if (!zipPath) {
  console.error('Usage: node upload-public-desktop.js <zipPath>');
  process.exit(1);
}
const abs = path.resolve(zipPath);
if (!fs.existsSync(abs)) {
  console.error('Zip not found:', abs);
  process.exit(1);
}

const REGION = 'eu-central-2';
const ENDPOINT = `https://s3.${REGION}.wasabisys.com`;
const BUCKET = process.env.WASABI_BUCKET || 'myphoto-prod';
const KEY = 'public/myphoto-desktop-latest.exe';
const CONTENT_TYPE = 'application/vnd.microsoft.portable-executable';

const cleanCreds = (v) => (v || '').replace(/^[a-z][a-z0-9._-]*=\s*/i, '').trim();

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

function putFileViaHttps(uploadUrl, absPath, size) {
  return new Promise((resolve, reject) => {
    const u = new URL(uploadUrl);
    const req = https.request(
      {
        method: 'PUT',
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'Content-Type': CONTENT_TYPE, 'Content-Length': size },
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
    let sent = 0, lastPct = -1;
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
  const stat = fs.statSync(abs);
  console.log(`Generating presigned PUT for s3://${BUCKET}/${KEY} ...`);
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: KEY, ContentType: CONTENT_TYPE, ContentLength: stat.size }),
    { expiresIn: 3600 }
  );
  console.log(`Uploading ${(stat.size / 1048576).toFixed(1)} MB ...`);
  const code = await putFileViaHttps(url, abs, stat.size);
  console.log(`OK (HTTP ${code}) — fetch via /api/download/desktop`);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(2);
});
