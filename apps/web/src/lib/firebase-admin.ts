import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let _db: Firestore | null = null;

export function initAdmin() {
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    _db = getFirestore(app);
  } else {
    app = getApps()[0];
    _db = getFirestore(app);
  }
}

// Lazy getter for db - initializes if not already done
export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) {
      initAdmin();
    }
    return (_db as any)[prop];
  },
});

export const auth = () => {
  if (!app) {
    initAdmin();
  }
  return getAuth();
};
