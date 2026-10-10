import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { PUSH_TOKEN_KEY, sendPushToken } from './push-token';
import { router, type Href } from 'expo-router';
import { useAuth } from './auth-context';
import { useInbox } from './inbox-context';


// Show pushes as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Ask for permission (Android 13+), then register this device's FCM token. */
async function registerDevice(getToken: () => Promise<string | null>) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'MyPhoto',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted && perm.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return;

  // Native FCM token: the server sends through Firebase Admin directly.
  const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
  const idToken = await getToken();
  if (!fcmToken || !idToken) return;
  const res = await sendPushToken('POST', fcmToken, idToken);
  if (res.ok) await SecureStore.setItemAsync(PUSH_TOKEN_KEY, fcmToken);
}

function openFromPush(data: Record<string, unknown> | undefined, uid: string | undefined) {
  const memeId = typeof data?.memeId === 'string' ? data.memeId : null;
  if (memeId && uid) {
    router.push({ pathname: '/meme-wall', params: { profileUserId: uid, startId: memeId } });
  } else {
    router.navigate('/(tabs)/inbox' as Href);
  }
}

/** Mounted once inside the signed-in tree. */
export function PushRegistrar() {
  const { user, getToken } = useAuth();
  const { refresh } = useInbox();

  useEffect(() => {
    if (!user) return;
    registerDevice(getToken).catch((e) => console.warn('Push registration failed:', e));

    // A push arriving while the app is open: update the badge right away.
    const received = Notifications.addNotificationReceivedListener(() => {
      refresh();
    });
    // Tapping a push (app in background or closed) opens what it is about.
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromPush(response.notification.request.content.data, user.uid);
    });
    // Cold start from a tap.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openFromPush(response.notification.request.content.data, user.uid);
    }).catch(() => {});

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [user, getToken, refresh]);

  return null;
}
