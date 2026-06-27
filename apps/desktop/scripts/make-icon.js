// Generate apps/desktop/assets/icon.ico (multi-size, PNG-encoded entries) from
// the brand icon, so electron-builder's NSIS installer has its required icon.
// Self-contained — uses the repo's sharp; no extra deps, no ImageMagick.
const path = require('path');
const fs = require('fs');
const sharp = require(path.resolve(__dirname, '../../../node_modules/sharp'));

// Use the Android app icon (stylised white "m" on blue) so desktop matches it
// in the taskbar, Task Manager and tray.
const SRC = path.resolve(__dirname, '../../mobile/assets/icon.png');
const OUT = path.resolve(__dirname, '../assets/icon.ico');
const SIZES = [16, 32, 48, 64, 128, 256];

(async () => {
  const pngs = [];
  for (const s of SIZES) {
    pngs.push(await sharp(SRC).resize(s, s, { fit: 'cover' }).png().toBuffer());
  }

  const N = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(N, 4); // count

  const entries = Buffer.alloc(16 * N);
  let offset = 6 + 16 * N;
  for (let i = 0; i < N; i++) {
    const s = SIZES[i];
    const e = entries.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(s >= 256 ? 0 : s, 0); // width (0 == 256)
    e.writeUInt8(s >= 256 ? 0 : s, 1); // height
    e.writeUInt8(0, 2); // color count
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit depth
    e.writeUInt32LE(pngs[i].length, 8); // bytes in resource
    e.writeUInt32LE(offset, 12); // image offset
    offset += pngs[i].length;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, Buffer.concat([header, entries, ...pngs]));
  console.log(`Wrote ${OUT} (${SIZES.join(',')} px, ${fs.statSync(OUT).size} bytes)`);

  // Also emit the brand PNGs the app loads at runtime: the tray icon (shown in
  // the Windows notification area near the clock) and a general app icon. These
  // were missing, so the tray fell back to a plain blue square.
  const trayOut = path.resolve(__dirname, '../assets/tray-icon.png');
  const iconOut = path.resolve(__dirname, '../assets/icon.png');
  await sharp(SRC).resize(32, 32, { fit: 'cover' }).png().toFile(trayOut);
  await sharp(SRC).resize(256, 256, { fit: 'cover' }).png().toFile(iconOut);
  console.log(`Wrote ${trayOut} (32px) and ${iconOut} (256px)`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(2); });
