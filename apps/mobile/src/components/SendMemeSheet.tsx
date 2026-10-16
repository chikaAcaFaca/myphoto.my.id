import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface Target {
  id: string;
  other: { id: string; name: string };
  status: 'active' | 'request_in' | 'request_out';
}

/**
 * "Send meme to…" picker over the Meme Wall. An in-tree absolute overlay,
 * not a native <Modal>: a Modal opens a separate Android window that detaches
 * the video surface behind it (see the edit sheet in meme-wall.tsx).
 */
export function SendMemeSheet({ memeId, onClose }: { memeId: string | null; onClose: () => void }) {
  const { getToken } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!memeId) return;
    setTargets(null);
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/messages`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = res.ok ? await res.json() : { conversations: [] };
        // Only conversations we can write into.
        setTargets((data.conversations || []).filter((c: Target) => c.status === 'active'));
      } catch {
        setTargets([]);
      }
    })();
  }, [memeId, getToken]);

  if (!memeId) return null;

  const send = async (target: Target) => {
    setSendingTo(target.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/messages/${target.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ memeId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      Alert.alert(t('messages.sentTo', { name: target.other.name }));
      onClose();
    } catch {
      Alert.alert(t('messages.errors.generic'));
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('messages.cancel')} />
      <View style={[styles.sheet, { backgroundColor: tc.bgCard }]}>
        <View style={[styles.handle, { backgroundColor: tc.border }]} />
        <Text style={[styles.title, { color: tc.text }]}>{t('messages.sendTo')}</Text>
        {targets === null ? (
          <ActivityIndicator color={tc.primary} style={{ marginVertical: 24 }} />
        ) : targets.length === 0 ? (
          <Text style={[styles.empty, { color: tc.textSecondary }]}>{t('messages.sendToEmpty')}</Text>
        ) : (
          <FlatList
            data={targets}
            keyExtractor={(c) => c.id}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => send(item)}
                disabled={!!sendingTo}
                style={styles.row}
              >
                <View style={[styles.avatar, { backgroundColor: tc.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: tc.primary }]}>
                    {(item.other.name || '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.name, { color: tc.text }]} numberOfLines={1}>{item.other.name}</Text>
                {sendingTo === item.id ? (
                  <ActivityIndicator color={tc.primary} />
                ) : (
                  <Ionicons name="paper-plane-outline" size={20} color={tc.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity onPress={onClose} style={[styles.cancel, { backgroundColor: tc.bgInput }]}>
          <Text style={{ color: tc.text, fontWeight: '700' }}>{t('messages.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  cancel: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
});
