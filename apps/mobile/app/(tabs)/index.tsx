import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { apiClient, apiFetch } from '@/lib/api';
import { colors, radius, fonts } from '@/lib/theme';
import type { FileMetadata } from '@myphoto/shared';
import { formatBytes } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function MyPhotoScreen() {
  const { getToken } = useAuth();
  const [photos, setPhotos] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'cloud' | 'device'>('cloud');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPhotos = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(
        `${API_URL}/api/files?type=image&isTrashed=false&isArchived=false&page=${pageNum}&pageSize=60`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const files = data.files || data.items || [];

      if (refresh || pageNum === 1) {
        setPhotos(files);
      } else {
        setPhotos(prev => [...prev, ...files]);
      }
      setHasMore(data.hasMore ?? files.length >= 60);
      setPage(pageNum);
    } catch (e) {
      console.error('Error fetching photos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchPhotos(1);
  }, [fetchPhotos]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPhotos(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchPhotos(page + 1);
    }
  };

  const getThumbnailUrl = (photo: FileMetadata) => {
    return `${API_URL}/api/thumbnail/${photo.id}?size=small`;
  };

  const renderPhoto = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.8}
      delayPressIn={100}
      onPress={() => router.push({ pathname: '/photo-viewer', params: { id: item.id, name: item.name, type: item.type } })}
    >
      <Image
        source={{ uri: getThumbnailUrl(item), headers: {} }}
        style={styles.cellImage}
        resizeMode="cover"
      />
      {item.type === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#fff" />
          {item.duration && (
            <Text style={styles.duration}>
              {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="cloud" size={22} color="#fff" />
              <Text style={styles.headerTitle}>MyPhoto</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Ionicons name="search" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Sync bar */}
      {photos.length > 0 && (
        <View style={styles.syncBar}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>{photos.length} slika u cloudu</Text>
        </View>
      )}

      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleTab, tab === 'cloud' && styles.toggleTabActive]}
          onPress={() => setTab('cloud')}
        >
          <Text style={[styles.toggleText, tab === 'cloud' && styles.toggleTextActive]}>Cloud</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTab, tab === 'device' && styles.toggleTabActive]}
          onPress={() => setTab('device')}
        >
          <Text style={[styles.toggleText, tab === 'device' && styles.toggleTextActive]}>Device</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      {loading && photos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nema slika</Text>
          <Text style={styles.emptySubtext}>Vase slike ce se pojaviti ovde nakon sync-a</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { overflow: 'hidden' },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  syncBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent, marginHorizontal: 12, marginTop: 8,
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14,
  },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  syncText: { color: '#fff', fontSize: 11, ...fonts.semibold },
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 12, marginVertical: 10,
    backgroundColor: colors.bgInput, borderRadius: radius.md, padding: 3,
  },
  toggleTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  toggleTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  videoBadge: {
    position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  duration: { color: '#fff', fontSize: 9, ...fonts.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
