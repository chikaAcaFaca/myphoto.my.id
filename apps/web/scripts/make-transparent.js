const sharp = require('sharp');
const path = require('path');

async function makeTransparent() {
  const inputPath = path.join(__dirname, '../public/logo.png');
  const outputPath = path.join(__dirname, '../public/logo-transparent.png');

  try {
    // Read the image and get its metadata
    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    // The dark blue background color is approximately #0d1b2a or similar
    // We'll remove dark colors and keep the logo elements

    await sharp(inputPath)
      .png()
      .toBuffer()
      .then(async (buffer) => {
        // Create a version where dark background becomes transparent
        // Using raw pixel manipulation
        const { data, info } = await sharp(buffer)
          .raw()
          .toBuffer({ resolveWithObject: true });

        const pixels = new Uint8Array(data);
        const newPixels = new Uint8Array(info.width * info.height * 4);

        for (let i = 0; i < info.width * info.height; i++) {
          const r = pixels[i * 3];
          const g = pixels[i * 3 + 1];
          const b = pixels[i * 3 + 2];

          // Check if pixel is dark background (dark blue/navy)
          // Background is approximately rgb(13, 27, 42) to rgb(20, 40, 60)
          const isDarkBackground = r < 50 && g < 60 && b < 80;

          newPixels[i * 4] = r;
          newPixels[i * 4 + 1] = g;
          newPixels[i * 4 + 2] = b;
          newPixels[i * 4 + 3] = isDarkBackground ? 0 : 255; // Alpha: 0 = transparent
        }

        await sharp(newPixels, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        })
          .png()
          .toFile(outputPath);

        console.log('Transparent logo created:', outputPath);
      });

  } catch (error) {
    console.error('Error:', error);
  }
}

makeTransparent();
