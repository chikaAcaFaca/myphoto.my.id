/**
 * In-app update check.
 *
 * The website can't read an installed native app's version, so version-aware
 * "update available" prompting has to live here, where the app knows its own
 * build. On launch we read our embedded build id (app.json → extra.appBuild),
 * ask the server for the latest published build, and if they differ we offer a
 * one-tap update that opens the public APK download. Equality = up to date, so
 * the current build never nags itself.
 *
 * RELEASE NOTE: bump BOTH `extra.appBuild` in app.json AND the server's
 * LATEST_BUILD (apps/web .../api/app/latest-version) to the new build id when
 * publishing a new APK. They must match for the freshly shipped build.
 */
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { colors, radius, fonts } from './theme';

const API = process.env.EXPO_PUBLIC_API_URL;
const CURRENT_BUILD = (Constants.expoConfig?.extra as any)?.appBuild as string | undefined;
const DISMISS_KEY = '@myphoto/update_dismissed_build';

interface LatestVersion {
  build: string;
  url: string;
  notes?: string;
}

export function AppUpdateCheck() {
  const [info, setInfo] = useState<LatestVersion | null>(null);

  useEffect(() => {
    (async () => {
      if (!API || !CURRENT_BUILD) return;
      try {
        const res = await fetch(`${API}/api/app/latest-version`);
        if (!res.ok) return;
        const data = (await res.json()) as LatestVersion;
        if (!data?.build) return;
        if (data.build === CURRENT_BUILD) return; // up to date
        // Don't nag again for a version the user already chose to skip.
        const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
        if (dismissed === data.build) return;
        setInfo(data);
      } catch {
        /* offline / server down — silently skip */
      }
    })();
  }, []);

  if (!info) return null;

  const update = () => {
    const url = info.url?.startsWith('http') ? info.url : `${API}${info.url || '/api/download/android'}`;
    Linking.openURL(url).catch(() => {});
  };

  const later = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, info.build);
    setInfo(null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={later}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Dostupna je nova verzija</Text>
          <Text style={styles.body}>
            {info.notes?.trim()
              ? info.notes
              : 'Izašla je novija verzija aplikacije sa poboljšanjima i ispravkama.'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={update}>
            <Text style={styles.primaryText}>Ažuriraj</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={later}>
            <Text style={styles.secondaryText}>Kasnije</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: 18, ...fonts.bold, color: colors.text, textAlign: 'center' },
  body: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, ...fonts.bold },
  secondaryBtn: { marginTop: 10, paddingVertical: 10 },
  secondaryText: { color: colors.textSecondary, fontSize: 14, ...fonts.medium },
});
