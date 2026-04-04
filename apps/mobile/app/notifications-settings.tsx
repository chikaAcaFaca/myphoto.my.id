import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const NOTIF_KEY = '@myphoto/notifications';

interface NotifSettings {
  uploadComplete: boolean;
  memoriesReady: boolean;
  storageWarning: boolean;
  weeklySummary: boolean;
}

const defaults: NotifSettings = {
  uploadComplete: true,
  memoriesReady: true,
  storageWarning: true,
  weeklySummary: false,
};

export default function NotificationsSettingsScreen() {
  const { colors: tc } = useTheme();
  const [settings, setSettings] = useState<NotifSettings>(defaults);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      if (val) setSettings({ ...defaults, ...JSON.parse(val) });
    });
  }, []);

  const update = (key: keyof NotifSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Obavestenja</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
        <Text style={styles.sectionLabel}>OBAVESTAVAJ ME KADA</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Upload zavrsen</Text>
            <Text style={styles.settingDesc}>Obavestenje kada se upload slika zavrsi</Text>
          </View>
          <Switch
            value={settings.uploadComplete}
            onValueChange={(v) => update('uploadComplete', v)}
            trackColor={{ false: '#cbd5e1', true: colors.success }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Secanja spremna</Text>
            <Text style={styles.settingDesc}>Obavestenje kada imate nova secanja</Text>
          </View>
          <Switch
            value={settings.memoriesReady}
            onValueChange={(v) => update('memoriesReady', v)}
            trackColor={{ false: '#cbd5e1', true: colors.success }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Upozorenje za skladiste</Text>
            <Text style={styles.settingDesc}>Kada je skladiste skoro puno (80%+)</Text>
          </View>
          <Switch
            value={settings.storageWarning}
            onValueChange={(v) => update('storageWarning', v)}
            trackColor={{ false: '#cbd5e1', true: colors.success }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Nedeljni pregled</Text>
            <Text style={styles.settingDesc}>Kratak pregled aktivnosti svake nedelje</Text>
          </View>
          <Switch
            value={settings.weeklySummary}
            onValueChange={(v) => update('weeklySummary', v)}
            trackColor={{ false: '#cbd5e1', true: colors.success }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg, marginHorizontal: 12, marginTop: 12,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  sectionLabel: { fontSize: 10, ...fonts.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  settingText: { fontSize: 13, color: colors.text, ...fonts.medium },
  settingDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
