/**
 * On-device background removal using a small ONNX model (briaai/RMBG-1.4
 * quantized, ~22 MB). The model is downloaded once on first use and cached
 * to the app's documentDirectory; subsequent calls reuse it and only pay
 * the inference cost.
 *
 * Flow:
 *   1. Ensure model file is on disk (download with progress if missing).
 *   2. Create / reuse an InferenceSession.
 *   3. Resize the input image to 1024x1024 (model input shape).
 *   4. Decode the JPEG to RGBA pixels with jpeg-js (pure JS).
 *   5. Build a normalised [1, 3, H, W] float32 tensor.
 *   6. Run inference → single-channel alpha mask in [0, 1].
 *   7. Compose original RGB + mask α → RGBA, encode to PNG (upng-js),
 *      write to cacheDirectory, return the URI.
 *
 * Caveats:
 * - First run is slow (model download + cold session). Surface progress
 *   to the user via onProgress.
 * - Inference time on mid-range Android: ~5-20s for 1024². Lower
 *   MODEL_SIZE to 512 for speed at the cost of edge quality.
 * - jpeg-js is pure JS; we resize to MODEL_SIZE first so it never has
 *   to decode multi-megapixel images.
 */
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
// @ts-ignore — jpeg-js ships without types but is pure JS and works in RN.
import jpeg from 'jpeg-js';
// @ts-ignore — upng-js has no types.
import UPNG from 'upng-js';

// Briaai's RMBG-1.4 is permissively licensed and known to produce good
// general-subject masks (people, animals, products). The quantized
// build is ~22 MB and fits the user's 30 MB app-growth budget.
const MODEL_URL =
  'https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx';
const MODEL_FILENAME = 'rmbg-1.4-quantized.onnx';
const MODEL_SIZE = 1024;

// ImageNet normalisation — matches what RMBG was trained with.
const MEAN: readonly [number, number, number] = [0.485, 0.456, 0.406];
const STD: readonly [number, number, number] = [0.229, 0.224, 0.225];

let sessionPromise: Promise<InferenceSession> | null = null;

export type RemoveBgProgress = (msg: string, pct?: number) => void;

function modelPath(): string {
  return `${FileSystem.documentDirectory}models/${MODEL_FILENAME}`;
}

async function ensureModelDownloaded(onProgress?: RemoveBgProgress): Promise<string> {
  const path = modelPath();
  const info = await FileSystem.getInfoAsync(path);
  // Heuristic: a partial download / corrupt file would be tiny; the
  // real model is ~22 MB. Use 1 MB as a safe floor.
  if (info.exists && info.size && info.size > 1_000_000) {
    return path;
  }
  const dir = `${FileSystem.documentDirectory}models/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  onProgress?.('Skidam AI model za remove-bg...', 0);
  const dl = FileSystem.createDownloadResumable(
    MODEL_URL,
    path,
    {},
    (e) => {
      if (e.totalBytesExpectedToWrite > 0) {
        const pct = Math.round((e.totalBytesWritten / e.totalBytesExpectedToWrite) * 100);
        onProgress?.('Skidam AI model za remove-bg...', pct);
      }
    }
  );
  const result = await dl.downloadAsync();
  if (!result) {
    throw new Error('Skidanje modela nije uspelo.');
  }
  return path;
}

async function loadSession(onProgress?: RemoveBgProgress): Promise<InferenceSession> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const path = await ensureModelDownloaded(onProgress);
    onProgress?.('Učitavam AI model...');
    return InferenceSession.create(path);
  })();
  // If load fails, drop the cached promise so the next call retries
  // cleanly instead of always returning the rejected one.
  sessionPromise.catch(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = global.atob(b64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  // Process in chunks — String.fromCharCode.apply with huge arrays
  // overflows the JS call stack on lower-end Androids.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK))
    );
  }
  return global.btoa(binary);
}

async function decodeImageToRgba(uri: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(b64);
  const raw = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  return { data: raw.data, width: raw.width, height: raw.height };
}

function buildInputTensor(rgba: Uint8Array, width: number, height: number): Tensor {
  const size = width * height;
  const out = new Float32Array(3 * size);
  for (let i = 0; i < size; i++) {
    const r = rgba[i * 4] / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;
    out[i] = (r - MEAN[0]) / STD[0];
    out[size + i] = (g - MEAN[1]) / STD[1];
    out[2 * size + i] = (b - MEAN[2]) / STD[2];
  }
  return new Tensor('float32', out, [1, 3, height, width]);
}

function applyMaskToRgba(rgba: Uint8Array, mask: Float32Array, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount * 4);
  for (let i = 0; i < pixelCount; i++) {
    out[i * 4] = rgba[i * 4];
    out[i * 4 + 1] = rgba[i * 4 + 1];
    out[i * 4 + 2] = rgba[i * 4 + 2];
    const alpha = Math.max(0, Math.min(1, mask[i]));
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

/**
 * Run background removal on the given image URI.
 * Returns the URI of a PNG file in the cache directory with the
 * background replaced by transparency.
 */
export async function removeBackground(
  imageUri: string,
  onProgress?: RemoveBgProgress
): Promise<string> {
  onProgress?.('Pripremam sliku...');
  // Resize + force JPEG so the JS decoder has something it can handle
  // reliably regardless of the input format (HEIC, content://, etc.).
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: MODEL_SIZE, height: MODEL_SIZE } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );

  const { data: rgba, width, height } = await decodeImageToRgba(resized.uri);

  const inputTensor = buildInputTensor(rgba, width, height);

  onProgress?.('Pokrećem AI inference...');
  const session = await loadSession(onProgress);
  const inputName = session.inputNames[0];
  const outputs = await session.run({ [inputName]: inputTensor });
  const maskTensor = outputs[session.outputNames[0]];
  const maskData = maskTensor.data as Float32Array;

  onProgress?.('Pravim transparentnu sliku...');
  const rgbaWithAlpha = applyMaskToRgba(rgba, maskData, width * height);

  // UPNG.encode wants an array of frame buffers + dimensions; cnum=0
  // means lossless 32-bit RGBA.
  const pngArrayBuffer: ArrayBuffer = UPNG.encode(
    [rgbaWithAlpha.buffer as ArrayBuffer],
    width,
    height,
    0
  );
  const pngB64 = bytesToBase64(new Uint8Array(pngArrayBuffer));
  const outUri = `${FileSystem.cacheDirectory}removed_bg_${Date.now()}.png`;
  await FileSystem.writeAsStringAsync(outUri, pngB64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}

/**
 * Force-clear the cached model + session (e.g. user wants to re-download
 * or troubleshoot a corrupt cache).
 */
export async function resetRemoveBgCache(): Promise<void> {
  sessionPromise = null;
  try {
    await FileSystem.deleteAsync(modelPath(), { idempotent: true });
  } catch {
    // Best-effort.
  }
}
