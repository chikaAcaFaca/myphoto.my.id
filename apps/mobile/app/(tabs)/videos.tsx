import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 2;
const GAP = 8;
const CARD_W = (width - 12 * 2 - GAP) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface DeviceVideo {
  id: string;
  uri: string;
  filename: string;
  duration: number;
  creationTime: number;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideosScreen() {
  const { colors: tc } = useTheme();
  const { getToken } = useAuth();
  const [cloudVideos, setCloudVideos] = useState<FileMetadata[]>([]);
  const [deviceVideos, setDeviceVideos] = useState<DeviceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'device' | 'cloud'>('cloud');

  const fetchCloudVideos = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${API_URL}/api/files?type=video&isTrashed=false&isArchived=false&pageSize=60`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setCloudVideos(data.files || data.items || []);
    } catch (e) {
      console.error('Error fetching cloud videos:', e);
    }
  }, [getToken]);

  const fetchDeviceVideos = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['video']);
      if (status !== 'granted') return;
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: ['video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 60,
      });
      setDeviceVideos(assets.map(a => ({
        id: a.id,
        uri: a.uri,
        filename: a.filename,
        duration: a.duration,
        creationTime: a.creationTime,
      })));
    } catch (e) {
      console.log('Device videos not available:', e?.toString?.() || e);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCloudVideos(), fetchDeviceVideos()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchCloudVideos, fetchDeviceVideos]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const displayVideos = filter === 'cloud' ? cloudVideos : filter === 'device' ? [] : cloudVideos; // device uses separate list

  const renderVideo = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity style={[styles.videoCard, { backgroundColor: tc.bgCard }]} activeOpacity={0.7} delayPressIn={100}>
      <View style={styles.videoThumb}>
        {item.thumbnailKey ? (
          <Image
            source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=medium` }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbImage, { backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="videocam" size={28} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.playBtn}>
          <Ionicons name="play" size={18} color={colors.primary} />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={[styles.videoName, { color: tc.text }]} numberOfLines={1}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <Text style={styles.headerTitle}>Video</Text>
      </View>

      {/* Filter toggle */}
      <View style={styles.toggleContainer}>
        {(['all', 'device', 'cloud'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.toggleTab, filter === f && [styles.toggleTabActive, { backgroundColor: tc.bgCard }]]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.toggleText, filter === f && styles.toggleTextActive]}>
              {f === 'all' ? 'Svi' : f === 'device' ? 'Device' : 'Cloud'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : displayVideos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="videocam-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>Nema videa</Text>
          <Text style={[styles.emptySubtext, { color: tc.textMuted }]}>Vasi video snimci ce se pojaviti ovde</Text>
        </View>
      ) : (
        <FlatList
          data={displayVideos}
          renderItem={renderVideo}
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
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 12, marginVertical: 10,
    backgroundColor: colors.bgInput, borderRadius: radius.md, padding: 3,
  },
  toggleTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  toggleTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary },
  toggleTextActive: { color: colors.primary },
  row: { gap: GAP },
  videoCard: {
    width: CARD_W, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: '#fff', marginBottom: GAP,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  videoThumb: { width: '100%', height: 110, position: 'relative', backgroundColor: colors.bgInput },
  thumbImage: { width: '100%', height: '100%' },
  playBtn: {
    position: 'absolute', top: '50%', left: '50%', marginTop: -18, marginLeft: -18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  durationBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 10, ...fonts.semibold },
  videoInfo: { padding: 8 },
  videoName: { fontSize: 11, ...fonts.medium, color: colors.text },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
