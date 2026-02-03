/**
 * Face Detection module
 * Uses Cloudflare Workers AI for server-side processing
 */

export interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    positions: { x: number; y: number }[];
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  descriptor: number[]; // 128-dimensional face embedding
  confidence: number;
  age?: number;
  gender?: string;
  expression?: string;
}

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_AI_WORKER_URL;

export async function detectFaces(imageBuffer: Buffer): Promise<FaceDetection[]> {
  if (!CLOUDFLARE_WORKER_URL) {
    console.log('Cloudflare Worker URL not configured, skipping face detection');
    return [];
  }

  try {
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/detect-faces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${process.env.CLOUDFLARE_AI_TOKEN || ''}`,
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      console.error('Face detection API error:', response.status);
      return [];
    }

    const result = await response.json();
    return result.faces || [];
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

// Face matching and grouping (runs locally, no native deps needed)

export interface Person {
  id: string;
  name?: string;
  descriptors: number[][];
  fileIds: string[];
  representativeDescriptor: number[];
}

const SIMILARITY_THRESHOLD = 0.6;

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

export function averageDescriptor(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];

  const length = descriptors[0].length;
  const result = new Array(length).fill(0);

  for (const descriptor of descriptors) {
    for (let i = 0; i < length; i++) {
      result[i] += descriptor[i];
    }
  }

  return result.map((v) => v / descriptors.length);
}

export function findMatchingPerson(
  descriptor: number[],
  people: Person[]
): Person | null {
  let bestMatch: Person | null = null;
  let bestDistance = Infinity;

  for (const person of people) {
    const distance = euclideanDistance(descriptor, person.representativeDescriptor);
    if (distance < SIMILARITY_THRESHOLD && distance < bestDistance) {
      bestMatch = person;
      bestDistance = distance;
    }
  }

  return bestMatch;
}

export function groupFacesByPerson(
  faces: Array<{ fileId: string; descriptor: number[] }>
): Person[] {
  const people: Person[] = [];

  for (const face of faces) {
    const matchingPerson = findMatchingPerson(face.descriptor, people);

    if (matchingPerson) {
      matchingPerson.descriptors.push(face.descriptor);
      matchingPerson.fileIds.push(face.fileId);
      matchingPerson.representativeDescriptor = averageDescriptor(
        matchingPerson.descriptors
      );
    } else {
      const newPerson: Person = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        descriptors: [face.descriptor],
        fileIds: [face.fileId],
        representativeDescriptor: face.descriptor,
      };
      people.push(newPerson);
    }
  }

  return people;
}

export function mergePeople(person1: Person, person2: Person): Person {
  return {
    id: person1.id,
    name: person1.name || person2.name,
    descriptors: [...person1.descriptors, ...person2.descriptors],
    fileIds: [...person1.fileIds, ...person2.fileIds],
    representativeDescriptor: averageDescriptor([
      ...person1.descriptors,
      ...person2.descriptors,
    ]),
  };
}

export async function extractFaceThumbnail(
  imageBuffer: Buffer,
  boundingBox: { x: number; y: number; width: number; height: number },
  padding = 0.3
): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(imageBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  const paddingX = boundingBox.width * padding;
  const paddingY = boundingBox.height * padding;

  const left = Math.max(0, Math.round(boundingBox.x - paddingX));
  const top = Math.max(0, Math.round(boundingBox.y - paddingY));
  const width = Math.min(
    metadata.width - left,
    Math.round(boundingBox.width + paddingX * 2)
  );
  const height = Math.min(
    metadata.height - top,
    Math.round(boundingBox.height + paddingY * 2)
  );

  return sharp(imageBuffer)
    .extract({ left, top, width, height })
    .resize(150, 150, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
}
