import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { FileMetadata } from '@myphoto/shared';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

function daysRemaining(trashedAt: string | Date): number {
  const trashed = new Date(trashedAt).getTime();
  const now = Date.now();
  const diff = 30 - Math.floor((now - trashed) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function TrashScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { getToken } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrash = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/files?isTrashed=true&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.files || data.items || []);
    } catch (e) {
      console.error('Error fetching trash:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const onRefresh = () => { setRefreshing(true); fetchTrash(); };

  const handleEmptyTrash = () => {
    if (files.length === 0) return;
    Alert.alert(
      t('trash.emptyConfirmTitle'),
      t('trash.emptyConfirmMessage', { count: files.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trash.emptyAction'), style: 'destructive', onPress: async () => {
            try {
              const token = await getToken();
              await fetch(`${API_URL}/api/files/empty-trash`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token || ''}` },
              });
              setFiles([]);
            } catch (e) {
              Alert.alert(t('common.error'), t('trash.emptyFailed'));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={[styles.cell, { backgroundColor: tc.bgInput }]}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/photo-viewer',
        params: { id: item.id, name: item.name, type: item.type, isTrashed: '1' },
      })}
    >
      <Image
        source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=small` }}
        style={styles.cellImage}
        resizeMode="cover"
      />
      {item.trashedAt && (
        <View style={styles.daysBadge}>
          <Text style={styles.daysText}>{t('trash.daysLeft', { days: daysRemaining(item.trashedAt) })}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader
        title={t('trash.title')}
        actions={
          <TouchableOpacity
            onPress={handleEmptyTrash}
            accessibilityRole="button"
            style={[styles.emptyBtn, { backgroundColor: tc.bgInput }]}
          >
            <Text style={[styles.emptyBtnText, { color: tc.error }]}>{t('trash.emptyAction')}</Text>
          </TouchableOpacity>
        }
      />

      <View style={[styles.notice, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={tc.textSecondary} />
        <Text style={[styles.noticeText, { color: tc.textSecondary }]}>{t('trash.notice')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trash-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('trash.empty')}</Text>
          <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>{t('trash.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  emptyBtn: { height: 44, borderRadius: 22, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: 14, ...fonts.semibold },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 12, ...fonts.medium },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  daysBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  daysText: { color: '#fff', fontSize: 9, ...fonts.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
