import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { setViewerPhotos } from '@/lib/photo-list-store';
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

export default function ArchiveScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { getToken } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchArchive = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/files?isArchived=true&isTrashed=false&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFiles(data.files || data.items || []);
    } catch (e) {
      console.error('Error fetching archive:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchArchive(); }, [fetchArchive]);

  const onRefresh = () => { setRefreshing(true); fetchArchive(); };

  const renderItem = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={[styles.cell, { backgroundColor: tc.bgInput }]}
      activeOpacity={0.8}
      onPress={() => {
        setViewerPhotos(files.map((f) => ({
          id: f.id, name: f.name, type: f.type, isArchived: '1',
          isFavorite: f.isFavorite ? '1' : '0',
        })));
        router.push({
          pathname: '/photo-viewer',
          params: { id: item.id, name: item.name, type: item.type, isArchived: '1', isFavorite: item.isFavorite ? '1' : '0' },
        });
      }}
    >
      <Image
        source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=small` }}
        style={styles.cellImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('archive.title')} />

      <View style={[styles.notice, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
        <Ionicons name="eye-off-outline" size={16} color={tc.textSecondary} />
        <Text style={[styles.noticeText, { color: tc.textSecondary }]}>{t('archive.notice')}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="archive-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('archive.empty')}</Text>
          <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>{t('archive.emptyHint')}</Text>
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
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1,
  },
  noticeText: { flex: 1, fontSize: 12, ...fonts.medium },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
