import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { listDevices, removeDevice, getDeviceId, type DeviceInfo } from '@/lib/device-registry';
import { radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const platformIcons: Record<string, string> = {
  android: 'phone-portrait',
  ios: 'phone-portrait',
  web: 'globe',
  desktop: 'desktop',
};

export default function DevicesScreen() {
  const { colors: tc } = useTheme();
  const { t, dateLocale } = useT();
  const { getToken } = useAuth();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const list = await listDevices(token);
      setDevices(list);
      const myId = await getDeviceId();
      setCurrentDeviceId(myId);
    } catch (e) {
      console.error('Error fetching devices:', e);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleRemove = (device: DeviceInfo) => {
    if (device.deviceId === currentDeviceId) {
      Alert.alert(t('common.error'), t('devices.cannotRemoveCurrent'));
      return;
    }
    Alert.alert(
      t('devices.removeTitle'),
      t('devices.removeConfirm', { name: device.deviceName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            const ok = await removeDevice(token, device.deviceId);
            if (ok) fetchDevices();
          },
        },
      ]
    );
  };

  const formatLastSeen = (dateStr: string) => {
    if (!dateStr) return t('devices.unknown');
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return t('devices.justNow');
    if (diff < 3600000) return t('devices.minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('devices.hoursAgo', { count: Math.floor(diff / 3600000) });
    return date.toLocaleDateString(dateLocale);
  };

  const renderDevice = ({ item }: { item: DeviceInfo }) => {
    const isCurrent = item.deviceId === currentDeviceId;
    return (
      <View style={[styles.deviceCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: isCurrent ? tc.primaryLight : tc.bgInput }]}>
          <Ionicons
            name={(platformIcons[item.platform] || 'hardware-chip') as any}
            size={22}
            color={isCurrent ? tc.primary : tc.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.deviceName, { color: tc.text }]}>{item.deviceName}</Text>
            {isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: tc.primaryLight }]}>
                <Text style={[styles.currentText, { color: tc.primary }]}>{t('devices.thisDevice')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.deviceMeta, { color: tc.textSecondary }]}>
            {item.platform} {item.appVersion ? `v${item.appVersion}` : ''} · {formatLastSeen(item.lastSeen)}
          </Text>
        </View>
        {!isCurrent && (
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            style={styles.removeBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.remove')}
          >
            <Ionicons name="trash-outline" size={18} color={tc.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('devices.title')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={item => item.deviceId}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="phone-portrait-outline" size={48} color={tc.textMuted} />
              <Text style={[styles.emptyText, { color: tc.textMuted }]}>{t('devices.empty')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.lg, marginBottom: 8,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: { fontSize: 14, ...fonts.bold },
  deviceMeta: { fontSize: 11, marginTop: 2 },
  currentBadge: {
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  currentText: { fontSize: 10, ...fonts.bold },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, marginTop: 12 },
});
