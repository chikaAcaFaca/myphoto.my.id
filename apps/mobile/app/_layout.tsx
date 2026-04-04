// Polyfill crypto.getRandomValues for React Native (must be first import)
import 'react-native-get-random-values';

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { SyncProvider } from '@/lib/sync-context';
import { ThemeProvider } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

const ONBOARDING_COMPLETE_KEY = '@myphoto/onboarding_complete';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, [user]);

  useEffect(() => {
    if (isLoading || onboardingDone === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onOnboarding = segments[0] === 'onboarding';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (!onboardingDone && !onOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingDone && (inAuthGroup || onOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, onboardingDone]);

  useEffect(() => {
    if (!isLoading && onboardingDone !== null) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, onboardingDone]);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  // SyncProvider must always wrap Slot for authenticated users because
  // Expo Router v6 eagerly renders all tab screens including Settings/Upload
  // which use useSync(). Without this, they crash with "useSync must be used
  // within a SyncProvider".
  return (
    <SyncProvider>
      <Slot />
    </SyncProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
