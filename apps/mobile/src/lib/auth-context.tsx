import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
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
  type Auth,
} from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User as AppUser } from '@myphoto/shared';
import { registerDevice } from './device-registry';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authRef = useRef<Auth | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const auth = getFirebaseAuth();
      authRef.current = auth;

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          setUser(firebaseUser);

          if (firebaseUser) {
            const token = await firebaseUser.getIdToken();
            await SecureStore.setItemAsync('auth_token', token);

            try {
              const response = await fetch(
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

            // Register device (fire-and-forget)
            registerDevice(token).catch(() => {});
          } else {
            await SecureStore.deleteItemAsync('auth_token');
            setAppUser(null);
          }

          setIsLoading(false);
        } catch (err: any) {
          console.error('Auth state error:', err);
          setError(err.message || 'Auth initialization failed');
          setIsLoading(false);
        }
      });
    } catch (err: any) {
      console.error('Firebase init error:', err);
      setError(err.message || 'Firebase initialization failed');
      setIsLoading(false);
    }

    return () => unsubscribe?.();
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

  return (
    <AuthContext.Provider
      value={{ user, appUser, isLoading, error, signIn, signUp, signOut, signInWithGoogle, getToken }}
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
