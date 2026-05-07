export interface LocalLabel {
  label: string;
  confidence: number;
}

/**
 * Classify an image using on-device ML.
 * Currently disabled — ML Kit native modules not available in Expo managed workflow.
 */
export async function classifyImage(_localUri: string): Promise<LocalLabel[]> {
  return [];
}

/**
 * Determine scene type from labels.
 */
export function detectSceneType(labels: LocalLabel[]): string {
  const labelSet = new Set(labels.map((l) => l.label.toLowerCase()));

  if (labelSet.has('food') || labelSet.has('meal') || labelSet.has('dish')) return 'food';
  if (labelSet.has('animal') || labelSet.has('dog') || labelSet.has('cat') || labelSet.has('bird')) return 'animal';
  if (labelSet.has('car') || labelSet.has('vehicle') || labelSet.has('truck')) return 'vehicle';
  if (labelSet.has('building') || labelSet.has('architecture') || labelSet.has('house')) return 'architecture';
  if (labelSet.has('plant') || labelSet.has('flower') || labelSet.has('tree') || labelSet.has('nature')) return 'nature';
  if (labelSet.has('sky') || labelSet.has('sunset') || labelSet.has('cloud')) return 'landscape';
  if (labelSet.has('text') || labelSet.has('document') || labelSet.has('paper')) return 'document';
  if (labelSet.has('person') || labelSet.has('people') || labelSet.has('face')) return 'people';
  if (labelSet.has('sport') || labelSet.has('ball') || labelSet.has('game')) return 'sport';

  return 'other';
}

/**
 * Check if a filename looks like a screenshot.
 */
export function isScreenshot(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.includes('screenshot') || lower.includes('screen_shot') || lower.includes('snimak_ekrana');
}
