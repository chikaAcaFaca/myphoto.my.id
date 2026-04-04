import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function ArchiveScreen() {
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
      style={styles.cell}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/photo-viewer',
        params: { id: item.id, name: item.name, type: item.type, isArchived: '1', isFavorite: item.isFavorite ? '1' : '0' },
      })}
    >
      <Image
        source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=small` }}
        style={styles.cellImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arhiva</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <View style={styles.notice}>
        <Ionicons name="eye-off-outline" size={16} color={colors.textMuted} />
        <Text style={styles.noticeText}>Arhivirane slike su skrivene iz glavne galerije</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="archive-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Arhiva je prazna</Text>
          <Text style={styles.emptySubtext}>Arhivirajte slike da ih sakrijete iz galerije</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    backgroundColor: '#f0f9ff', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  noticeText: { fontSize: 11, color: colors.textSecondary, ...fonts.medium },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
