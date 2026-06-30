import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Dimensions, Share, ViewToken, Alert, Modal, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
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
  // Profile mode: when opened from a profile grid, this screen shows ONE
  // author's published memes (TikTok-style) starting at the tapped one.
  const { profileUserId, profileName, startId } = useLocalSearchParams<{
    profileUserId?: string; profileName?: string; startId?: string;
  }>();
  const isProfileMode = !!profileUserId;
  const [memes, setMemes] = useState<MemePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [commentMemeId, setCommentMemeId] = useState<string | null>(null);
  const [pageH, setPageH] = useState(0);
  const [editMeme, setEditMeme] = useState<MemePost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTop, setEditTop] = useState('');
  const [editBottom, setEditBottom] = useState('');
  const [editSaving, setEditSaving] = useState(false);

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
      // Profile mode uses the per-user endpoint (same shape as the wall);
      // single load, no page pagination.
      const url = profileUserId
        ? `${API_URL}/api/users/${profileUserId}/memes?pageSize=60`
        : `${API_URL}/api/meme-wall?page=${pageNum}&pageSize=20`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list: MemePost[] = data.memes || data.items || [];
        setHasMore(profileUserId ? false : !!data.hasMore);
        setMemes(prev => (append ? [...prev, ...list] : list));
        // Prime visibleId so the first video meme starts playing immediately —
        // onViewableItemsChanged doesn't always fire on first mount before
        // the user scrolls. In profile mode start on the tapped meme.
        if (!append && list.length > 0) setVisibleId(prev => prev ?? (startId || list[0].id));
      }
    } catch (e) {
      console.log('MemeWall fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [getToken, profileUserId, startId]);

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

  // ---- Owner edit / delete (shown only on the current user's own memes) ----
  const handleDelete = useCallback((m: MemePost) => {
    Alert.alert('Obriši meme?', 'Ovo trajno briše ovaj meme.', [
      { text: 'Otkaži', style: 'cancel' },
      {
        text: 'Obriši', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/meme-wall/${m.id}`, {
              method: 'DELETE',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) setMemes(prev => prev.filter(x => x.id !== m.id));
            else Alert.alert('Greška', 'Brisanje nije uspelo.');
          } catch { Alert.alert('Greška', 'Brisanje nije uspelo.'); }
        },
      },
    ]);
  }, [getToken]);

  const openEdit = useCallback((m: MemePost) => {
    setEditMeme(m);
    setEditCaption(m.caption || '');
    setEditTop(m.topText || '');
    setEditBottom(m.bottomText || '');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editMeme) return;
    setEditSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${editMeme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ caption: editCaption, topText: editTop, bottomText: editBottom }),
      });
      if (res.ok) {
        patch(editMeme.id, x => ({ ...x, caption: editCaption, topText: editTop, bottomText: editBottom }));
        setEditMeme(null);
      } else {
        Alert.alert('Greška', 'Izmena nije uspela.');
      }
    } catch {
      Alert.alert('Greška', 'Izmena nije uspela.');
    } finally {
      setEditSaving(false);
    }
  }, [editMeme, editCaption, editTop, editBottom, getToken, patch]);

  const ownerActions = useCallback((m: MemePost) => {
    Alert.alert('Tvoj meme', undefined, [
      { text: 'Izmeni tekst', onPress: () => openEdit(m) },
      { text: 'Obriši', style: 'destructive', onPress: () => handleDelete(m) },
      { text: 'Otkaži', style: 'cancel' },
    ]);
  }, [openEdit, handleDelete]);

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
        {user?.uid === item.authorId ? (
          <RailButton icon="ellipsis-horizontal" color="#fff" label="Uredi" onPress={() => ownerActions(item)} />
        ) : null}
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
  ), [pageH, visibleId, insets.bottom, handleLike, handleFavorite, handleRepost, handleShare, handleRemix, user?.uid, ownerActions]);

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
      {/* Floating header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        {isProfileMode ? (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.createBtn}>
              <Ionicons name="arrow-back" size={22} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>@{profileName || 'profil'}</Text>
            </View>
            <View style={{ width: 32 }} />
          </>
        ) : (
          <>
            <View style={styles.headerCenter}>
              <Ionicons name="flame" size={20} color="#fff" />
              <Text style={styles.headerTitle}>MemeWall</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/creative-hub')} style={styles.createBtn}>
              <Ionicons name="add" size={24} color="#000" />
            </TouchableOpacity>
          </>
        )}
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
          initialScrollIndex={startId ? Math.max(0, memes.findIndex(m => m.id === startId)) : undefined}
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

      <Modal visible={!!editMeme} transparent animationType="slide" onRequestClose={() => setEditMeme(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.editSheet, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.editTitle, { color: tc.text }]}>Izmeni meme</Text>
            <Text style={[styles.editLabel, { color: tc.textMuted }]}>Opis</Text>
            <TextInput value={editCaption} onChangeText={setEditCaption} placeholder="Opis" placeholderTextColor={tc.textMuted} style={[styles.editInput, { color: tc.text, borderColor: tc.border }]} multiline />
            {editMeme?.mediaType !== 'image' ? (
              <>
                <Text style={[styles.editLabel, { color: tc.textMuted }]}>Gornji tekst</Text>
                <TextInput value={editTop} onChangeText={setEditTop} placeholder="Gornji tekst" placeholderTextColor={tc.textMuted} style={[styles.editInput, { color: tc.text, borderColor: tc.border }]} />
                <Text style={[styles.editLabel, { color: tc.textMuted }]}>Donji tekst</Text>
                <TextInput value={editBottom} onChangeText={setEditBottom} placeholder="Donji tekst" placeholderTextColor={tc.textMuted} style={[styles.editInput, { color: tc.text, borderColor: tc.border }]} />
              </>
            ) : (
              <Text style={[styles.editNote, { color: tc.textMuted }]}>Za slike je tekst ubačen u sliku pri objavi — možeš izmeniti opis, ili obrisati meme i napraviti novi.</Text>
            )}
            <View style={styles.editBtnRow}>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: tc.bgInput }]} onPress={() => setEditMeme(null)} disabled={editSaving}>
                <Text style={[styles.editBtnText, { color: tc.text }]}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: tc.primary }]} onPress={saveEdit} disabled={editSaving}>
                <Text style={[styles.editBtnText, { color: '#fff' }]}>{editSaving ? 'Čuvam...' : 'Sačuvaj'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editSheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 6 },
  editTitle: { fontSize: 18, ...fonts.bold, marginBottom: 4 },
  editLabel: { fontSize: 12, ...fonts.semibold, marginTop: 4 },
  editInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  editNote: { fontSize: 12, ...fonts.medium, marginTop: 6, lineHeight: 17 },
  editBtnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  editBtnText: { fontSize: 15, ...fonts.bold },
});
