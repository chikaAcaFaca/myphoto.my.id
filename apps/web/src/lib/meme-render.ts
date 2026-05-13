import sharp from 'sharp';

const escapeXml = (s: string): string =>
  s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string));

/**
 * Render a classic meme: source image with top/bottom Impact-style text
 * (white fill, black stroke) and a 'myphotomy.space' watermark in the
 * bottom-right corner. Returns a JPEG buffer.
 */
export async function renderMeme(
  sourceBuffer: Buffer,
  topText: string,
  bottomText: string
): Promise<Buffer> {
  const img = sharp(sourceBuffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const width = meta.width ?? 800;
  const height = meta.height ?? 800;

  const fontSize = Math.max(Math.round(width / 15), 24);
  const strokeWidth = Math.max(Math.round(fontSize / 12), 2);
  const wmSize = Math.max(Math.round(width / 40), 12);
  const wmStroke = Math.max(Math.round(wmSize / 6), 1);
  const fontFamily = "Impact, 'Anton', 'Arial Black', 'Helvetica Bold', sans-serif";

  const textNode = (txt: string, y: number, anchor: 'middle' | 'end', size: number, stroke: number) => `
    <text x="${anchor === 'middle' ? width / 2 : width - 10}" y="${y}"
          text-anchor="${anchor}"
          font-family="${fontFamily}" font-weight="900" font-size="${size}"
          fill="white" stroke="black" stroke-width="${stroke}"
          paint-order="stroke fill">${escapeXml(txt)}</text>`;

  const top = topText ? textNode(topText.toUpperCase(), fontSize + 14, 'middle', fontSize, strokeWidth) : '';
  const bottom = bottomText
    ? textNode(bottomText.toUpperCase(), height - 14, 'middle', fontSize, strokeWidth)
    : '';
  const watermark = textNode('myphotomy.space', height - 8, 'end', wmSize, wmStroke);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${top}${bottom}${watermark}
  </svg>`;

  return await img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
