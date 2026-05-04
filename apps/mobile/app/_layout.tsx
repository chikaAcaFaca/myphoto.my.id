// Polyfill crypto.getRandomValues for React Native (must be first import)
import 'react-native-get-random-values';

// Disable native screens to avoid reanimated native module dependency
import { enableScreens } from 'react-native-screens';
enableScreens(false);

import React, { useEffect, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
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

// Error Boundary to catch crashes and show error on screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>MyPhoto Crash Report</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>{this.state.error.message}</Text>
            <Text style={styles.errorStack}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Re-read onboarding status whenever user or route changes
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, [user, segments]);

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

  return (
    <SyncProvider>
      <Slot />
    </SyncProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
    paddingTop: 60,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorScroll: {
    flex: 1,
  },
  errorText: {
    color: '#fbbf24',
    fontSize: 14,
    marginBottom: 12,
  },
  errorStack: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
