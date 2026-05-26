/**
 * JS bridge to the native ShareIntent module. The Android side parks any URIs
 * from an incoming ACTION_SEND / ACTION_SEND_MULTIPLE intent (registered in
 * AndroidManifest as image/* and video/* mime types) into a singleton store;
 * we drain that queue here. Drain-on-read means the same payload is never
 * processed twice across a foreground/background flip.
 */
import { requireNativeModule } from 'expo-modules-core';

export type SharedItem = { uri: string; mimeType: string };

type ShareIntentNativeModule = {
  consumeShared(): Promise<SharedItem[]>;
};

const ShareIntent = requireNativeModule<ShareIntentNativeModule>('ShareIntent');

export async function consumeShared(): Promise<SharedItem[]> {
  try {
    return await ShareIntent.consumeShared();
  } catch {
    return [];
  }
}
