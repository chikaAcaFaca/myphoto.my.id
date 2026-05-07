export interface OcrResult {
  text: string;
  blockCount: number;
}

/**
 * Extract text from an image using OCR.
 * Currently disabled — ML Kit native modules not available in Expo managed workflow.
 */
export async function extractText(_localUri: string): Promise<OcrResult> {
  return { text: '', blockCount: 0 };
}
