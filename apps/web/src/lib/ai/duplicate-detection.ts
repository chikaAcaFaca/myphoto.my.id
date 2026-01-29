import sharp from 'sharp';

/**
 * Perceptual Hash (pHash) implementation for duplicate detection
 * pHash is robust against:
 * - Resizing
 * - Minor color adjustments
 * - Compression artifacts
 * - Small rotations/crops
 */

// Calculate pHash for an image
export async function calculatePHash(imageBuffer: Buffer): Promise<string> {
  try {
    // 1. Resize to 32x32 (larger than final hash for DCT)
    const resized = await sharp(imageBuffer)
      .resize(32, 32, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // 2. Convert to 2D array
    const pixels: number[][] = [];
    for (let y = 0; y < 32; y++) {
      const row: number[] = [];
      for (let x = 0; x < 32; x++) {
        row.push(resized[y * 32 + x]);
      }
      pixels.push(row);
    }

    // 3. Apply DCT (Discrete Cosine Transform)
    const dctResult = dct2d(pixels);

    // 4. Take top-left 8x8 (low frequencies)
    const lowFreq: number[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (x === 0 && y === 0) continue; // Skip DC component
        lowFreq.push(dctResult[y][x]);
      }
    }

    // 5. Calculate median
    const sorted = [...lowFreq].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // 6. Generate hash (1 if > median, 0 otherwise)
    let hash = '';
    for (const val of lowFreq) {
      hash += val > median ? '1' : '0';
    }

    // Pad to 64 bits
    while (hash.length < 64) {
      hash = '0' + hash;
    }

    return hash;
  } catch (error) {
    console.error('pHash calculation error:', error);
    throw error;
  }
}

// DCT-II implementation
function dct1d(input: number[]): number[] {
  const N = input.length;
  const output: number[] = new Array(N);

  for (let k = 0; k < N; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    }
    output[k] = sum * Math.sqrt(2 / N) * (k === 0 ? 1 / Math.sqrt(2) : 1);
  }

  return output;
}

function dct2d(input: number[][]): number[][] {
  const N = input.length;
  const temp: number[][] = [];

  // Apply DCT to rows
  for (let i = 0; i < N; i++) {
    temp.push(dct1d(input[i]));
  }

  // Apply DCT to columns
  const output: number[][] = [];
  for (let i = 0; i < N; i++) {
    const column: number[] = [];
    for (let j = 0; j < N; j++) {
      column.push(temp[j][i]);
    }
    const dctColumn = dct1d(column);
    for (let j = 0; j < N; j++) {
      if (!output[j]) output[j] = [];
      output[j][i] = dctColumn[j];
    }
  }

  return output;
}

// Calculate Hamming distance between two hashes
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hash lengths must match');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }

  return distance;
}

// Check if two images are similar
export function areSimilar(
  hash1: string,
  hash2: string,
  threshold = 10
): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}

// Calculate similarity percentage
export function similarityPercentage(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  return ((hash1.length - distance) / hash1.length) * 100;
}

// Average Hash (aHash) - simpler, faster, less accurate
export async function calculateAHash(imageBuffer: Buffer): Promise<string> {
  const resized = await sharp(imageBuffer)
    .resize(8, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  // Calculate average
  const avg = resized.reduce((sum, val) => sum + val, 0) / resized.length;

  // Generate hash
  let hash = '';
  for (const val of resized) {
    hash += val > avg ? '1' : '0';
  }

  return hash;
}

// Difference Hash (dHash) - good for finding similar images
export async function calculateDHash(imageBuffer: Buffer): Promise<string> {
  const resized = await sharp(imageBuffer)
    .resize(9, 8, { fit: 'fill' }) // 9 wide to get 8 differences
    .grayscale()
    .raw()
    .toBuffer();

  let hash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = resized[y * 9 + x];
      const right = resized[y * 9 + x + 1];
      hash += left > right ? '1' : '0';
    }
  }

  return hash;
}

// Find duplicates in a list of files
export interface DuplicateGroup {
  files: Array<{
    fileId: string;
    hash: string;
  }>;
  similarity: number;
}

export function findDuplicates(
  files: Array<{ fileId: string; hash: string }>,
  threshold = 10
): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    if (processed.has(files[i].fileId)) continue;

    const group: DuplicateGroup = {
      files: [files[i]],
      similarity: 100,
    };

    for (let j = i + 1; j < files.length; j++) {
      if (processed.has(files[j].fileId)) continue;

      const distance = hammingDistance(files[i].hash, files[j].hash);
      if (distance <= threshold) {
        group.files.push(files[j]);
        group.similarity = Math.min(
          group.similarity,
          similarityPercentage(files[i].hash, files[j].hash)
        );
        processed.add(files[j].fileId);
      }
    }

    if (group.files.length > 1) {
      processed.add(files[i].fileId);
      groups.push(group);
    }
  }

  return groups;
}

// Compare two specific images
export async function compareImages(
  image1Buffer: Buffer,
  image2Buffer: Buffer
): Promise<{
  pHashSimilarity: number;
  aHashSimilarity: number;
  dHashSimilarity: number;
  averageSimilarity: number;
  areDuplicates: boolean;
}> {
  const [pHash1, pHash2, aHash1, aHash2, dHash1, dHash2] = await Promise.all([
    calculatePHash(image1Buffer),
    calculatePHash(image2Buffer),
    calculateAHash(image1Buffer),
    calculateAHash(image2Buffer),
    calculateDHash(image1Buffer),
    calculateDHash(image2Buffer),
  ]);

  const pHashSimilarity = similarityPercentage(pHash1, pHash2);
  const aHashSimilarity = similarityPercentage(aHash1, aHash2);
  const dHashSimilarity = similarityPercentage(dHash1, dHash2);

  const averageSimilarity = (pHashSimilarity + aHashSimilarity + dHashSimilarity) / 3;

  return {
    pHashSimilarity,
    aHashSimilarity,
    dHashSimilarity,
    averageSimilarity,
    areDuplicates: averageSimilarity >= 90, // 90% similar = likely duplicates
  };
}
