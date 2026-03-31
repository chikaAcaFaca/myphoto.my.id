// Polyfill crypto.getRandomValues for React Native (must be first import)
import 'react-native-get-random-values';

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SyncProvider } from '@/lib/sync-context';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { isLoading, user, error } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Safety timeout: if auth takes more than 10 seconds, show login anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setTimedOut(true);
        SplashScreen.hideAsync();
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show debug info if timed out or error
  if (timedOut || error) {
    return (
      <View style={debugStyles.container}>
        <Text style={debugStyles.title}>MyPhoto</Text>
        <Text style={debugStyles.subtitle}>
          {error ? 'Greška pri inicijalizaciji' : 'Inicijalizacija traje predugo'}
        </Text>
        {error && <Text style={debugStyles.error}>{error}</Text>}
        <Text style={debugStyles.debug}>
          {`Firebase Project: ${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}\n`}
          {`API URL: ${process.env.EXPO_PUBLIC_API_URL || 'NOT SET'}\n`}
          {`API Key: ${process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '***set***' : 'NOT SET'}\n`}
          {`App ID: ${process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? '***set***' : 'NOT SET'}`}
        </Text>
        <TouchableOpacity
          style={debugStyles.button}
          onPress={() => {
            setTimedOut(false);
          }}
        >
          <Text style={debugStyles.buttonText}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return null;
  }

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

const debugStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f9fafb' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  error: { fontSize: 13, color: '#dc2626', marginBottom: 16, textAlign: 'center' },
  debug: { fontSize: 11, color: '#9ca3af', backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 24, fontFamily: 'monospace' },
  button: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default function RootLayout() {
  // TEMP: Bypass all providers to test if basic UI renders
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 32 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#0ea5e9', marginBottom: 16 }}>MyPhoto</Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 }}>
        App je pokrenut uspešno!
      </Text>
      <Text style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 }}>
        {`Firebase Project: ${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}\n`}
        {`API URL: ${process.env.EXPO_PUBLIC_API_URL || 'NOT SET'}\n`}
        {`API Key: ${process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'SET ✓' : 'NOT SET ✗'}\n`}
        {`App ID: ${process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? 'SET ✓' : 'NOT SET ✗'}\n`}
        {`Google Web: ${process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ? 'SET ✓' : 'NOT SET ✗'}`}
      </Text>
    </View>
  );
}
