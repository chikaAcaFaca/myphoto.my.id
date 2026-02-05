import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@myphoto/shared';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut as firebaseSignOut,
  onAuthChange,
  getUserDocument,
  resetPassword,
} from '../firebase';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      firebaseUser: null,
      isLoading: true,
      isInitialized: false,
      error: null,

      initialize: () => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
          try {
            if (firebaseUser) {
              const userDoc = await getUserDocument(firebaseUser.uid);
              set({
                firebaseUser,
                user: userDoc,
                isLoading: false,
                isInitialized: true,
              });
            } else {
              set({
                firebaseUser: null,
                user: null,
                isLoading: false,
                isInitialized: true,
              });
            }
          } catch (error) {
            console.error('Auth initialization error:', error);
            // Still mark as initialized so app doesn't hang
            set({
              firebaseUser,
              user: null,
              isLoading: false,
              isInitialized: true,
              error: error instanceof Error ? error.message : 'Failed to initialize auth',
            });
          }
        });

        return unsubscribe;
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const firebaseUser = await signInWithGoogle();
          const userDoc = await getUserDocument(firebaseUser.uid);
          set({ firebaseUser, user: userDoc, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sign in with Google',
            isLoading: false,
          });
          throw error;
        }
      },

      signInWithEmail: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const firebaseUser = await signInWithEmail(email, password);
          const userDoc = await getUserDocument(firebaseUser.uid);
          set({ firebaseUser, user: userDoc, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sign in',
            isLoading: false,
          });
          throw error;
        }
      },

      signUpWithEmail: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });
        try {
          const firebaseUser = await signUpWithEmail(email, password, displayName);
          const userDoc = await getUserDocument(firebaseUser.uid);
          set({ firebaseUser, user: userDoc, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create account',
            isLoading: false,
          });
          throw error;
        }
      },

      signOut: async () => {
        set({ isLoading: true, error: null });
        try {
          await firebaseSignOut();
          set({ firebaseUser: null, user: null, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to sign out',
            isLoading: false,
          });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await resetPassword(email);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to send reset email',
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      refreshUser: async () => {
        const { firebaseUser } = get();
        if (firebaseUser) {
          const userDoc = await getUserDocument(firebaseUser.uid);
          set({ user: userDoc });
        }
      },
    }),
    {
      name: 'myphoto-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist minimal data, not sensitive info
      }),
    }
  )
);
