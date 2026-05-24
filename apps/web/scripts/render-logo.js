// One-off: render the MyPhoto wordmark logo (SVG -> PNG) to replace the legacy
// MyCameraBackup logo. Run from apps/web: node scripts/render-logo.js
const sharp = require('sharp');
const path = require('path');

const W = 1280, H = 283;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <g transform="translate(24,72)">
    <rect x="0" y="0" width="140" height="140" rx="34" fill="url(#g)"/>
    <path transform="translate(26,42) scale(0.95)" fill="#ffffff"
      d="M78 66H24a21 21 0 0 1-3-41.7A31 31 0 0 1 80 29a19 19 0 0 1-2 37z"/>
  </g>
  <text x="190" y="152" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="800" fill="#0ea5e9" dominant-baseline="middle">MyPhoto<tspan fill="#8b5cf6">my.space</tspan></text>
</svg>`;

// Square badge icon (cloud) for collapsed sidebar / square contexts.
const S = 256;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${S}" height="${S}" rx="60" fill="url(#g)"/>
  <path transform="translate(48,74) scale(1.6)" fill="#ffffff"
    d="M78 66H24a21 21 0 0 1-3-41.7A31 31 0 0 1 80 29a19 19 0 0 1-2 37z"/>
</svg>`;

// Full-bleed maskable app/PWA icon (gradient fills the whole square, cloud in
// the centre safe-zone) — OS applies its own rounded/circle mask.
const maskSvg = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="256" height="256" fill="url(#g)"/>
  <path transform="translate(58,82) scale(1.42)" fill="#ffffff"
    d="M78 66H24a21 21 0 0 1-3-41.7A31 31 0 0 1 80 29a19 19 0 0 1-2 37z"/>
</svg>`;

// Social share card (1200x630) — referenced by openGraph/twitter metadata.
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(600,250)">
    <path transform="translate(-90,-90) scale(1.8)" fill="#ffffff"
      d="M78 66H24a21 21 0 0 1-3-41.7A31 31 0 0 1 80 29a19 19 0 0 1-2 37z"/>
  </g>
  <text x="600" y="430" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="92" font-weight="800" fill="#ffffff">MyPhotomy.space</text>
  <text x="600" y="500" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="500" fill="rgba(255,255,255,0.92)">Privatni cloud za tvoje slike, video i memove</text>
</svg>`;

const out = path.resolve(__dirname, '..', 'public', 'logo.png');
const outT = path.resolve(__dirname, '..', 'public', 'logo-transparent.png');
const outIcon = path.resolve(__dirname, '..', 'public', 'logo-icon.png');
const preview = path.resolve(__dirname, '..', '..', 'mobile', 'logo-preview.png');
const previewIcon = path.resolve(__dirname, '..', '..', 'mobile', 'logo-icon-preview.png');

(async () => {
  const fs = require('fs');
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const iconBuf = await sharp(Buffer.from(iconSvg)).png().toBuffer();
  const pwa192 = await sharp(Buffer.from(maskSvg(192))).png().toBuffer();
  const pwa512 = await sharp(Buffer.from(maskSvg(512))).png().toBuffer();
  const og = await sharp(Buffer.from(ogSvg)).png().toBuffer();
  fs.writeFileSync(preview, buf);
  fs.writeFileSync(previewIcon, iconBuf);
  fs.writeFileSync(path.resolve(__dirname, '..', '..', 'mobile', 'pwa-icon-preview.png'), pwa512);
  fs.writeFileSync(path.resolve(__dirname, '..', '..', 'mobile', 'og-preview.png'), og);
  console.log('previews written');
  // Only overwrite the real logos when CONFIRM=1 so we can eyeball first.
  if (process.env.CONFIRM === '1') {
    fs.writeFileSync(out, buf);
    fs.writeFileSync(outT, buf);
    fs.writeFileSync(outIcon, iconBuf);
    fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'icons', 'icon-192.png'), pwa192);
    fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'icons', 'icon-512.png'), pwa512);
    fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'og-image.png'), og);
    console.log('logos + PWA icons + og-image replaced');
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
