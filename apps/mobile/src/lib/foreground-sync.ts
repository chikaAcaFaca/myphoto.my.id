/**
 * Foreground-service sync (Android).
 *
 * The OS WorkManager path (expo-background-fetch) is best-effort and does NOT
 * run reliably once the app is swiped away. To back up "even when the app is
 * closed", we run a real Android **foreground service** with a persistent
 * notification (the same approach Google Photos / Dropbox use). While the
 * service runs, Android keeps our JS process alive, so `runSyncPass()` can keep
 * draining the upload queue in the background.
 *
 * `react-native-background-actions` provides that service. It's a native module
 * that only exists in a prebuilt dev/release binary — NOT in Expo Go. We
 * therefore guard-require it: if it isn't present we no-op and let the in-app
 * kicker + expo-background-fetch carry the load, so the JS is always safe to
 * ship even before the native rebuild lands.
 *
 * BUILD NOTE: requires `pnpm add react-native-background-actions` in
 * apps/mobile, the FOREGROUND_SERVICE* permissions in app.json (already added),
 * then `expo prebuild` + a fresh APK. See PLAN docs.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import { runSyncPass, type SyncProgress } from './background-sync-runner';

// Android 13+ requires runtime POST_NOTIFICATIONS consent or the foreground
// service notification is suppressed (uploads still run, but the user can't see
// progress). Ask once before starting; proceed regardless of the answer.
async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (typeof Platform.Version === 'number' && Platform.Version < 33) return;
  try {
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!perm) return;
    const already = await PermissionsAndroid.check(perm);
    if (already) return;
    await PermissionsAndroid.request(perm);
  } catch {
    /* ignore — the service still runs without the visible notification */
  }
}

// Guard-require so a missing native module can never crash the app.
let BackgroundService: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  BackgroundService = require('react-native-background-actions').default;
} catch {
  BackgroundService = null;
}

const TASK_NAME = 'MyPhoto backup';
const PASS_INTERVAL_MS = 5 * 60 * 1000; // re-scan every 5 min while running

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function describe(p: SyncProgress): string {
  if (p.phase === 'idle') return 'Sve je sinhronizovano';
  const what = p.phase === 'photos' ? 'slike' : 'fajlove';
  return `Otpremam ${what} ${p.done}/${p.total}…`;
}

// updateNotification may or may not return a Promise across versions — call it
// defensively so progress updates can never break the sync loop.
function safeUpdateNotification(taskDesc: string) {
  try {
    const r = BackgroundService?.updateNotification({ taskDesc });
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {
    /* ignore */
  }
}

const options = {
  taskName: 'MyPhotoBackup',
  taskTitle: 'MyPhoto čuva tvoje uspomene',
  taskDesc: 'Pripremam sinhronizaciju…',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#7C3AED',
  linkingURI: 'myphoto://',
  // Android 14+ (targetSdk 34+) requires a declared foreground-service type;
  // we use dataSync (uploading user files). The matching type is declared on
  // the RNBackgroundActionsTask service via the withForegroundServiceType
  // config plugin so the manifest and runtime types agree.
  foregroundServiceType: ['dataSync'],
  parameters: {},
};

// The long-running task: loop sync passes until the service is stopped.
const backupLoop = async () => {
  await new Promise<void>(async (resolve) => {
    while (BackgroundService?.isRunning()) {
      try {
        await runSyncPass({
          shouldStop: () => !BackgroundService?.isRunning(),
          onProgress: (p) => safeUpdateNotification(describe(p)),
        });
      } catch (e) {
        // Never let the loop die on a transient error.
        console.warn('Foreground backup pass failed:', e);
      }
      // Idle until the next scan window (or until stopped).
      let waited = 0;
      while (BackgroundService?.isRunning() && waited < PASS_INTERVAL_MS) {
        await sleep(5000);
        waited += 5000;
      }
    }
    resolve();
  });
};

export function isForegroundSyncAvailable(): boolean {
  return Platform.OS === 'android' && !!BackgroundService;
}

let starting = false;

/** Start the persistent backup service. Returns true if it (or an existing
 *  instance) is running, false if the native module isn't available. */
export async function startForegroundSync(): Promise<boolean> {
  if (!isForegroundSyncAvailable()) return false;
  if (starting || BackgroundService.isRunning()) return true;
  starting = true;
  try {
    await ensureNotificationPermission();
    await BackgroundService.start(backupLoop, options);
    return true;
  } catch (e) {
    console.warn('Failed to start foreground sync service:', e);
    return false;
  } finally {
    starting = false;
  }
}

/** Stop the backup service (e.g. user turns auto-backup off / signs out). */
export async function stopForegroundSync(): Promise<void> {
  if (!BackgroundService) return;
  try {
    if (BackgroundService.isRunning()) await BackgroundService.stop();
  } catch (e) {
    console.warn('Failed to stop foreground sync service:', e);
  }
}
