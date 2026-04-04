import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImageManipulator from 'expo-image-manipulator';

export interface OcrResult {
  text: string;
  blockCount: number;
}

/**
 * Extract text from an image using Google ML Kit OCR.
 * Best for screenshots, documents, and photos with text.
 */
export async function extractText(localUri: string): Promise<OcrResult> {
  try {
    const resized = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1024 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
    );

    const result = await TextRecognition.recognize(resized.uri);

    return {
      text: result.text || '',
      blockCount: result.blocks?.length || 0,
    };
  } catch (error) {
    console.log('ML Kit OCR error:', error);
    return { text: '', blockCount: 0 };
  }
}
