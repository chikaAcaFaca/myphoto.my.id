// Polyfill crypto.getRandomValues for React Native (must be first import)
import 'react-native-get-random-values';

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// Test Firebase init inline — no providers
let firebaseStatus = 'not started';
let authStatus = 'not started';
let authCallbackFired = false;

try {
  const { initializeApp, getApps } = require('firebase/app');

  const config = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };

  const app = !getApps().length ? initializeApp(config) : getApps()[0];
  firebaseStatus = 'OK: ' + (app.name || 'default');

  try {
    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    const auth = getAuth(app);
    authStatus = 'getAuth OK, waiting callback...';

    onAuthStateChanged(auth, (user: any) => {
      authCallbackFired = true;
      authStatus = user ? `logged in: ${user.email}` : 'not logged in';
    });
  } catch (e: any) {
    authStatus = 'ERROR: ' + e.message;
  }
} catch (e: any) {
  firebaseStatus = 'ERROR: ' + e.message;
}

function DebugApp() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Re-render every second to show updated status
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={s.container}>
      <Text style={s.title}>MyPhoto Debug</Text>
      <Text style={s.label}>Firebase App:</Text>
      <Text style={s.value}>{firebaseStatus}</Text>
      <Text style={s.label}>Auth:</Text>
      <Text style={s.value}>{authStatus}</Text>
      <Text style={s.label}>Callback fired:</Text>
      <Text style={s.value}>{authCallbackFired ? 'YES' : `NO (waiting ${tick}s...)`}</Text>
      <Text style={s.label}>Config:</Text>
      <Text style={s.config}>
        {`apiKey: ${process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.substring(0, 10)}...\n`}
        {`project: ${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}\n`}
        {`appId: ${process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.substring(0, 20)}...\n`}
        {`authDomain: ${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN}`}
      </Text>
      {tick > 5 && !authCallbackFired && (
        <Text style={s.hint}>
          Auth callback nikad nije stigao.{'\n'}
          getAuth() bez persistence ne radi na RN.
        </Text>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <DebugApp />
    </QueryClientProvider>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  value: { fontSize: 14, color: '#111', fontWeight: '600' },
  config: { fontSize: 10, color: '#666', fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 8, borderRadius: 6, marginTop: 4 },
  hint: { fontSize: 13, color: '#dc2626', marginTop: 20, textAlign: 'center', lineHeight: 20 },
});
