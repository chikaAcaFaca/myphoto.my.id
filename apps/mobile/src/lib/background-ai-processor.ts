import * as MediaLibrary from 'expo-media-library';
import { classifyImage, detectSceneType, isScreenshot } from './on-device-ai';
import { detectFacesLocal } from './on-device-face';
import { extractText } from './on-device-ocr';
import { scorePhotoQuality } from './on-device-quality';
import { upsertLocalPhoto, isIndexed, getIndexedCount } from './local-search-index';

const BATCH_SIZE = 5;
const DELAY_BETWEEN_MS = 200;

export interface AiProcessingStatus {
  totalOnDevice: number;
  indexed: number;
  processing: boolean;
}

/**
 * Process unindexed photos on device using ML Kit.
 * Runs in batches to avoid blocking UI and overheating.
 * Returns number of newly processed photos.
 */
export async function processUnindexedPhotos(
  onProgress?: (processed: number, total: number) => void
): Promise<number> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (status !== 'granted') return 0;
  } catch {
    console.log('MediaLibrary not available for AI processing');
    return 0;
  }

  // Get recent photos from device
  const { assets } = await MediaLibrary.getAssetsAsync({
    mediaType: ['photo'],
    sortBy: [MediaLibrary.SortBy.creationTime],
    first: 200,
  });

  // Filter out already indexed
  const unindexed: MediaLibrary.Asset[] = [];
  for (const asset of assets) {
    if (!(await isIndexed(asset.id))) {
      unindexed.push(asset);
    }
  }

  if (unindexed.length === 0) return 0;

  let processed = 0;

  // Process in batches
  for (let i = 0; i < unindexed.length; i += BATCH_SIZE) {
    const batch = unindexed.slice(i, i + BATCH_SIZE);

    for (const asset of batch) {
      try {
        // Get asset info with local URI
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        const localUri = assetInfo.localUri || asset.uri;

        // Classify with ML Kit
        const labels = await classifyImage(localUri);
        const sceneType = detectSceneType(labels);
        const screenshot = isScreenshot(asset.filename);

        // Face detection (only if labels suggest people)
        let faceCount = 0;
        const labelSet = new Set(labels.map((l) => l.label.toLowerCase()));
        if (labelSet.has('person') || labelSet.has('people') || labelSet.has('face') || labelSet.has('selfie')) {
          try {
            const faces = await detectFacesLocal(localUri);
            faceCount = faces.length;
          } catch {
            // Face detection not available
          }
        }

        // OCR for screenshots and documents
        let ocrText = '';
        const finalSceneType = screenshot ? 'screenshot' : (faceCount > 0 && sceneType === 'other' ? 'people' : sceneType);
        if (finalSceneType === 'screenshot' || finalSceneType === 'document') {
          try {
            const ocr = await extractText(localUri);
            ocrText = ocr.text.slice(0, 500); // limit stored text
          } catch {
            // OCR not available
          }
        }

        // Quality scoring
        let qualityScore = 50;
        try {
          qualityScore = await scorePhotoQuality(localUri);
        } catch {
          // Quality scoring failed
        }

        // Store in local index
        await upsertLocalPhoto({
          assetId: asset.id,
          labels: labels.map((l) => l.label).join(', '),
          sceneType: finalSceneType,
          faceCount,
          isScreenshot: screenshot,
          ocrText,
          qualityScore,
          createdAt: asset.creationTime,
          syncedToCloud: false,
          cloudFileId: null,
        });

        processed++;
        onProgress?.(processed, unindexed.length);
      } catch (error) {
        console.log(`AI processing failed for ${asset.filename}:`, error);
      }
    }

    // Delay between batches to prevent overheating
    if (i + BATCH_SIZE < unindexed.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_MS));
    }
  }

  return processed;
}

/**
 * Get current AI processing status.
 */
export async function getAiStatus(): Promise<AiProcessingStatus> {
  let totalOnDevice = 0;
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (status === 'granted') {
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo'],
        first: 0,
      });
      totalOnDevice = totalCount;
    }
  } catch {
    // MediaLibrary not available
  }

  const indexed = await getIndexedCount();

  return {
    totalOnDevice,
    indexed,
    processing: false,
  };
}
