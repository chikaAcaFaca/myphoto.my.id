import * as faceapi from '@vladmandic/face-api';
import * as tf from '@tensorflow/tfjs-node';
import * as canvas from 'canvas';
import path from 'path';

// Polyfill for face-api.js in Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any);

let modelsLoaded = false;
const MODELS_PATH = path.join(process.cwd(), 'public', 'models', 'face-api');

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

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    // Load models from disk
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_PATH);
    // Optional: age/gender/expression models
    // await faceapi.nets.ageGenderNet.loadFromDisk(MODELS_PATH);
    // await faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_PATH);

    modelsLoaded = true;
    console.log('Face detection models loaded successfully');
  } catch (error) {
    console.error('Failed to load face detection models:', error);
    throw error;
  }
}

export async function detectFaces(imageBuffer: Buffer): Promise<FaceDetection[]> {
  try {
    await loadFaceModels();

    // Create canvas from buffer
    const img = await canvas.loadImage(imageBuffer);
    const canvasEl = canvas.createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detect faces with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(canvasEl as any)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map((detection) => ({
      boundingBox: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      landmarks: {
        positions: detection.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
        leftEye: getCenter(detection.landmarks.getLeftEye()),
        rightEye: getCenter(detection.landmarks.getRightEye()),
        nose: getCenter(detection.landmarks.getNose()),
        mouth: getCenter(detection.landmarks.getMouth()),
      },
      descriptor: Array.from(detection.descriptor),
      confidence: detection.detection.score,
    }));
  } catch (error) {
    console.error('Face detection error:', error);
    return [];
  }
}

function getCenter(points: faceapi.Point[]): { x: number; y: number } {
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

// Face matching and grouping

export interface Person {
  id: string;
  name?: string;
  descriptors: number[][];
  fileIds: string[];
  representativeDescriptor: number[];
}

const SIMILARITY_THRESHOLD = 0.6; // Lower = more strict matching

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
      // Add to existing person
      matchingPerson.descriptors.push(face.descriptor);
      matchingPerson.fileIds.push(face.fileId);
      // Update representative descriptor
      matchingPerson.representativeDescriptor = averageDescriptor(
        matchingPerson.descriptors
      );
    } else {
      // Create new person
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

// Merge two people (when user confirms they're the same person)
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

// Extract face thumbnail
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

  // Add padding around face
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
