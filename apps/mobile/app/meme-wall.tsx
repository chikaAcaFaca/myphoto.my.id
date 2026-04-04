import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Share, Alert, ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface MemePost {
  id: string;
  imageUrl: string;
  videoUrl?: string;
  mediaType: 'image' | 'video' | 'gif';
  caption: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  shares: number;
  createdAt: string;
  liked: boolean;
}

export default function MemeWallScreen() {
  const { colors: tc } = useTheme();
  const { getToken } = useAuth();
  const [memes, setMemes] = useState<MemePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleId, setVisibleId] = useState<string | null>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const firstVideo = viewableItems.find(v => {
      const item = v.item as MemePost;
      return item.mediaType === 'video' && v.isViewable;
    });
    setVisibleId(firstVideo ? (firstVideo.item as MemePost).id : null);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const fetchMemes = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall?pageSize=30`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMemes(data.memes || data.items || []);
      }
    } catch (e) {
      console.log('MemeWall fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMemes(); }, [fetchMemes]);

  const onRefresh = () => { setRefreshing(true); fetchMemes(); };

  const handleLike = useCallback(async (memeId: string) => {
    setMemes(prev => prev.map(m =>
      m.id === memeId
        ? { ...m, liked: !m.liked, likes: m.liked ? m.likes - 1 : m.likes + 1 }
        : m
    ));
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/meme-wall/${memeId}/like`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      // Rollback on error
      setMemes(prev => prev.map(m =>
        m.id === memeId
          ? { ...m, liked: !m.liked, likes: m.liked ? m.likes - 1 : m.likes + 1 }
          : m
      ));
    }
  }, [getToken]);

  const handleShare = useCallback(async (meme: MemePost) => {
    await Share.share({
      message: `${meme.caption}\n\nPogledaj jos mimova na MyPhoto!\nhttps://myphotomy.space/meme-wall/${meme.id}`,
    });
    // Track share
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/meme-wall/${meme.id}/share`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  }, [getToken]);

  const renderMeme = ({ item }: { item: MemePost }) => (
    <View style={[styles.memeCard, { backgroundColor: tc.bgCard }]}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: tc.primary }]}>
          <Text style={styles.avatarText}>{(item.authorName || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.authorName, { color: tc.text }]}>{item.authorName}</Text>
          <Text style={{ fontSize: 10, color: tc.textMuted }}>
            {new Date(item.createdAt).toLocaleDateString('sr-Latn')}
          </Text>
        </View>
      </View>

      {/* Meme media */}
      {item.mediaType === 'video' && item.videoUrl ? (
        <View>
          <Video
            source={{ uri: item.videoUrl }}
            style={styles.memeImage}
            resizeMode={ResizeMode.COVER}
            shouldPlay={visibleId === item.id}
            isLooping
            isMuted={false}
          />
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={12} color="#fff" />
          </View>
        </View>
      ) : (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.memeImage}
          contentFit="cover"
          transition={200}
        />
      )}
      {item.mediaType === 'gif' && (
        <View style={styles.videoBadge}>
          <Text style={{ color: '#fff', fontSize: 10, ...fonts.bold }}>GIF</Text>
        </View>
      )}

      {/* Caption */}
      {item.caption ? (
        <Text style={[styles.caption, { color: tc.text }]}>{item.caption}</Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
          <Ionicons
            name={item.liked ? 'heart' : 'heart-outline'}
            size={22}
            color={item.liked ? '#ef4444' : tc.textMuted}
          />
          <Text style={[styles.actionCount, { color: tc.textMuted }]}>{item.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
          <Ionicons name="share-outline" size={20} color={tc.textMuted} />
          <Text style={[styles.actionCount, { color: tc.textMuted }]}>{item.shares}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <Text style={styles.watermark}>MyPhoto</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: '#f97316' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Ionicons name="flame" size={20} color="#fff" />
            <Text style={styles.headerTitle}>MemeWall</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/creative-hub')} style={styles.backBtn}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : memes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flame-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>MemeWall je prazan!</Text>
          <Text style={[styles.emptySubtext, { color: tc.textMuted }]}>Budi prvi koji ce objaviti meme</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: '#f97316' }]}
            onPress={() => router.push('/creative-hub')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Napravi meme</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={memes}
          renderItem={renderMeme}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBg: { paddingHorizontal: 16, paddingVertical: 12, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, marginTop: 12 },
  emptySubtext: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, marginTop: 16,
  },
  createBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },
  // Meme card
  memeCard: {
    marginHorizontal: 8, borderRadius: radius.lg, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  authorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, paddingBottom: 8,
  },
  avatar: {
    width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, ...fonts.bold },
  authorName: { fontSize: 13, ...fonts.bold },
  memeImage: { width: '100%', aspectRatio: 1 },
  caption: { fontSize: 13, ...fonts.medium, paddingHorizontal: 12, paddingTop: 10, lineHeight: 18 },
  actionsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 12, paddingTop: 8,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, ...fonts.semibold },
  watermark: { fontSize: 10, color: colors.textMuted, ...fonts.medium },
  videoBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
});
