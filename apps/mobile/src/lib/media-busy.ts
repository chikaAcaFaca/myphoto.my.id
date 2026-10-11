import { AppState } from 'react-native';

/**
 * "The user is watching memes right now." The backup service runs in the same
 * JS thread as the screens and shares the phone's connection, so uploading
 * while the Meme Wall plays videos made swiping stutter. Backup work waits
 * between files while this is set. Only counts while the app is on screen:
 * in the background the backup runs at full speed.
 */
let watching = false;

export function setMediaBusy(on: boolean) {
  watching = on;
}

export function isMediaBusy(): boolean {
  return watching && AppState.currentState === 'active';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until the user leaves the Meme Wall (or `shouldStop` says stop). */
export async function waitWhileMediaBusy(shouldStop?: () => boolean): Promise<void> {
  while (isMediaBusy() && !shouldStop?.()) await sleep(2000);
}
