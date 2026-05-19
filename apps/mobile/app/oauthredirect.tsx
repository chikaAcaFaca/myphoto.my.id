/**
 * OAuth redirect catcher.
 *
 * Google's OAuth callback comes back to the app as
 * `myphoto://oauthredirect?code=...&state=...`. Without a matching
 * route file, expo-router renders its built-in "Unmatched Route" page
 * and the auth session sits there forever.
 *
 * The fix is to expose this route so expo-router doesn't fall through
 * to the 404. The real OAuth result is picked up by
 * `WebBrowser.maybeCompleteAuthSession()` — that listener was already
 * armed at AuthProvider module load, the only thing missing was a
 * landing page that bounces the user back to the app root.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function OAuthRedirect() {
  useEffect(() => {
    // Belt-and-braces: complete the auth session again on mount in
    // case the module-level call ran before the URL arrived.
    WebBrowser.maybeCompleteAuthSession();
    // The promptAsync promise on the AuthProvider side resolves
    // independently — we just need to get the user off this empty
    // landing page so they can't get stuck if anything goes wrong.
    router.replace('/');
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#000' }} />;
}
