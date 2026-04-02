import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import type { Album } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 2;
const GAP = 10;
const CARD_W = (width - 12 * 2 - GAP) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function AlbumsScreen() {
  const { getToken } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlbums = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/albums`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAlbums(data.albums || data || []);
    } catch (e) {
      console.error('Error fetching albums:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const onRefresh = () => { setRefreshing(true); fetchAlbums(); };

  const renderAlbum = ({ item }: { item: Album }) => (
    <TouchableOpacity style={styles.albumCard} activeOpacity={0.7} delayPressIn={100}>
      {item.coverFileId ? (
        <Image
          source={{ uri: `${API_URL}/api/thumbnail/${item.coverFileId}?size=medium` }}
          style={styles.albumCover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.albumCover, styles.albumCoverEmpty]}>
          <Ionicons name="images-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.albumCount}>{item.fileCount} slika</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Albums</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nema albuma</Text>
          <Text style={styles.emptySubtext}>Kreirajte prvi album da organizujete slike</Text>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Novi album</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
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
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  row: { gap: GAP },
  albumCard: {
    width: CARD_W, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: '#fff', marginBottom: GAP,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  albumCover: { width: '100%', height: 100 },
  albumCoverEmpty: { backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  albumInfo: { padding: 10 },
  albumName: { fontSize: 13, ...fonts.bold, color: colors.text },
  albumCount: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md,
  },
  createBtnText: { color: '#fff', fontSize: 14, ...fonts.semibold },
});
