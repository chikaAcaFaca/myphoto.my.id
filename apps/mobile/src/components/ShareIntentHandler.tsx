/**
 * Drains the native share-intent queue on app start + every time the app
 * comes to the foreground, then uploads each shared file into the user's
 * MySpace "MyPhoto Kreacije Iz Drugih Aplikacija" folder. We deliberately
 * don't render anything — this is a side-effect component mounted once,
 * high in the tree, inside the authenticated zone (so getToken() resolves).
 */
import { useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { consumeShared, type SharedItem } from '@/lib/share-intent';
import { saveToMySpace } from '@/lib/myspace-upload';
import { useAuth } from '@/lib/auth-context';

const SHARED_FOLDER = 'Iz drugih aplikacija';

function inferExtension(mimeType: string): string {
  if (mimeType.startsWith('video/')) {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('quicktime') || mimeType.includes('mov')) return 'mov';
    if (mimeType.includes('webm')) return 'webm';
    return 'mp4';
  }
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

async function localiseUri(item: SharedItem): Promise<string | null> {
  // ACTION_SEND hands us a content:// URI scoped to the source app's grant.
  // expo-file-system's downloadAsync can read content:// via the resolver, so
  // we copy into our cache where we control the lifecycle (and where the URI
  // is a plain file:// we can hand to upload helpers).
  const ext = inferExtension(item.mimeType);
  const dest = `${FileSystem.cacheDirectory}share_${Date.now()}.${ext}`;
  try {
    if (item.uri.startsWith('file://')) {
      await FileSystem.copyAsync({ from: item.uri, to: dest });
      return dest;
    }
    const dl = await FileSystem.downloadAsync(item.uri, dest);
    return dl.uri;
  } catch (e) {
    console.warn('share-intent localise failed:', e);
    return null;
  }
}

export function ShareIntentHandler() {
  const { getToken, user } = useAuth();
  // Guard against a double-fire (StrictMode in dev, AppState 'active' on
  // initial mount, etc.) racing on the same payload before consumeShared
  // has actually drained it.
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const drain = async () => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      try {
        const items = await consumeShared();
        if (!items.length) return;
        const token = await getToken();
        if (!token) {
          Alert.alert('Prijava', 'Prijavi se da bi otpremio podeljene fajlove.');
          return;
        }
        let ok = 0;
        for (const item of items) {
          const local = await localiseUri(item);
          if (!local) continue;
          const ext = inferExtension(item.mimeType);
          const filename = `share-${Date.now()}-${ok}.${ext}`;
          const success = await saveToMySpace({
            uri: local,
            filename,
            mimeType: item.mimeType,
            token,
            folderName: SHARED_FOLDER,
          });
          if (success) ok++;
          try { await FileSystem.deleteAsync(local, { idempotent: true }); } catch {}
        }
        if (ok > 0) {
          Alert.alert(
            'Otpremljeno',
            `${ok} fajl(ova) je u tvom prostoru — folder „${SHARED_FOLDER}".`,
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Otvori MySpace', onPress: () => router.push('/(tabs)/myspace') },
            ],
          );
        } else if (items.length > 0) {
          Alert.alert('Greška', 'Podeljeni fajl nije uspeo da se otpremi.');
        }
      } finally {
        inflightRef.current = false;
      }
    };

    drain();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') drain();
    });
    return () => sub.remove();
  }, [user, getToken]);

  return null;
}
