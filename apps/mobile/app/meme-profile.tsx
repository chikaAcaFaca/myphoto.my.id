import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Dimensions, Image, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const THUMB_SIZE = (width - 36) / 3;

interface ProfileMeme {
  id: string;
  imageUrl: string;
  caption: string;
  likes: number;
  shares: number;
  createdAt: string;
}

export default function MemeProfileScreen() {
  const { colors: tc } = useTheme();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();
  const { user, getToken } = useAuth();
  const [memes, setMemes] = useState<ProfileMeme[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = user?.uid === userId;
  const isLoggedIn = !!user;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/meme-wall/user/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setMemes(data.memes || []);
        }
      } catch (e) {
        console.log('Profile fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, getToken]);

  const handleShareProfile = useCallback(async () => {
    await Share.share({
      message: `Pogledaj memove od @${userName} na MyPhoto!\nhttps://myphotomy.space/meme-wall/user/${userId}`,
    });
  }, [userId, userName]);

  const renderMeme = ({ item }: { item: ProfileMeme }) => (
    <TouchableOpacity style={styles.thumbWrap}>
      <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      <View style={styles.thumbStats}>
        <Ionicons name="heart" size={10} color="#fff" />
        <Text style={styles.thumbCount}>{item.likes}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: '#f97316' }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>@{userName}</Text>
          <TouchableOpacity onPress={handleShareProfile} style={styles.backBtn}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile header */}
      <View style={[styles.profileCard, { backgroundColor: tc.bgCard }]}>
        <View style={[styles.bigAvatar, { backgroundColor: tc.primary }]}>
          <Text style={styles.bigAvatarText}>{(userName || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.profileName, { color: tc.text }]}>@{userName}</Text>
        <Text style={[styles.profileStats, { color: tc.textMuted }]}>
          {memes.length} memova · {memes.reduce((s, m) => s + m.likes, 0)} lajkova
        </Text>

        {/* CTA — the funnel */}
        {!isLoggedIn ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/register')}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.ctaText}>Napravi svoj meme — Registruj se besplatno!</Text>
          </TouchableOpacity>
        ) : !isOwnProfile ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: tc.primary }]}
            onPress={() => router.push('/creative-hub')}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.ctaText}>Napravi svoj meme</Text>
          </TouchableOpacity>
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
          <Text style={[styles.emptyText, { color: tc.textMuted }]}>Nema memova jos</Text>
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
  safe: { flex: 1 },
  headerBg: { paddingHorizontal: 16, paddingVertical: 14, paddingTop: Platform.OS === 'ios' ? 8 : 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  profileCard: {
    alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  bigAvatar: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  bigAvatarText: { fontSize: 28, ...fonts.extrabold, color: '#fff' },
  profileName: { fontSize: 18, ...fonts.bold, marginBottom: 4 },
  profileStats: { fontSize: 13, ...fonts.medium, marginBottom: 16 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f97316', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 24,
    width: '100%',
  },
  ctaText: { color: '#fff', fontSize: 14, ...fonts.bold },
  grid: { padding: 4 },
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 2, borderRadius: 4, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbStats: {
    position: 'absolute', bottom: 2, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  thumbCount: { color: '#fff', fontSize: 10, ...fonts.bold, textShadowColor: '#000', textShadowRadius: 2, textShadowOffset: { width: 1, height: 1 } },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, ...fonts.medium },
});
