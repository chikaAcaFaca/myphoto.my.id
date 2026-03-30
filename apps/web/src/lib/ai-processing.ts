import sharp from 'sharp';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { WASABI_REGION, WASABI_ENDPOINT, THUMBNAIL_SIZES } from '@myphoto/shared';
import { initAdmin, db } from './firebase-admin';
import { generateUploadUrl } from './s3';
import { extractExifData, type ExifData } from './ai/exif-extractor';
import { detectFaces, type FaceDetection } from './ai/face-detection';
import { calculatePHash } from './ai/duplicate-detection';
import * as admin from 'firebase-admin';

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_AI_WORKER_URL;

// S3 Client for reading files
const s3Client = new S3Client({
  region: WASABI_REGION,
  endpoint: WASABI_ENDPOINT,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID!,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.WASABI_BUCKET || 'mycamerabackup-prod';

async function downloadFromS3(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const chunks: Uint8Array[] = [];

  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<void> {
  const { url } = await generateUploadUrl(key, contentType, buffer.length);

  await fetch(url, {
    method: 'PUT',
    body: new Uint8Array(buffer),
    headers: {
      'Content-Type': contentType,
    },
  });
}

export interface AIProcessingResult {
  // Basic metadata
  width: number;
  height: number;
  thumbnailKey?: string;
  smallThumbKey?: string;
  largeThumbKey?: string;

  // EXIF data
  takenAt?: Date;
  location?: { latitude: number; longitude: number };
  camera?: string;

  // AI detected data
  labels: string[];
  faces?: FaceDetection[];
  faceCount: number;
  qualityScore: number;
  dominantColors: string[];
  sceneType?: string;

  // Duplicate detection
  pHash: string;
}

export async function processImageAI(fileId: string, s3Key: string): Promise<AIProcessingResult> {
  initAdmin();

  try {
    console.log(`Processing image AI for file: ${fileId}`);

    // Download image from S3
    const imageBuffer = await downloadFromS3(s3Key);

    // Get image metadata using Sharp
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Generate thumbnails FIRST (most critical) — must succeed before anything else
    const thumbnails = await generateThumbnails(imageBuffer, s3Key);

    // Save thumbnail keys immediately so they're available even if AI steps fail
    await db.collection('files').doc(fileId).update({
      thumbnailKey: thumbnails.medium,
      smallThumbKey: thumbnails.small,
      largeThumbKey: thumbnails.large,
    });

    // Process AI features in parallel — failures here won't lose thumbnails
    const [
      exifData,
      labels,
      faces,
      qualityScore,
      dominantColors,
      pHash,
    ] = await Promise.allSettled([
      extractExifData(imageBuffer),
      detectObjects(imageBuffer),
      detectFacesFromBuffer(imageBuffer),
      calculateQualityScore(imageBuffer),
      extractDominantColors(imageBuffer),
      calculatePHash(imageBuffer),
    ]).then(results => results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.error(`AI step ${i} failed:`, r.reason);
      // Return safe defaults
      const defaults = [{}, [], [], 50, [], ''] as const;
      return defaults[i];
    })) as [ExifData, string[], FaceDetection[], number, string[], string];

    // Detect scene type and rich scene attributes
    const sceneType = detectSceneType(labels);

    // Calculate image brightness for time-of-day inference
    let brightness = 128;
    try {
      const stats = await sharp(imageBuffer).stats();
      brightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    } catch { /* use default */ }

    const sceneAttributes = analyzeSceneAttributes(
      labels,
      dominantColors,
      exifData.takenAt ? { takenAt: exifData.takenAt } : null,
      { brightness }
    );

    // Prepare update data
    const updateData: Record<string, any> = {
      width,
      height,
      labels,
      thumbnailKey: thumbnails.medium,
      smallThumbKey: thumbnails.small,
      largeThumbKey: thumbnails.large,
      qualityScore,
      dominantColors,
      pHash,
      sceneType,
      sceneAttributes,
      faceCount: faces.length,
      aiProcessedAt: new Date(),
    };

    // Add EXIF data if available
    if (exifData.takenAt) {
      updateData.takenAt = exifData.takenAt;
    }
    if (exifData.location) {
      updateData.location = exifData.location;
    }
    if (exifData.camera) {
      updateData.deviceInfo = exifData.camera;
    }

    // Add face data with attributes if detected
    if (faces.length > 0) {
      updateData.faces = faces.map((f) => ({
        boundingBox: f.boundingBox,
        confidence: f.confidence,
        descriptor: f.descriptor,
        attributes: {
          age: f.age,
          gender: f.gender,
          expression: f.expression,
        },
      }));

      // Process faces for person grouping
      await processFacesForPeople(fileId, faces);
    }

    // Update Firestore document with AI results
    await db.collection('files').doc(fileId).update(updateData);

    console.log(`AI processing complete for file: ${fileId}`);

    return {
      width,
      height,
      thumbnailKey: thumbnails.medium,
      smallThumbKey: thumbnails.small,
      largeThumbKey: thumbnails.large,
      takenAt: exifData.takenAt,
      location: exifData.location,
      camera: exifData.camera,
      labels,
      faces,
      faceCount: faces.length,
      qualityScore,
      dominantColors,
      sceneType,
      pHash,
    };
  } catch (error) {
    console.error(`AI processing failed for file ${fileId}:`, error);

    // Mark as failed but don't throw
    await db.collection('files').doc(fileId).update({
      aiProcessingError: error instanceof Error ? error.message : 'Unknown error',
      aiProcessedAt: new Date(),
    });

    throw error;
  }
}

// Wrapper for face detection with error handling
async function detectFacesFromBuffer(imageBuffer: Buffer): Promise<FaceDetection[]> {
  try {
    return await detectFaces(imageBuffer);
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

// Process detected faces and group into people
async function processFacesForPeople(
  fileId: string,
  faces: FaceDetection[]
): Promise<void> {
  try {
    const fileDoc = await db.collection('files').doc(fileId).get();
    if (!fileDoc.exists) return;

    const userId = fileDoc.data()!.userId;

    // Get existing people for this user
    const peopleSnapshot = await db
      .collection('people')
      .where('userId', '==', userId)
      .get();

    const existingPeople = peopleSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    for (const face of faces) {
      // Find matching person
      let matchedPersonId: string | null = null;
      let bestDistance = Infinity;

      for (const person of existingPeople) {
        const distance = euclideanDistance(
          face.descriptor,
          (person as any).faceEmbedding || []
        );
        if (distance < 0.6 && distance < bestDistance) {
          matchedPersonId = person.id;
          bestDistance = distance;
        }
      }

      if (matchedPersonId) {
        // Add file to existing person
        await db
          .collection('people')
          .doc(matchedPersonId)
          .update({
            sampleFileIds: admin.firestore.FieldValue.arrayUnion(fileId),
            photoCount: admin.firestore.FieldValue.increment(1),
          });
      } else {
        // Create new person
        await db.collection('people').add({
          userId,
          faceEmbedding: face.descriptor,
          sampleFileIds: [fileId],
          photoCount: 1,
          createdAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error processing faces for people:', error);
  }
}

function euclideanDistance(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

// Object detection via Cloudflare Workers AI
async function detectObjects(imageBuffer: Buffer): Promise<string[]> {
  if (!CLOUDFLARE_WORKER_URL) {
    console.log('Cloudflare Worker URL not configured, skipping object detection');
    return [];
  }

  try {
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/detect-objects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_AI_TOKEN || ''}`,
      },
      body: new Uint8Array(imageBuffer),
    });

    if (!response.ok) {
      console.error('Object detection API error:', response.status);
      return [];
    }

    const result = await response.json();
    const labels = result.labels || [];

    // Add contextual labels
    const contextualLabels = addContextualLabels(labels);
    return [...labels, ...contextualLabels].slice(0, 20);
  } catch (error) {
    console.error('Object detection error:', error);
    return [];
  }
}

function addContextualLabels(detectedObjects: string[]): string[] {
  const contextual: string[] = [];
  const has = (obj: string) => detectedObjects.includes(obj);
  const hasAny = (objs: string[]) => detectedObjects.some((o) => objs.includes(o));

  // People
  if (has('person')) contextual.push('people', 'portrait');

  // Animals
  if (has('dog') || has('cat')) contextual.push('pet', 'animal');
  if (has('bird')) contextual.push('nature', 'wildlife');
  if (has('horse') || has('cow') || has('sheep')) contextual.push('animal', 'rural', 'countryside');

  // Vehicles & transport
  if (hasAny(['car', 'truck', 'motorcycle'])) contextual.push('vehicle', 'transportation');
  if (has('airplane')) contextual.push('travel', 'aviation');
  if (has('boat')) contextual.push('water', 'marine');
  if (has('bicycle')) contextual.push('sports', 'outdoor');
  if (has('bus') || has('train')) contextual.push('public_transport', 'city');

  // Landscape & nature
  if (hasAny(['tree', 'potted plant', 'flower'])) contextual.push('nature', 'plants');
  if (hasAny(['mountain', 'hill', 'cliff', 'rock'])) contextual.push('landscape', 'hills', 'outdoor');
  if (hasAny(['grass', 'field', 'meadow'])) contextual.push('meadow', 'green', 'outdoor');
  if (hasAny(['river', 'lake', 'pond', 'waterfall'])) contextual.push('water', 'nature');
  if (hasAny(['forest', 'woods'])) contextual.push('forest', 'nature');
  if (hasAny(['sky', 'cloud', 'sunset', 'sunrise'])) contextual.push('sky', 'outdoor');
  if (hasAny(['snow', 'ice'])) contextual.push('winter', 'cold');

  // Urban & architecture
  if (hasAny(['building', 'house', 'apartment'])) contextual.push('architecture', 'urban');
  if (hasAny(['skyscraper', 'tower', 'high-rise'])) contextual.push('city', 'tall_building', 'modern_architecture');
  if (hasAny(['church', 'castle', 'monument', 'statue', 'fountain'])) contextual.push('old_architecture', 'landmark', 'historic');
  if (hasAny(['bridge', 'road', 'street', 'sidewalk'])) contextual.push('urban', 'city');
  if (hasAny(['construction', 'crane'])) contextual.push('construction', 'modern_architecture');

  // Food & dining
  if (hasAny(['apple', 'orange', 'banana', 'sandwich', 'pizza', 'cake'])) contextual.push('food');
  if (hasAny(['wine glass', 'cup', 'bottle'])) contextual.push('drink');

  // Technology & indoor
  if (hasAny(['laptop', 'keyboard', 'mouse', 'cell phone', 'tv'])) contextual.push('technology');
  if (hasAny(['chair', 'couch', 'bed', 'dining table'])) contextual.push('indoor', 'furniture');

  // Sports & activities
  if (hasAny(['sports ball', 'tennis racket', 'skateboard', 'surfboard', 'ski'])) contextual.push('sport', 'active');

  return [...new Set(contextual)];
}

function detectSceneType(labels: string[]): string {
  const combined = labels.map((s) => s.toLowerCase());
  const hasAny = (terms: string[]) => combined.some((l) => terms.includes(l));

  if (hasAny(['beach', 'ocean', 'sand', 'surfboard'])) return 'beach';
  if (hasAny(['mountain', 'hiking', 'cliff', 'hills'])) return 'mountain';
  if (hasAny(['cake', 'candle', 'balloon', 'party'])) return 'birthday';
  if (hasAny(['wine', 'dinner', 'restaurant', 'food', 'pizza'])) return 'dining';
  if (combined.filter((l) => l === 'person').length >= 3) return 'group_photo';
  if (hasAny(['dog', 'cat', 'pet', 'animal'])) return 'pets';
  if (hasAny(['car', 'truck', 'vehicle'])) return 'automotive';
  if (hasAny(['skyscraper', 'tall_building', 'city'])) return 'cityscape';
  if (hasAny(['church', 'castle', 'old_architecture', 'monument'])) return 'historic';
  if (hasAny(['meadow', 'field', 'grass', 'green'])) return 'countryside';
  if (hasAny(['forest', 'woods'])) return 'forest';
  if (hasAny(['river', 'lake', 'waterfall'])) return 'waterscape';
  if (hasAny(['sport', 'active', 'sports ball'])) return 'sports';
  if (hasAny(['nature', 'tree', 'flower', 'plants'])) return 'nature';

  return 'general';
}

/**
 * Analyze rich scene attributes from labels, EXIF data, and image properties.
 * This powers natural-language searches like "moderna zgrada", "livada", "veče".
 */
function analyzeSceneAttributes(
  labels: string[],
  dominantColors: string[],
  exifData: { takenAt?: Date } | null,
  imageStats: { brightness: number } | null
): Record<string, any> {
  const combined = new Set(labels.map((s) => s.toLowerCase()));
  const attrs: Record<string, any> = {};

  // --- Landscape ---
  const landscape: string[] = [];
  if (combined.has('hills') || combined.has('mountain') || combined.has('cliff')) landscape.push('hills');
  if (combined.has('meadow') || combined.has('field') || combined.has('grass')) landscape.push('meadow');
  if (combined.has('forest') || combined.has('woods')) landscape.push('forest');
  if (combined.has('river') || combined.has('lake') || combined.has('water')) landscape.push('water');
  if (combined.has('beach') || combined.has('ocean') || combined.has('sand')) landscape.push('sea');
  if (landscape.length > 0) attrs.landscape = landscape;

  // --- Urban ---
  const urban: string[] = [];
  if (combined.has('city') || combined.has('urban') || combined.has('street')) urban.push('city');
  if (combined.has('tall_building') || combined.has('skyscraper')) urban.push('skyscraper');
  if (combined.has('bridge')) urban.push('bridge');
  if (combined.has('architecture') || combined.has('building')) urban.push('building');
  if (urban.length > 0) attrs.urban = urban;

  // --- Architecture style ---
  if (combined.has('modern_architecture') || combined.has('skyscraper') || combined.has('construction')) {
    attrs.architecture = 'modern';
  } else if (combined.has('old_architecture') || combined.has('historic') || combined.has('castle') || combined.has('church')) {
    attrs.architecture = 'old';
  } else if (combined.has('rural') || combined.has('countryside')) {
    attrs.architecture = 'rural';
  }

  // --- Indoor/outdoor ---
  attrs.indoor = combined.has('indoor') || combined.has('furniture');

  // --- Time of day (from EXIF timestamp or image brightness) ---
  if (exifData?.takenAt) {
    const hour = exifData.takenAt.getHours();
    if (hour >= 5 && hour < 7) attrs.timeOfDay = 'dawn';
    else if (hour >= 7 && hour < 12) attrs.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) attrs.timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 20) attrs.timeOfDay = 'evening';
    else attrs.timeOfDay = 'night';
  } else if (imageStats) {
    // Infer from brightness: very dark → night, very bright → daytime
    if (imageStats.brightness < 40) attrs.timeOfDay = 'night';
    else if (imageStats.brightness < 80) attrs.timeOfDay = 'evening';
    else if (imageStats.brightness > 180) attrs.timeOfDay = 'morning';
    else attrs.timeOfDay = 'afternoon';
  }

  // --- Season (from date) ---
  if (exifData?.takenAt) {
    const month = exifData.takenAt.getMonth();
    if (month >= 2 && month <= 4) attrs.season = 'spring';
    else if (month >= 5 && month <= 7) attrs.season = 'summer';
    else if (month >= 8 && month <= 10) attrs.season = 'autumn';
    else attrs.season = 'winter';
  }

  // --- Weather (from labels + colors) ---
  if (combined.has('snow') || combined.has('ice')) attrs.weather = 'snowy';
  else if (combined.has('cloud') || combined.has('overcast')) attrs.weather = 'cloudy';
  else if (combined.has('rain') || combined.has('umbrella')) attrs.weather = 'rainy';
  else if (combined.has('sun') || combined.has('sunny')) attrs.weather = 'sunny';

  // --- Activity ---
  const activity: string[] = [];
  if (combined.has('sport') || combined.has('active')) activity.push('sport');
  if (combined.has('food') || combined.has('drink')) activity.push('food');
  if (combined.has('travel') || combined.has('aviation')) activity.push('travel');
  if (combined.has('party') || combined.has('birthday')) activity.push('celebration');
  if (activity.length > 0) attrs.activity = activity;

  return attrs;
}

async function generateThumbnails(
  imageBuffer: Buffer,
  originalKey: string
): Promise<{ small: string; medium: string; large: string }> {
  const keyParts = originalKey.split('/');
  const userId = keyParts[1];
  const fileId = keyParts[keyParts.length - 1].split('.')[0];

  const sizes = [
    { name: 'small' as const, ...THUMBNAIL_SIZES.small, suffix: '_sm', quality: 75 },
    { name: 'medium' as const, ...THUMBNAIL_SIZES.medium, suffix: '_thumb', quality: 80 },
    { name: 'large' as const, ...THUMBNAIL_SIZES.large, suffix: '_lg', quality: 82 },
  ];

  const results = await Promise.all(
    sizes.map(async ({ name, width, height, suffix, quality }) => {
      const buffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'centre',
        })
        .webp({ quality })
        .toBuffer();

      const key = `users/${userId}/thumbnails/${fileId}${suffix}.webp`;
      await uploadToS3(buffer, key, 'image/webp');
      return { name, key };
    })
  );

  return {
    small: results.find((r) => r.name === 'small')!.key,
    medium: results.find((r) => r.name === 'medium')!.key,
    large: results.find((r) => r.name === 'large')!.key,
  };
}

async function calculateQualityScore(imageBuffer: Buffer): Promise<number> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    let score = 50;

    const pixels = (metadata.width || 0) * (metadata.height || 0);
    if (pixels >= 8294400) score += 20;
    else if (pixels >= 2073600) score += 15;
    else if (pixels >= 921600) score += 10;
    else if (pixels >= 307200) score += 5;

    const sharpness =
      stats.channels.reduce((sum, ch) => sum + (ch.stdev || 0), 0) / stats.channels.length;

    if (sharpness > 60) score += 15;
    else if (sharpness > 40) score += 10;
    else if (sharpness > 20) score += 5;

    const meanBrightness =
      stats.channels.reduce((sum, ch) => sum + (ch.mean || 0), 0) / stats.channels.length;
    if (meanBrightness > 40 && meanBrightness < 220) score += 10;
    else if (meanBrightness > 20 && meanBrightness < 240) score += 5;

    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Quality score calculation error:', error);
    return 50;
  }
}

async function extractDominantColors(imageBuffer: Buffer): Promise<string[]> {
  try {
    const smallImage = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = smallImage;
    const pixels: { r: number; g: number; b: number }[] = [];

    for (let i = 0; i < data.length; i += info.channels) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }

    const colors = kMeansColors(pixels, 5);
    return colors.map((c) => rgbToHex(c.r, c.g, c.b));
  } catch (error) {
    console.error('Color extraction error:', error);
    return [];
  }
}

function kMeansColors(
  pixels: { r: number; g: number; b: number }[],
  k: number
): { r: number; g: number; b: number }[] {
  const centroids = pixels.sort(() => Math.random() - 0.5).slice(0, k);

  for (let iter = 0; iter < 10; iter++) {
    const clusters: { r: number; g: number; b: number }[][] = Array(k)
      .fill(null)
      .map(() => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      clusters[closestIdx].push(pixel);
    }

    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        centroids[i] = {
          r: Math.round(clusters[i].reduce((s, p) => s + p.r, 0) / clusters[i].length),
          g: Math.round(clusters[i].reduce((s, p) => s + p.g, 0) / clusters[i].length),
          b: Math.round(clusters[i].reduce((s, p) => s + p.b, 0) / clusters[i].length),
        };
      }
    }
  }

  return centroids;
}

function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Export AI modules
export * from './ai/exif-extractor';
export * from './ai/face-detection';
export * from './ai/duplicate-detection';
export * from './ai/memories';
