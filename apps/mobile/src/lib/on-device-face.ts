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
 * Detect faces in an image.
 * Currently disabled — ML Kit native modules not available in Expo managed workflow.
 */
export async function detectFacesLocal(_localUri: string): Promise<LocalFaceData[]> {
  return [];
}

/**
 * Determine if a photo is likely a selfie based on face data and camera info.
 */
export function isSelfie(faces: LocalFaceData[], imageWidth: number): boolean {
  if (faces.length !== 1) return false;
  const face = faces[0];
  return face.width / imageWidth > 0.15;
}
