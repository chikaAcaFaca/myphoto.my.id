#!/usr/bin/env node

/**
 * Downloads face-api.js models for server-side face detection.
 * These models are required for the @vladmandic/face-api package.
 *
 * Run with: node scripts/download-face-models.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models', 'face-api');

// Model files from @vladmandic/face-api
const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const MODELS = [
  // SSD MobileNet V1 - Face detection
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',

  // Face Landmark 68 Points
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',

  // Face Recognition Net
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',

  // Optional: Age Gender Net
  // 'age_gender_model-weights_manifest.json',
  // 'age_gender_model-shard1',

  // Optional: Face Expression Net
  // 'face_expression_model-weights_manifest.json',
  // 'face_expression_model-shard1',
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading face-api.js models...\n');

  // Create models directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log(`Created directory: ${MODELS_DIR}\n`);
  }

  let downloaded = 0;
  let failed = 0;

  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}`;
    const dest = path.join(MODELS_DIR, model);

    // Skip if already exists
    if (fs.existsSync(dest)) {
      console.log(`[SKIP] ${model} (already exists)`);
      downloaded++;
      continue;
    }

    try {
      process.stdout.write(`[DOWNLOAD] ${model}...`);
      await downloadFile(url, dest);
      console.log(' OK');
      downloaded++;
    } catch (error) {
      console.log(` FAILED: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nDownload complete: ${downloaded} files downloaded, ${failed} failed`);
  console.log(`Models saved to: ${MODELS_DIR}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
