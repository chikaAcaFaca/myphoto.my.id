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
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User as AppUser } from '@myphoto/shared';

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

  const signInWithGoogle = useCallback(async () => {
    const auth = authRef.current || getFirebaseAuth();
    try {
      const clientId = Platform.OS === 'android'
        ? GOOGLE_ANDROID_CLIENT_ID
        : GOOGLE_WEB_CLIENT_ID;

      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }

      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'myphoto' });

      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
        extraParams: {
          nonce: Math.random().toString(36).substring(2),
        },
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success' && result.params.id_token) {
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
      } else if (result.type !== 'cancel') {
        throw new Error('Google sign-in failed');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  }, []);

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
