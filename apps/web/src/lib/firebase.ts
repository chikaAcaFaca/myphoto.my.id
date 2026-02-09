import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { User as AppUser, UserSettings } from '@myphoto/shared';
import { FREE_STORAGE_LIMIT } from '@myphoto/shared';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app, 'myphoto');

// Auth Providers
const googleProvider = new GoogleAuthProvider();

// Auth Functions
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserDocumentIfNeeded(result.user);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await createUserDocumentIfNeeded(result.user, displayName);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// User Document Functions
async function createUserDocumentIfNeeded(user: User, displayName?: string) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const defaultSettings: UserSettings = {
      syncMode: 'wifi_only',
      uploadQuality: 'original',
      autoBackup: true,
      faceRecognition: true,
      darkMode: false,
    };

    const newUser: Omit<AppUser, 'id' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      email: user.email || '',
      displayName: displayName || user.displayName || 'User',
      avatarUrl: user.photoURL || undefined,
      settings: defaultSettings,
      storageUsed: 0,
      storageLimit: FREE_STORAGE_LIMIT,
      subscriptionIds: [],
      role: 'user',
      createdAt: serverTimestamp(),
    };

    await setDoc(userRef, newUser);
  }
}

export async function getUserDocument(userId: string): Promise<AppUser | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;

  const data = userSnap.data();
  return {
    id: userSnap.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
  } as AppUser;
}

export async function updateUserDocument(
  userId: string,
  data: Partial<Omit<AppUser, 'id' | 'createdAt'>>
) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, data);
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const currentSettings = userSnap.data().settings || {};
    await updateDoc(userRef, {
      settings: { ...currentSettings, ...settings },
    });
  }
}

export async function updateStorageUsed(userId: string, bytesChange: number) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const currentUsed = userSnap.data().storageUsed || 0;
    await updateDoc(userRef, {
      storageUsed: Math.max(0, currentUsed + bytesChange),
    });
  }
}

// Export types for use in other files
export type { User, DocumentSnapshot, QueryDocumentSnapshot };
export { Timestamp, serverTimestamp, collection, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, writeBatch };
