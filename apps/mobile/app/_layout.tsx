// Polyfill crypto.getRandomValues for React Native (must be first import)
import 'react-native-get-random-values';

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Suppress non-critical warnings in production
LogBox.ignoreLogs(['Warning:', 'Setting a timer']);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
});

// Lazy-load auth and sync providers to catch init errors
let AuthProviderComponent: React.ComponentType<{ children: React.ReactNode }> | null = null;
let SyncProviderComponent: React.ComponentType<{ children: React.ReactNode }> | null = null;
let useAuthHook: (() => { isLoading: boolean; user: any; error: string | null }) | null = null;
let loadError: string | null = null;

try {
  const authModule = require('@/lib/auth-context');
  AuthProviderComponent = authModule.AuthProvider;
  useAuthHook = authModule.useAuth;
} catch (e: any) {
  loadError = `Auth load error: ${e.message}`;
}

try {
  const syncModule = require('@/lib/sync-context');
  SyncProviderComponent = syncModule.SyncProvider;
} catch (e: any) {
  loadError = (loadError ? loadError + '\n' : '') + `Sync load error: ${e.message}`;
}

function RootLayoutNav() {
  const auth = useAuthHook ? useAuthHook() : { isLoading: false, user: null, error: 'Auth not loaded' };
  const { isLoading, user, error } = auth;
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Safety timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setTimedOut(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (loadError || timedOut || error) {
    return (
      <View style={s.container}>
        <Text style={s.title}>MyPhoto</Text>
        <Text style={s.subtitle}>
          {loadError ? 'Greška pri učitavanju' : error ? 'Greška pri inicijalizaciji' : 'Inicijalizacija traje predugo'}
        </Text>
        <Text style={s.error}>{loadError || error || 'Auth timeout'}</Text>
        <Text style={s.debug}>
          {`Project: ${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}\n`}
          {`API: ${process.env.EXPO_PUBLIC_API_URL || 'NOT SET'}\n`}
          {`Key: ${process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'NOT SET'}\n`}
          {`AppID: ${process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'NOT SET'}`}
        </Text>
        <TouchableOpacity style={s.button} onPress={() => { setTimedOut(false); }}>
          <Text style={s.buttonText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </>
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  error: { fontSize: 12, color: '#dc2626', marginBottom: 12, textAlign: 'center', paddingHorizontal: 16 },
  debug: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 24, fontFamily: 'monospace' },
  button: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default function RootLayout() {
  const AuthProvider = AuthProviderComponent || (({ children }: any) => children);
  const SyncProvider = SyncProviderComponent || (({ children }: any) => children);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncProvider>
          <RootLayoutNav />
        </SyncProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
