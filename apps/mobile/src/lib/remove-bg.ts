/**
 * Background removal — currently a stub.
 *
 * The full on-device ONNX implementation (briaai/RMBG-1.4) lives in
 * remove-bg.onnx-impl.ts.bak. It was shelved because
 * onnxruntime-react-native crashed at app startup on SDK 54 / RN 0.81
 * (native System.loadLibrary("onnxruntimejsi") path) and added ~113 MB
 * to the APK. We removed the dependency to keep the app lean and
 * stable while we pick a different approach (server-side rembg or
 * ML Kit segmentation) — see the chat backlog.
 *
 * Until then removeBackground throws a typed NotImplemented error so
 * the editor can show a friendly "u izradi" message instead of a
 * cryptic failure.
 */

export type RemoveBgProgress = (msg: string, pct?: number) => void;

export class RemoveBgNotImplemented extends Error {
  constructor() {
    super('Uklanjanje pozadine je privremeno isključeno.');
    this.name = 'RemoveBgNotImplemented';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removeBackground(
  _imageUri: string,
  _onProgress?: RemoveBgProgress
): Promise<string> {
  throw new RemoveBgNotImplemented();
}

export async function resetRemoveBgCache(): Promise<void> {
  // No-op while stubbed.
}
