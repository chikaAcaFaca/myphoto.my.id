import * as SecureStore from 'expo-secure-store';

// Kept apart from push.tsx so auth-context can import it without a cycle.

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
export const PUSH_TOKEN_KEY = 'push_fcm_token';

export async function sendPushToken(method: 'POST' | 'DELETE', fcmToken: string, idToken: string) {
  return fetch(`${API_URL}/api/push/register`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ token: fcmToken }),
  });
}

/** Call before signing out so this phone stops getting the old account's pushes. */
export async function unregisterPush(getToken: () => Promise<string | null>) {
  try {
    const fcmToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    const idToken = await getToken();
    if (fcmToken && idToken) await sendPushToken('DELETE', fcmToken, idToken);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  } catch {}
}
