import { useEffect, useRef } from 'react';
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

// The last push tap we acted on. getLastNotificationResponseAsync keeps
// returning the same old tap for the life of the app (and across restarts),
// so without this every re-run would throw the user back into the Inbox.
const HANDLED_KEY = 'push_last_handled_id';
let handledId: string | null = null;

async function openOnce(response: Notifications.NotificationResponse, uid: string) {
  const id = response.notification.request.identifier;
  if (handledId === null) handledId = await SecureStore.getItemAsync(HANDLED_KEY).catch(() => null);
  if (id && id === handledId) return;
  handledId = id;
  if (id) SecureStore.setItemAsync(HANDLED_KEY, id).catch(() => {});
  openFromPush(response.notification.request.content.data, uid);
}

function openFromPush(data: Record<string, unknown> | undefined, uid: string | undefined) {
  const memeId = typeof data?.memeId === 'string' ? data.memeId : null;
  const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : null;
  if (conversationId) {
    router.push({ pathname: '/chat', params: { conversationId } });
  } else if (memeId && uid) {
    router.push({ pathname: '/meme-wall', params: { profileUserId: uid, startId: memeId } });
  } else {
    router.navigate('/(tabs)/inbox' as Href);
  }
}

/** Mounted once inside the signed-in tree. */
export function PushRegistrar() {
  const { user, getToken } = useAuth();
  const { refresh } = useInbox();
  // getToken/refresh change identity on every auth render; keep the latest in
  // refs so the listeners below are set up once per signed-in user, not on
  // every render (which re-ran the cold-start tap and yanked the user to Inbox).
  const getTokenRef = useRef(getToken);
  const refreshRef = useRef(refresh);
  getTokenRef.current = getToken;
  refreshRef.current = refresh;
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    registerDevice(() => getTokenRef.current()).catch((e) => console.warn('Push registration failed:', e));

    // A push arriving while the app is open: update the badge right away.
    const received = Notifications.addNotificationReceivedListener(() => {
      refreshRef.current();
    });
    // Tapping a push (app in background or closed) opens what it is about.
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      openOnce(response, uid);
    });
    // Cold start from a tap — only if it is a tap we haven't handled yet.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openOnce(response, uid);
    }).catch(() => {});

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [uid]);

  return null;
}
