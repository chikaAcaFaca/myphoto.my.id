import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

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
  const { t } = useT();
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
      <StackHeader title={t('notifications.title')} />

      <View style={[styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
        <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('notifications.notifyMeWhen')}</Text>

        <View style={[styles.settingRow, { borderBottomColor: tc.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingText, { color: tc.text }]}>{t('notifications.uploadComplete')}</Text>
            <Text style={[styles.settingDesc, { color: tc.textSecondary }]}>{t('notifications.uploadCompleteDesc')}</Text>
          </View>
          <Switch
            value={settings.uploadComplete}
            onValueChange={(v) => update('uploadComplete', v)}
            trackColor={{ false: tc.border, true: tc.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: tc.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingText, { color: tc.text }]}>{t('notifications.memoriesReady')}</Text>
            <Text style={[styles.settingDesc, { color: tc.textSecondary }]}>{t('notifications.memoriesReadyDesc')}</Text>
          </View>
          <Switch
            value={settings.memoriesReady}
            onValueChange={(v) => update('memoriesReady', v)}
            trackColor={{ false: tc.border, true: tc.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: tc.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingText, { color: tc.text }]}>{t('notifications.storageWarning')}</Text>
            <Text style={[styles.settingDesc, { color: tc.textSecondary }]}>{t('notifications.storageWarningDesc')}</Text>
          </View>
          <Switch
            value={settings.storageWarning}
            onValueChange={(v) => update('storageWarning', v)}
            trackColor={{ false: tc.border, true: tc.primary }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingText, { color: tc.text }]}>{t('notifications.weeklySummary')}</Text>
            <Text style={[styles.settingDesc, { color: tc.textSecondary }]}>{t('notifications.weeklySummaryDesc')}</Text>
          </View>
          <Switch
            value={settings.weeklySummary}
            onValueChange={(v) => update('weeklySummary', v)}
            trackColor={{ false: tc.border, true: tc.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: {
    borderRadius: radius.xl, marginHorizontal: 12, marginTop: 4,
    paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1,
  },
  sectionLabel: { fontSize: 10, ...fonts.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  settingText: { fontSize: 15, color: colors.text, ...fonts.semibold },
  settingDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
