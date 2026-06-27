import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Dimensions, Share, ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { MemeComments } from '@/components/MemeComments';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface MemePost {
  id: string;
  imageUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  caption: string;
  topText: string;
  bottomText: string;
  authorId: string;
  authorName: string;
  likes: number;
  shares: number;
  favorites: number;
  reposts: number;
  commentCount: number;
  userReaction: 'like' | 'dislike' | null;
  userFavorited: boolean;
  userReposted: boolean;
  // Present when this meme was made by stripping someone else's caption and
  // writing a new one. Original author stays credited via the "Remix od @X"
  // badge so we don't hide attribution, only the comment.
  remixOf?: { id: string; authorId: string; authorName: string } | null;
}

// One vertical action on the TikTok-style right rail.
function RailButton({ icon, color, count, label, onPress }: {
  icon: string; color: string; count?: number; label?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.railBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={32} color={color} />
      {count !== undefined && <Text style={styles.railCount}>{count}</Text>}
      {label && <Text style={styles.railCount}>{label}</Text>}
    </TouchableOpacity>
  );
}

export default function MemeWallScreen() {
  const { colors: tc } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, getToken } = useAuth();
  const [memes, setMemes] = useState<MemePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [commentMemeId, setCommentMemeId] = useState<string | null>(null);
  const [pageH, setPageH] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find(v => v.isViewable);
    setVisibleId(first ? (first.item as MemePost).id : null);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, waitForInteraction: false }).current;

  // Map<memeId, Video ref> so we can drive the *currently visible* player
  // imperatively when shouldPlay alone isn't enough on a given device.
  const videoRefs = useRef<Map<string, Video | null>>(new Map());

  // Whenever the visible item changes, force-play it (and pause everything
  // else). Without this, expo-av sometimes paints the first frame and idles.
  useEffect(() => {
    videoRefs.current.forEach((vid, id) => {
      if (!vid) return;
      if (id === visibleId) vid.playAsync().catch(() => {});
      else vid.pauseAsync().catch(() => {});
    });
  }, [visibleId]);

  const fetchMemes = useCallback(async (pageNum: number, append = false) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall?page=${pageNum}&pageSize=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list: MemePost[] = data.memes || data.items || [];
        setHasMore(!!data.hasMore);
        setMemes(prev => (append ? [...prev, ...list] : list));
        // Prime visibleId so the first video meme starts playing immediately —
        // onViewableItemsChanged doesn't always fire on first mount before
        // the user scrolls, which left the player stuck on a still frame.
        if (!append && list.length > 0) setVisibleId(prev => prev ?? list[0].id);
      }
    } catch (e) {
      console.log('MemeWall fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMemes(1); }, [fetchMemes]);

  const onRefresh = () => { setRefreshing(true); setPage(1); fetchMemes(1); };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchMemes(next, true);
  };

  // Optimistically patch one meme in state.
  const patch = useCallback((id: string, fn: (m: MemePost) => MemePost) => {
    setMemes(prev => prev.map(m => (m.id === id ? fn(m) : m)));
  }, []);

  const handleLike = useCallback(async (m: MemePost) => {
    const wasLiked = m.userReaction === 'like';
    patch(m.id, x => ({
      ...x,
      userReaction: wasLiked ? null : 'like',
      likes: Math.max(0, x.likes + (wasLiked ? -1 : 1)),
    }));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${m.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: 'like' }),
      });
      if (res.ok) {
        const d = await res.json();
        patch(m.id, x => ({ ...x, userReaction: d.userReaction, likes: d.likes }));
      }
    } catch {
      patch(m.id, x => ({ ...x, userReaction: wasLiked ? 'like' : null, likes: m.likes }));
    }
  }, [getToken, patch]);

  const handleFavorite = useCallback(async (m: MemePost) => {
    const was = m.userFavorited;
    patch(m.id, x => ({ ...x, userFavorited: !was, favorites: Math.max(0, x.favorites + (was ? -1 : 1)) }));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${m.id}/favorite`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        patch(m.id, x => ({ ...x, userFavorited: d.favorited, favorites: d.favorites }));
      }
    } catch {
      patch(m.id, x => ({ ...x, userFavorited: was, favorites: m.favorites }));
    }
  }, [getToken, patch]);

  const handleRepost = useCallback(async (m: MemePost) => {
    const was = m.userReposted;
    patch(m.id, x => ({ ...x, userReposted: !was, reposts: Math.max(0, x.reposts + (was ? -1 : 1)) }));
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${m.id}/repost`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        patch(m.id, x => ({ ...x, userReposted: d.reposted, reposts: d.reposts }));
      }
    } catch {
      patch(m.id, x => ({ ...x, userReposted: was, reposts: m.reposts }));
    }
  }, [getToken, patch]);

  const handleShare = useCallback(async (m: MemePost) => {
    try {
      await Share.share({
        message: `${m.caption}\n\nPogledaj još mimova na MyPhoto!\nhttps://myphotomy.space/meme/${m.id}`,
      });
      patch(m.id, x => ({ ...x, shares: x.shares + 1 }));
      const token = await getToken();
      await fetch(`${API_URL}/api/meme-wall/${m.id}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
  }, [getToken, patch]);

  const openProfile = (m: MemePost) =>
    router.push({ pathname: '/meme-profile', params: { userId: m.authorId, userName: m.authorName } });

  // Remix: open meme-creator with the same source media but empty captions —
  // user types their own. We tag the new meme with remixOfId so the wall can
  // credit the original author. Works for video / gif (overlay text — strips
  // cleanly) and falls through for image memes where the old text is baked.
  const handleRemix = useCallback((m: MemePost) => {
    router.push({
      pathname: '/meme-creator',
      params: {
        uri: m.imageUrl,
        type: m.mediaType,
        name: 'Remix',
        remixOfId: m.id,
        remixOfAuthor: m.authorName,
      },
    });
  }, []);

  const renderMeme = useCallback(({ item }: { item: MemePost }) => (
    <View style={[styles.page, { height: pageH, width }]}>
      {item.mediaType === 'video' ? (
        <Video
          // Callback ref stores per-item handles into videoRefs so the effect
          // above can imperatively play/pause the right one as visibility
          // shifts on the pager.
          ref={(r) => { videoRefs.current.set(item.id, r); }}
          source={{ uri: item.imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={visibleId === item.id}
          isLooping
          isMuted={false}
          onLoad={() => {
            if (visibleId === item.id) {
              videoRefs.current.get(item.id)?.playAsync().catch(() => {});
            }
          }}
        />
      ) : (
        <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
      )}

      {/* Video/gif memes aren't baked — overlay the meme text on top */}
      {item.mediaType !== 'image' && (item.topText || item.bottomText) ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {item.topText ? <Text style={[styles.memeText, styles.memeTop]} numberOfLines={3}>{item.topText.toUpperCase()}</Text> : null}
          {item.bottomText ? <Text style={[styles.memeText, styles.memeBottom]} numberOfLines={3}>{item.bottomText.toUpperCase()}</Text> : null}
        </View>
      ) : null}

      {/* Right action rail */}
      <View style={[styles.rail, { bottom: insets.bottom + 90 }]}>
        <TouchableOpacity style={styles.railBtn} onPress={() => openProfile(item)} activeOpacity={0.8}>
          <View style={styles.railAvatar}>
            <Text style={styles.railAvatarText}>{(item.authorName || '?')[0].toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
        <RailButton
          icon={item.userReaction === 'like' ? 'heart' : 'heart-outline'}
          color={item.userReaction === 'like' ? '#ef4444' : '#fff'}
          count={item.likes}
          onPress={() => handleLike(item)}
        />
        <RailButton icon="chatbubble-outline" color="#fff" count={item.commentCount} onPress={() => setCommentMemeId(item.id)} />
        <RailButton
          icon={item.userFavorited ? 'bookmark' : 'bookmark-outline'}
          color={item.userFavorited ? '#facc15' : '#fff'}
          count={item.favorites}
          onPress={() => handleFavorite(item)}
        />
        <RailButton
          icon="repeat"
          color={item.userReposted ? '#22c55e' : '#fff'}
          count={item.reposts}
          onPress={() => handleRepost(item)}
        />
        <RailButton icon="arrow-redo-outline" color="#fff" count={item.shares} onPress={() => handleShare(item)} />
        <RailButton
          icon="refresh-outline"
          color="#fff"
          label="Remix"
          onPress={() => handleRemix(item)}
        />
      </View>

      {/* Bottom author + caption */}
      <View style={[styles.bottomInfo, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => openProfile(item)}>
          <Text style={styles.authorHandle}>@{item.authorName}</Text>
        </TouchableOpacity>
        {/* Remix attribution — appears between handle + caption, makes it
            clear "this meme rides on top of someone else's video". */}
        {item.remixOf ? (
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/meme-profile',
              params: { userId: item.remixOf!.authorId, userName: item.remixOf!.authorName },
            })}
            style={styles.remixBadge}
          >
            <Ionicons name="refresh-outline" size={11} color="#fff" />
            <Text style={styles.remixBadgeText}>Remix od @{item.remixOf.authorName}</Text>
          </TouchableOpacity>
        ) : null}
        {item.caption ? <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text> : null}
      </View>
    </View>
  ), [pageH, visibleId, insets.bottom, handleLike, handleFavorite, handleRepost, handleShare, handleRemix]);

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
      {/* Floating header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerCenter}>
          <Ionicons name="flame" size={20} color="#fff" />
          <Text style={styles.headerTitle}>MemeWall</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/creative-hub')} style={styles.createBtn}>
          <Ionicons name="add" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {loading || pageH === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : memes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="flame-outline" size={64} color="#64748b" />
          <Text style={styles.emptyText}>MemeWall je prazan!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/creative-hub')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Napravi meme</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={memes}
          renderItem={renderMeme}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: pageH, offset: pageH * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} /> : null}
        />
      )}

      <MemeComments
        memeId={commentMemeId}
        visible={!!commentMemeId}
        onClose={() => setCommentMemeId(null)}
        onPosted={() => patch(commentMemeId!, x => ({ ...x, commentCount: (x.commentCount || 0) + 1 }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 20, ...fonts.extrabold, color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  createBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 18, ...fonts.bold, color: '#fff', marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f97316',
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },
  page: { backgroundColor: '#000', justifyContent: 'center' },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 18 },
  railBtn: { alignItems: 'center', gap: 3 },
  railCount: { color: '#fff', fontSize: 12, ...fonts.bold, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3 },
  railAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#f97316',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  railAvatarText: { color: '#fff', fontSize: 18, ...fonts.extrabold },
  bottomInfo: { position: 'absolute', left: 14, right: 80 },
  authorHandle: { color: '#fff', fontSize: 15, ...fonts.extrabold, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, marginBottom: 6 },
  caption: { color: '#fff', fontSize: 14, ...fonts.medium, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, lineHeight: 19 },
  remixBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12,
  },
  remixBadgeText: { color: '#fff', fontSize: 11, ...fonts.semibold },
  memeText: {
    position: 'absolute', left: 12, right: 12, textAlign: 'center', color: '#fff',
    fontSize: 28, ...fonts.extrabold, textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5,
  },
  memeTop: { top: '8%' },
  memeBottom: { bottom: '24%' },
});
