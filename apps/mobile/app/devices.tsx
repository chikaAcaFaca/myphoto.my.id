import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { listDevices, removeDevice, getDeviceId, type DeviceInfo } from '@/lib/device-registry';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const platformIcons: Record<string, string> = {
  android: 'phone-portrait',
  ios: 'phone-portrait',
  web: 'globe',
  desktop: 'desktop',
};

export default function DevicesScreen() {
  const { colors: tc } = useTheme();
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
      Alert.alert('Greska', 'Ne mozete ukloniti trenutni uredjaj.');
      return;
    }
    Alert.alert(
      'Ukloni uredjaj',
      `Da li zelite da uklonite "${device.deviceName}"?`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Ukloni',
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
    if (!dateStr) return 'Nepoznato';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Upravo';
    if (diff < 3600000) return `Pre ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Pre ${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('sr');
  };

  const renderDevice = ({ item }: { item: DeviceInfo }) => {
    const isCurrent = item.deviceId === currentDeviceId;
    return (
      <View style={[styles.deviceCard, { backgroundColor: tc.bgCard }]}>
        <View style={[styles.iconWrap, { backgroundColor: isCurrent ? colors.primary + '20' : '#f1f5f9' }]}>
          <Ionicons
            name={(platformIcons[item.platform] || 'hardware-chip') as any}
            size={22}
            color={isCurrent ? colors.primary : tc.textMuted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.deviceName, { color: tc.text }]}>{item.deviceName}</Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentText}>Ovaj uredjaj</Text>
              </View>
            )}
          </View>
          <Text style={[styles.deviceMeta, { color: tc.textMuted }]}>
            {item.platform} {item.appVersion ? `v${item.appVersion}` : ''} · {formatLastSeen(item.lastSeen)}
          </Text>
        </View>
        {!isCurrent && (
          <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moji uredjaji</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
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
              <Text style={[styles.emptyText, { color: tc.textMuted }]}>Nema registrovanih uredjaja</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8,
  },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radius.lg, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: { fontSize: 14, ...fonts.bold },
  deviceMeta: { fontSize: 11, marginTop: 2 },
  currentBadge: {
    backgroundColor: colors.primary + '20', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  currentText: { fontSize: 9, color: colors.primary, ...fonts.bold },
  removeBtn: { padding: 8 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
