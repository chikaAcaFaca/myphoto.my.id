import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Estimate photo quality based on resolution.
 * Returns score 0-100.
 * Higher resolution = higher quality.
 */
export async function scorePhotoQuality(localUri: string): Promise<number> {
  try {
    // Get original dimensions
    const info = await ImageManipulator.manipulateAsync(
      localUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG }
    );

    const megapixels = (info.width * info.height) / 1_000_000;

    // Score based on resolution
    // < 1 MP = low quality (30)
    // 1-4 MP = decent (50-70)
    // 4-12 MP = good (70-85)
    // > 12 MP = excellent (85-100)
    if (megapixels < 0.5) return 20;
    if (megapixels < 1) return 35;
    if (megapixels < 2) return 50;
    if (megapixels < 4) return 65;
    if (megapixels < 8) return 75;
    if (megapixels < 12) return 85;
    return 95;
  } catch (error) {
    console.log('Quality scoring error:', error);
    return 50; // default
  }
}
