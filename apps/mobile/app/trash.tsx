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

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

function daysRemaining(trashedAt: string): number {
  const trashed = new Date(trashedAt).getTime();
  const now = Date.now();
  const diff = 30 - Math.floor((now - trashed) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export default function TrashScreen() {
  const { colors: tc } = useTheme();
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
      'Isprazni korpu?',
      `Svi fajlovi (${files.length}) ce biti trajno obrisani. Ova akcija je nepovratna.`,
      [
        { text: 'Otkazi', style: 'cancel' },
        {
          text: 'Isprazni', style: 'destructive', onPress: async () => {
            try {
              const token = await getToken();
              await fetch(`${API_URL}/api/files/empty-trash`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token || ''}` },
              });
              setFiles([]);
            } catch (e) {
              Alert.alert('Greska', 'Nije moguce isprazniti korpu.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={styles.cell}
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
          <Text style={styles.daysText}>{daysRemaining(item.trashedAt)}d</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Korpa</Text>
          <TouchableOpacity onPress={handleEmptyTrash}>
            <Text style={styles.emptyBtn}>Isprazni</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
        <Text style={styles.noticeText}>Fajlovi se automatski brisu nakon 30 dana</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trash-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Korpa je prazna</Text>
          <Text style={styles.emptySubtext}>Obrisani fajlovi ce se pojaviti ovde</Text>
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
  emptyBtn: { fontSize: 13, ...fonts.semibold, color: 'rgba(255,255,255,0.8)' },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    backgroundColor: '#fef9c3', borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12,
  },
  noticeText: { fontSize: 11, color: colors.textSecondary, ...fonts.medium },
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
