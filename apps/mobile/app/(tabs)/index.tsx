import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const PAGE_SIZE = 100;

interface LocalPhoto {
  id: string;
  uri: string;
  mediaType: 'photo' | 'video';
  creationTime: number;
  duration: number;
  filename: string;
  isUploaded: boolean;
}

export default function MyPhotoScreen() {
  const { colors: tc } = useTheme();
  const { getToken } = useAuth();
  const { isSyncing, syncProgress, pendingCount } = useSync();
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const endCursorRef = useRef<string | undefined>(undefined);
  const appState = useRef(AppState.currentState);

  // Load uploaded asset IDs from AsyncStorage (sync state)
  const loadUploadedIds = useCallback(async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const data = await AsyncStorage.getItem('@myphoto/sync_state');
      if (data) {
        const state = JSON.parse(data);
        setUploadedIds(new Set(state.uploadedAssets || []));
      }
    } catch {}
  }, []);

  // Load local photos from device MediaLibrary
  const loadLocalPhotos = useCallback(async (reset = false) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      const cursor = reset ? undefined : endCursorRef.current;

      const result = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: PAGE_SIZE,
        after: cursor,
      });

      const newPhotos: LocalPhoto[] = result.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        mediaType: asset.mediaType === 'video' ? 'video' : 'photo',
        creationTime: asset.creationTime,
        duration: asset.duration,
        filename: asset.filename,
        isUploaded: uploadedIds.has(asset.id),
      }));

      if (reset) {
        setPhotos(newPhotos);
      } else {
        setPhotos(prev => [...prev, ...newPhotos]);
      }

      setHasMore(result.hasNextPage);
      endCursorRef.current = result.endCursor;
    } catch (e) {
      console.error('Error loading photos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uploadedIds]);

  // Initial load
  useEffect(() => {
    loadUploadedIds().then(() => loadLocalPhotos(true));
  }, []);

  // Refresh uploaded IDs when sync progresses
  useEffect(() => {
    loadUploadedIds();
  }, [syncProgress, isSyncing]);

  // Update uploaded status when IDs change
  useEffect(() => {
    if (uploadedIds.size > 0) {
      setPhotos(prev => prev.map(p => ({
        ...p,
        isUploaded: uploadedIds.has(p.id),
      })));
    }
  }, [uploadedIds]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        loadUploadedIds();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [loadUploadedIds]);

  const onRefresh = () => {
    setRefreshing(true);
    endCursorRef.current = undefined;
    loadUploadedIds().then(() => loadLocalPhotos(true));
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadLocalPhotos(false);
    }
  };

  const uploadedCount = photos.filter(p => p.isUploaded).length;

  const renderPhoto = ({ item }: { item: LocalPhoto }) => (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.8}
      delayPressIn={100}
      onPress={() => router.push({
        pathname: '/photo-viewer',
        params: {
          id: item.id,
          name: item.filename,
          type: item.mediaType === 'video' ? 'video' : 'image',
          isFavorite: '0',
          localUri: item.uri,
        },
      })}
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.cellImage}
        resizeMode="cover"
      />

      {/* Cloud status badge */}
      <View style={[styles.cloudBadge, item.isUploaded ? styles.cloudBadgeUploaded : styles.cloudBadgePending]}>
        <Ionicons
          name={item.isUploaded ? 'checkmark' : 'cloud-upload-outline'}
          size={10}
          color="#fff"
        />
      </View>

      {/* Video duration badge */}
      {item.mediaType === 'video' && (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#fff" />
          {item.duration > 0 && (
            <Text style={styles.duration}>
              {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
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

      {/* Sync status bar */}
      {(isSyncing || pendingCount > 0) && (
        <View style={[styles.syncBar, { backgroundColor: isSyncing ? colors.primary : colors.accent }]}>
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.syncText}>
                Sinhronizacija... {Math.round(syncProgress)}%
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={14} color="#fff" />
              <Text style={styles.syncText}>
                {pendingCount} fajlova čeka upload
              </Text>
            </>
          )}
          <Text style={styles.syncCount}>
            ☁️ {uploadedCount}/{photos.length}
          </Text>
        </View>
      )}

      {/* Photo count */}
      {!isSyncing && pendingCount === 0 && photos.length > 0 && (
        <View style={[styles.syncBar, { backgroundColor: '#22c55e' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.syncText}>{photos.length} slika na uređaju · {uploadedCount} u cloudu</Text>
        </View>
      )}

      {/* Photo Grid */}
      {loading && photos.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptySubtext, { color: tc.textMuted, marginTop: 12 }]}>Učitavanje slika...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>Nema slika</Text>
          <Text style={[styles.emptySubtext, { color: tc.textMuted }]}>
            Dozvolite pristup slikama u Settings
          </Text>
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
          removeClippedSubviews={true}
          maxToRenderPerBatch={30}
          windowSize={10}
          initialNumToRender={30}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  syncBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 8,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 14,
  },
  syncText: { color: '#fff', fontSize: 11, ...fonts.semibold, flex: 1 },
  syncCount: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  cloudBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  cloudBadgeUploaded: { backgroundColor: 'rgba(34,197,94,0.85)' },
  cloudBadgePending: { backgroundColor: 'rgba(0,0,0,0.4)' },
  videoBadge: {
    position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  duration: { color: '#fff', fontSize: 9, ...fonts.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
