import FaceDetection, { FaceDetectorContourMode, FaceDetectorLandmarkMode, FaceDetectorPerformanceMode } from '@react-native-ml-kit/face-detection';
import * as ImageManipulator from 'expo-image-manipulator';

export interface LocalFaceData {
  x: number;
  y: number;
  width: number;
  height: number;
  smilingProbability: number | null;
  leftEyeOpenProbability: number | null;
  rightEyeOpenProbability: number | null;
}

/**
 * Detect faces in an image using Google ML Kit.
 * Uses performance mode for speed over accuracy.
 */
export async function detectFacesLocal(localUri: string): Promise<LocalFaceData[]> {
  try {
    // Resize for faster processing
    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 640 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
    );

    const faces = await FaceDetection.detect(resized.uri, {
      performanceMode: FaceDetectorPerformanceMode.FAST,
      landmarkMode: FaceDetectorLandmarkMode.NONE,
      contourMode: FaceDetectorContourMode.NONE,
    });

    return faces.map((face) => ({
      x: face.frame.left,
      y: face.frame.top,
      width: face.frame.width,
      height: face.frame.height,
      smilingProbability: face.smilingProbability ?? null,
      leftEyeOpenProbability: face.leftEyeOpenProbability ?? null,
      rightEyeOpenProbability: face.rightEyeOpenProbability ?? null,
    }));
  } catch (error) {
    console.log('ML Kit face detection error:', error);
    return [];
  }
}

/**
 * Determine if a photo is likely a selfie based on face data and camera info.
 */
export function isSelfie(faces: LocalFaceData[], imageWidth: number): boolean {
  if (faces.length !== 1) return false;
  const face = faces[0];
  // Face takes up > 15% of image width = likely selfie
  return face.width / imageWidth > 0.15;
}
