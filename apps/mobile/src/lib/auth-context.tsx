import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform, AppState } from 'react-native';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// @ts-ignore – getReactNativePersistence is exported from the RN bundle via
// the "react-native" condition in package.json. Metro resolves it at runtime,
// but tsc uses the Node export that omits it.
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type Auth,
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User as AppUser } from '@myphoto/shared';
import { registerDevice } from './device-registry';
import { fetchWithTimeout, withTimeout } from './net';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Lazy-initialize Firebase app and auth to avoid "Component auth has not been
// registered yet" errors that occur when auth is initialized at module scope
// on RN 0.76+ with the new architecture.
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: any) {
    // Already initialized (hot reload) — reuse existing instance
    _auth = getAuth(app);
  }
  return _auth;
}

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  getToken: () => Promise<string | null>;
  /** Re-fetch /api/users/me so storageUsed/storageLimit (quota gauge +
   *  upsell) reflect the latest server state. Safe to call often. */
  refreshAppUser: () => Promise<void>;
  /** Whether the signed-in user logs in with email + password (vs Google). */
  usesPassword: boolean;
  /** Re-confirm identity, then permanently delete the account on the server.
   *  Password users must pass their password; Google users get the Google
   *  prompt again. Signs out on success. */
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef<Auth | null>(null);

  // Fetch the full user record (storageUsed/storageLimit, referral, settings)
  // from /api/users/me and store it. Shared by the auth listener and by
  // refreshAppUser(). Never throws — quota gating degrades gracefully.
  const fetchAppUser = useCallback(async (token: string) => {
    try {
      const response = await fetchWithTimeout(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const userData = await response.json();
        setAppUser(userData);
      }
    } catch (fetchErr) {
      console.error('Error fetching user data:', fetchErr);
    }
  }, []);

  // Public refresh — re-pulls /api/users/me using the current token so the
  // quota gauge and the proactive storage upsell react to uploads/deletes.
  // `getIdToken()` hits the network whenever the cached token is past its
  // one-hour life, and Firebase gives us no way to bound that call — so it
  // gets an explicit deadline and falls back to the stored token.
  const refreshAppUser = useCallback(async () => {
    let token: string | null = null;
    const current = authRef.current?.currentUser;
    if (current) {
      token = await withTimeout(current.getIdToken(), 10000).catch(() => null);
    }
    if (!token) token = await SecureStore.getItemAsync('auth_token');
    if (token) await fetchAppUser(token);
  }, [fetchAppUser]);

  // Keep quota fresh whenever the app returns to the foreground — uploads
  // that happened in the background service (or on the web) are reflected
  // without forcing a re-login.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAppUser().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshAppUser]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      authRef.current = auth;

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);

        // Release the loading gate on the FIRST answer from Firebase, before
        // any network work. Everything below (token refresh, /api/users/me,
        // device registration) used to sit in front of this line — one stalled
        // socket there left `isLoading` true forever, which renders nothing but
        // a spinner and keeps the splash screen up, so the only way out was
        // Force stop. Profile data is not needed to draw the first screen.
        setIsLoading(false);

        if (!firebaseUser) {
          SecureStore.deleteItemAsync('auth_token').catch(() => {});
          setAppUser(null);
          return;
        }

        void (async () => {
          try {
            const token = await withTimeout(firebaseUser.getIdToken(), 10000);
            await SecureStore.setItemAsync('auth_token', token);
            await fetchAppUser(token);
            // Register device (fire-and-forget)
            registerDevice(token).catch(() => {});
          } catch (err: any) {
            // Non-fatal: the app stays usable on the cached token/profile and
            // AppState 'active' will retry the refresh on the next foreground.
            console.warn('Auth bootstrap (deferred) failed:', err?.message || err);
          }
        })();
      });
    } catch (err: any) {
      console.error('Firebase init error:', err);
      setError(err.message || 'Firebase initialization failed');
      setIsLoading(false);
    }

    // Last-resort watchdog. If Firebase never delivers a first auth state
    // (its AsyncStorage-backed persistence read can wedge on a cold start),
    // stop gating the UI. Worst case the user lands on the login screen; the
    // listener still fires later and routes them straight into the app. That
    // is recoverable — an endless spinner is not.
    const watchdog = setTimeout(() => setIsLoading(false), 8000);

    return () => {
      clearTimeout(watchdog);
      unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = authRef.current || getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const auth = authRef.current || getFirebaseAuth();
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    const auth = authRef.current || getFirebaseAuth();
    await firebaseSignOut(auth);
  };

  // Modern Google sign-in via expo-auth-session's Google provider. This
  // replaces the previous hand-rolled AuthRequest that targeted the
  // deprecated https://auth.expo.io/@<owner>/<slug> proxy — Expo removed
  // that endpoint in SDK 50, so the old code's redirect URI was rejected
  // by Google and the flow silently dead-ended. The provider hook here
  // picks the right redirect per platform (myphoto:// scheme on
  // standalone Android, native package binding when the android client
  // id is registered, web proxy in Expo Go).
  const [, googleResponse, promptGoogle] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  // The provider's promptAsync resolves with a "response" we also get
  // pushed through this state. Wire any success token back into Firebase
  // here so the auth-state listener picks it up just like an email login.
  const pendingGoogleResolver = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  useEffect(() => {
    if (!googleResponse) return;
    const auth = authRef.current || getFirebaseAuth();
    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params?.id_token || (googleResponse as any).authentication?.idToken;
      if (!idToken) {
        pendingGoogleResolver.current?.reject(new Error('Google nije vratio ID token'));
        pendingGoogleResolver.current = null;
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(() => pendingGoogleResolver.current?.resolve())
        .catch((e) => pendingGoogleResolver.current?.reject(e))
        .finally(() => { pendingGoogleResolver.current = null; });
    } else if (googleResponse.type === 'error') {
      pendingGoogleResolver.current?.reject(new Error(googleResponse.error?.message || 'Google sign-in error'));
      pendingGoogleResolver.current = null;
    } else if (googleResponse.type === 'cancel' || googleResponse.type === 'dismiss') {
      // Treat cancel as a no-op resolve so the caller's UI returns to
      // idle without surfacing an error toast.
      pendingGoogleResolver.current?.resolve();
      pendingGoogleResolver.current = null;
    }
  }, [googleResponse]);

  const signInWithGoogle = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID && !GOOGLE_ANDROID_CLIENT_ID) {
      throw new Error('Google Client ID nije konfigurisan u .env');
    }
    if (!promptGoogle) {
      throw new Error('Google auth nije spreman — pokušaj ponovo za par sekundi.');
    }
    // Wrap promptAsync + the response effect in a single promise so
    // callers (login.tsx, register.tsx) can await sign-in completion
    // exactly like the email path.
    return new Promise<void>((resolve, reject) => {
      pendingGoogleResolver.current = { resolve, reject };
      promptGoogle().catch((e) => {
        pendingGoogleResolver.current = null;
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    });
  }, [promptGoogle]);

  const getToken = async (): Promise<string | null> => {
    if (user) {
      return user.getIdToken();
    }
    return SecureStore.getItemAsync('auth_token');
  };

  const usesPassword = !!user?.providerData.some((p) => p.providerId === 'password');

  const deleteAccount = async (password?: string) => {
    const auth = authRef.current || getFirebaseAuth();
    const current = auth.currentUser;
    if (!current) throw new Error('Niste prijavljeni');
    const uid = current.uid;

    // The server only accepts tokens from a sign-in in the last 10 minutes.
    if (usesPassword) {
      if (!password) throw new Error('Unesite lozinku');
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email!, password));
    } else {
      await signInWithGoogle();
      if (auth.currentUser?.uid !== uid) {
        throw new Error('Izabran je drugi Google nalog');
      }
    }

    const token = await auth.currentUser!.getIdToken(true);
    const res = await fetchWithTimeout(
      `${process.env.EXPO_PUBLIC_API_URL}/api/users/me`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      },
      180000
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Brisanje nije uspelo (HTTP ${res.status})`);
    }
    await firebaseSignOut(auth).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{ user, appUser, isLoading, error, signIn, signUp, signOut, signInWithGoogle, getToken, refreshAppUser, usesPassword, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
