import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Dimensions, Image, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { radius, fonts, memeFlame } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { withRef } from '@/lib/referral-link';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const THUMB_SIZE = (width - 36) / 3;
/** Text/icons on the flame orange: dark ink keeps contrast above 4.5:1. */
const ON_FLAME = '#111214';

interface ProfileMeme {
  id: string;
  imageUrl: string;
  mediaType: 'image' | 'video' | 'gif';
  caption: string;
  likes: number;
  shares: number;
  createdAt: string;
}

export default function MemeProfileScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();
  const { user, appUser, getToken } = useAuth();
  const [memes, setMemes] = useState<ProfileMeme[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const isOwnProfile = user?.uid === userId;
  const isLoggedIn = !!user;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [memesRes, profileRes] = await Promise.all([
          fetch(`${API_URL}/api/users/${userId}/memes?pageSize=60`, { headers }),
          fetch(`${API_URL}/api/users/${userId}`, { headers }),
        ]);
        if (memesRes.ok) {
          const data = await memesRes.json();
          setMemes(data.memes || []);
        }
        if (profileRes.ok) {
          const p = await profileRes.json();
          setFollowerCount(p.followerCount || 0);
          setIsFollowing(!!p.isFollowing);
        }
      } catch (e) {
        console.log('Profile fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId, getToken]);

  const handleFollow = useCallback(async () => {
    if (!isLoggedIn) { router.push('/register'); return; }
    const was = isFollowing;
    setIsFollowing(!was);
    setFollowerCount(c => Math.max(0, c + (was ? -1 : 1)));
    setFollowBusy(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${userId}/follow`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setIsFollowing(!!d.isFollowing);
      } else {
        setIsFollowing(was);
        setFollowerCount(c => Math.max(0, c + (was ? 1 : -1)));
      }
    } catch {
      setIsFollowing(was);
      setFollowerCount(c => Math.max(0, c + (was ? 1 : -1)));
    } finally {
      setFollowBusy(false);
    }
  }, [isLoggedIn, isFollowing, userId, getToken]);

  const handleShareProfile = useCallback(async () => {
    await Share.share({
      message: `${t('meme.profile.shareMessage', { name: userName })}\n${withRef(`https://myphotomy.space/user/${userId}`, appUser?.referralCode)}`,
    });
  }, [userId, userName, t, appUser?.referralCode]);

  // Tapping any thumbnail opens the full-screen feed viewer scoped to this
  // user, starting on the tapped meme (TikTok-style).
  const openViewer = (item: ProfileMeme) =>
    router.push({
      pathname: '/meme-wall',
      params: { profileUserId: userId, profileName: userName, startId: item.id },
    });

  const renderMeme = ({ item }: { item: ProfileMeme }) => (
    <TouchableOpacity style={styles.thumbWrap} onPress={() => openViewer(item)} activeOpacity={0.8}>
      {item.mediaType === 'video' ? (
        // Don't mount a <Video> per grid cell (many players → OOM). Show a
        // play-badge tile; the real player runs in the viewer on tap.
        <View style={[styles.thumb, styles.videoThumb]}>
          <Ionicons name="play" size={26} color="#fff" />
        </View>
      ) : (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      )}
      <View style={styles.thumbStats}>
        <Ionicons name="heart" size={10} color="#fff" />
        <Text style={styles.thumbCount}>{item.likes}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader
        title={`@${userName}`}
        actions={<HeaderIconButton icon="share-outline" label={t('common.share')} onPress={handleShareProfile} />}
      />

      {/* Profile header */}
      <View style={[styles.profileCard, { backgroundColor: tc.bg, borderBottomColor: tc.border }]}>
        <View style={[styles.bigAvatar, { backgroundColor: memeFlame }]}>
          <Text style={styles.bigAvatarText}>{(userName || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.profileName, { color: tc.text }]}>@{userName}</Text>
        <Text style={[styles.profileStats, { color: tc.textSecondary }]}>
          {tp('meme.profile.memes', memes.length)} · {tp('meme.profile.likes', memes.reduce((s, m) => s + m.likes, 0))} · {tp('meme.profile.followers', followerCount)}
        </Text>

        {/* CTA / Follow */}
        {!isLoggedIn ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="sparkles" size={18} color={ON_FLAME} />
            <Text style={styles.ctaText}>{t('meme.profile.signUpCta')}</Text>
          </TouchableOpacity>
        ) : !isOwnProfile ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.ctaBtn, styles.ctaFlex, isFollowing && { backgroundColor: tc.bgInput }]}
              onPress={handleFollow}
              disabled={followBusy}
            >
              <Ionicons name={isFollowing ? 'checkmark' : 'person-add'} size={18} color={isFollowing ? tc.text : ON_FLAME} />
              <Text style={[styles.ctaText, isFollowing && { color: tc.text }]}>
                {isFollowing ? t('meme.profile.following') : t('meme.profile.follow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaBtn, styles.ctaFlex, { backgroundColor: tc.bgInput }]}
              onPress={() => router.push({ pathname: '/chat', params: { userId, name: userName } })}
            >
              <Ionicons name="chatbubble-outline" size={18} color={tc.text} />
              <Text style={[styles.ctaText, { color: tc.text }]}>{t('messages.message')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Meme grid */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : memes.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={48} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.textMuted }]}>{t('meme.profile.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={memes}
          renderItem={renderMeme}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  safe: { flex: 1 },
  profileCard: {
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  bigAvatarText: { fontSize: 28, ...fonts.displayHeavy, color: ON_FLAME },
  profileName: { fontSize: 20, letterSpacing: -0.3, ...fonts.display, marginBottom: 4 },
  profileStats: { fontSize: 13, ...fonts.medium, marginBottom: 16 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: memeFlame, borderRadius: radius.full, minHeight: 48, paddingVertical: 12, paddingHorizontal: 24,
    width: '100%',
  },
  ctaFlex: { flex: 1, width: 'auto' },
  ctaText: { color: ON_FLAME, fontSize: 15, ...fonts.bold },
  grid: { padding: 4 },
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 2, borderRadius: 4, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  videoThumb: { backgroundColor: '#1B1D21', alignItems: 'center', justifyContent: 'center' },
  thumbStats: {
    position: 'absolute', bottom: 2, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  thumbCount: { color: '#fff', fontSize: 10, ...fonts.bold, textShadowColor: '#000', textShadowRadius: 2, textShadowOffset: { width: 1, height: 1 } },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, ...fonts.medium },
});
