import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { WASABI_REGION, WASABI_ENDPOINT, THUMBNAIL_SIZES } from '@myphoto/shared';
import { initAdmin, db } from './firebase-admin';
import { generateUploadUrl } from './s3';
import { extractExifData, type ExifData } from './ai/exif-extractor';
import { detectFaces, type FaceDetection } from './ai/face-detection';
import { calculatePHash } from './ai/duplicate-detection';

// Initialize TensorFlow model (cached)
let cocoModel: cocoSsd.ObjectDetection | null = null;

async function getCocoModel(): Promise<cocoSsd.ObjectDetection> {
  if (!cocoModel) {
    cocoModel = await cocoSsd.load();
  }
  return cocoModel;
}

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

const BUCKET_NAME = process.env.WASABI_BUCKET || 'myphoto-prod';

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
    body: buffer,
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

    // Process in parallel for better performance
    const [
      exifData,
      labels,
      faces,
      thumbnail,
      qualityScore,
      dominantColors,
      pHash,
    ] = await Promise.all([
      extractExifData(imageBuffer),
      detectObjects(imageBuffer),
      detectFacesFromBuffer(imageBuffer),
      generateThumbnail(imageBuffer, s3Key),
      calculateQualityScore(imageBuffer),
      extractDominantColors(imageBuffer),
      calculatePHash(imageBuffer),
    ]);

    // Detect scene type based on labels
    const sceneType = detectSceneType(labels);

    // Prepare update data
    const updateData: Record<string, any> = {
      width,
      height,
      labels,
      thumbnailKey: thumbnail.key,
      qualityScore,
      dominantColors,
      pHash,
      sceneType,
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

    // Add face data if detected
    if (faces.length > 0) {
      updateData.faces = faces.map((f) => ({
        boundingBox: f.boundingBox,
        confidence: f.confidence,
        descriptor: f.descriptor,
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
      thumbnailKey: thumbnail.key,
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
          person.faceEmbedding || []
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

// Import admin for FieldValue
import * as admin from 'firebase-admin';

async function detectObjects(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Convert buffer to tensor
    const decoded = tf.node.decodeImage(imageBuffer, 3);
    const batched = decoded.expandDims(0);

    // Load model and detect
    const model = await getCocoModel();
    const predictions = await model.detect(batched as tf.Tensor3D);

    // Clean up tensors
    decoded.dispose();
    batched.dispose();

    // Extract unique labels with confidence > 0.5
    const labels = [
      ...new Set(
        predictions.filter((p) => p.score > 0.5).map((p) => p.class.toLowerCase())
      ),
    ];

    // Add additional contextual labels based on detected objects
    const contextualLabels = addContextualLabels(labels);

    return [...labels, ...contextualLabels].slice(0, 20); // Limit to 20 labels
  } catch (error) {
    console.error('Object detection error:', error);
    return [];
  }
}

function addContextualLabels(detectedObjects: string[]): string[] {
  const contextual: string[] = [];

  // Add context based on detected objects
  if (detectedObjects.includes('person')) {
    contextual.push('people', 'portrait');
  }
  if (detectedObjects.includes('dog') || detectedObjects.includes('cat')) {
    contextual.push('pet', 'animal');
  }
  if (
    detectedObjects.includes('car') ||
    detectedObjects.includes('truck') ||
    detectedObjects.includes('motorcycle')
  ) {
    contextual.push('vehicle', 'transportation');
  }
  if (detectedObjects.includes('airplane')) {
    contextual.push('travel', 'aviation');
  }
  if (detectedObjects.includes('boat')) {
    contextual.push('water', 'marine');
  }
  if (detectedObjects.includes('bicycle')) {
    contextual.push('sports', 'outdoor');
  }
  if (detectedObjects.includes('bird')) {
    contextual.push('nature', 'wildlife');
  }
  if (
    detectedObjects.some((o) =>
      ['apple', 'orange', 'banana', 'sandwich', 'pizza', 'cake'].includes(o)
    )
  ) {
    contextual.push('food');
  }
  if (
    detectedObjects.some((o) =>
      ['laptop', 'keyboard', 'mouse', 'cell phone', 'tv'].includes(o)
    )
  ) {
    contextual.push('technology');
  }
  if (
    detectedObjects.some((o) =>
      ['chair', 'couch', 'bed', 'dining table'].includes(o)
    )
  ) {
    contextual.push('indoor', 'furniture');
  }
  if (
    detectedObjects.some((o) => ['tree', 'potted plant', 'flower'].includes(o))
  ) {
    contextual.push('nature', 'plants');
  }

  return [...new Set(contextual)];
}

function detectSceneType(labels: string[]): string {
  const combined = labels.map((s) => s.toLowerCase());

  if (
    combined.some((l) => ['beach', 'ocean', 'sand', 'surfboard'].includes(l))
  ) {
    return 'beach';
  }
  if (
    combined.some((l) => ['mountain', 'hiking', 'cliff', 'snow'].includes(l))
  ) {
    return 'mountain';
  }
  if (
    combined.some((l) => ['cake', 'candle', 'balloon', 'party'].includes(l))
  ) {
    return 'birthday';
  }
  if (
    combined.some((l) =>
      ['wine', 'dinner', 'restaurant', 'food', 'pizza'].includes(l)
    )
  ) {
    return 'dining';
  }
  if (combined.filter((l) => l === 'person').length >= 3) {
    return 'group_photo';
  }
  if (combined.some((l) => ['dog', 'cat', 'pet', 'animal'].includes(l))) {
    return 'pets';
  }
  if (combined.some((l) => ['car', 'truck', 'vehicle'].includes(l))) {
    return 'automotive';
  }
  if (combined.some((l) => ['nature', 'tree', 'flower', 'plants'].includes(l))) {
    return 'nature';
  }

  return 'general';
}

async function generateThumbnail(
  imageBuffer: Buffer,
  originalKey: string
): Promise<{ key: string; buffer: Buffer }> {
  const { width, height } = THUMBNAIL_SIZES.medium;

  // Generate thumbnail using Sharp
  const thumbnailBuffer = await sharp(imageBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 80 })
    .toBuffer();

  // Generate thumbnail key
  const keyParts = originalKey.split('/');
  const userId = keyParts[1];
  const fileId = keyParts[keyParts.length - 1].split('.')[0];
  const thumbnailKey = `users/${userId}/thumbnails/${fileId}_thumb.webp`;

  // Upload thumbnail to S3
  await uploadToS3(thumbnailBuffer, thumbnailKey, 'image/webp');

  return {
    key: thumbnailKey,
    buffer: thumbnailBuffer,
  };
}

async function calculateQualityScore(imageBuffer: Buffer): Promise<number> {
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const stats = await image.stats();

    // Factors for quality score
    let score = 50; // Base score

    // Resolution factor (higher is better, up to 4K)
    const pixels = (metadata.width || 0) * (metadata.height || 0);
    if (pixels >= 8294400) score += 20; // 4K
    else if (pixels >= 2073600) score += 15; // 1080p
    else if (pixels >= 921600) score += 10; // 720p
    else if (pixels >= 307200) score += 5; // VGA

    // Sharpness estimate based on channel statistics
    const sharpness =
      stats.channels.reduce((sum, ch) => {
        return sum + (ch.stdev || 0);
      }, 0) / stats.channels.length;

    if (sharpness > 60) score += 15;
    else if (sharpness > 40) score += 10;
    else if (sharpness > 20) score += 5;

    // Brightness/exposure check
    const meanBrightness =
      stats.channels.reduce((sum, ch) => sum + (ch.mean || 0), 0) /
      stats.channels.length;
    if (meanBrightness > 40 && meanBrightness < 220) score += 10; // Well exposed
    else if (meanBrightness > 20 && meanBrightness < 240) score += 5; // Acceptable

    // Clamp score between 0 and 100
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('Quality score calculation error:', error);
    return 50; // Default score
  }
}

async function extractDominantColors(imageBuffer: Buffer): Promise<string[]> {
  try {
    // Resize to small size for faster processing
    const smallImage = await sharp(imageBuffer)
      .resize(100, 100, { fit: 'inside' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = smallImage;
    const pixels: { r: number; g: number; b: number }[] = [];

    // Extract pixels
    for (let i = 0; i < data.length; i += info.channels) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }

    // Simple k-means clustering for dominant colors
    const colors = kMeansColors(pixels, 5);

    // Convert to hex
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
  // Initialize centroids randomly
  const centroids = pixels.sort(() => Math.random() - 0.5).slice(0, k);

  // Run k-means iterations
  for (let iter = 0; iter < 10; iter++) {
    // Assign pixels to nearest centroid
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

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        centroids[i] = {
          r: Math.round(
            clusters[i].reduce((s, p) => s + p.r, 0) / clusters[i].length
          ),
          g: Math.round(
            clusters[i].reduce((s, p) => s + p.g, 0) / clusters[i].length
          ),
          b: Math.round(
            clusters[i].reduce((s, p) => s + p.b, 0) / clusters[i].length
          ),
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
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
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
