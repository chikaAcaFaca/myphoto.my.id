import { requireNativeModule } from 'expo-modules-core';

type SubjectSegmentationNativeModule = {
  // Returns a file:// URI to a PNG of the subject on a transparent background.
  removeBackground(uri: string): Promise<string>;
};

const SubjectSegmentation = requireNativeModule<SubjectSegmentationNativeModule>(
  'SubjectSegmentation'
);

export class NoSubjectError extends Error {
  constructor() {
    super('No subject detected');
    this.name = 'NoSubjectError';
  }
}

// Runs ML Kit Subject Segmentation on-device and returns a local file:// URI
// pointing at a PNG with the background removed (transparent). Throws
// NoSubjectError when the model finds no clear subject.
export async function removeBackground(localUri: string): Promise<string> {
  try {
    return await SubjectSegmentation.removeBackground(localUri);
  } catch (e: any) {
    if (e?.code === 'NO_SUBJECT') throw new NoSubjectError();
    throw e;
  }
}
