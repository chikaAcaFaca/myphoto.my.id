import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
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

// Complete auth session on return from browser
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
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

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Use initializeAuth with AsyncStorage persistence for React Native
// getAuth() alone causes onAuthStateChanged to never fire on RN
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Auth already initialized (hot reload) — fall back to existing instance
  const { getAuth } = require('firebase/auth');
  auth = getAuth(app);
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          setUser(firebaseUser);

          if (firebaseUser) {
            // Store token for API calls
            const token = await firebaseUser.getIdToken();
            await SecureStore.setItemAsync('auth_token', token);

            // Fetch user data from API
            try {
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/users/me`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
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
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    // User document creation is handled by server
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      // Use the appropriate client ID per platform
      const clientId = Platform.OS === 'android'
        ? GOOGLE_ANDROID_CLIENT_ID
        : GOOGLE_WEB_CLIENT_ID;

      if (!clientId) {
        throw new Error('Google Client ID nije konfigurisan. Dodajte EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID u .env');
      }

      // Create auth request using Google's OAuth2 discovery
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'myphoto',
      });

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
        // Exchange Google ID token for Firebase credential
        const credential = GoogleAuthProvider.credential(result.params.id_token);
        await signInWithCredential(auth, credential);
      } else if (result.type === 'cancel') {
        // User cancelled — do nothing
        return;
      } else {
        throw new Error('Google prijava nije uspela');
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
      value={{
        user,
        appUser,
        isLoading,
        error,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        getToken,
      }}
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
