import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Dimensions, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { setViewerPhotos } from '@/lib/photo-list-store';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';
import { HeaderIconButton } from '@/components/ScreenHeader';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;

interface AlbumFile {
  id: string;
  name: string;
  type: string;
}

export default function AlbumDetailScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { getToken, appUser } = useAuth();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [files, setFiles] = useState<AlbumFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files?albumId=${encodeURIComponent(id)}&pageSize=200`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list: AlbumFile[] = (data.files || data.items || []).map((f: any) => ({
          id: f.id, name: f.name, type: f.type || 'image',
        }));
        setFiles(list);
      }
    } catch (e) {
      console.log('Album files error:', e);
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Tap a photo → seed the viewer with the whole album so it swipes through it.
  const openPhoto = (file: AlbumFile) => {
    setViewerPhotos(files.map((f) => ({ id: f.id, name: f.name, type: f.type })));
    router.push({ pathname: '/photo-viewer', params: { id: file.id, name: file.name, type: file.type } });
  };

  const shareAlbum = useCallback(async () => {
    setSharing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ albumId: id, permission: 'read' }),
      });
      if (res.ok) {
        const d = await res.json();
        const refCode = appUser?.referralCode;
        const refSuffix = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';
        const url = `${API_URL}${d.shareUrl}${refSuffix}`;
        await Share.share({ message: `${t('albums.shareMessage', { name })}\n${url}`, url });
      } else {
        Alert.alert(t('albums.shareTitle'), t('albums.shareFailed'));
      }
    } catch {
      Alert.alert(t('albums.shareTitle'), t('albums.shareFailed'));
    } finally {
      setSharing(false);
    }
  }, [id, name, getToken, appUser, t]);

  const renderCell = ({ item }: { item: AlbumFile }) => (
    <TouchableOpacity style={styles.cell} activeOpacity={0.8} onPress={() => openPhoto(item)}>
      <Image
        source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=medium` }}
        style={[styles.thumb, { backgroundColor: tc.bgInput }]}
        resizeMode="cover"
      />
      {item.type === 'video' ? (
        <View style={styles.playBadge}><Ionicons name="play" size={14} color="#fff" /></View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader
        title={name || t('albums.albumFallback')}
        actions={
          sharing ? (
            <View style={[styles.hBtn, { backgroundColor: tc.bgInput }]}>
              <ActivityIndicator size="small" color={tc.text} />
            </View>
          ) : (
            <HeaderIconButton icon="share-social-outline" label={t('albums.shareTitle')} onPress={shareAlbum} />
          )
        }
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={tc.primary} /></View>
      ) : files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={48} color={tc.textMuted} />
          <Text style={[styles.empty, { color: tc.textSecondary }]}>{t('albums.emptyAlbum')}</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderCell}
          keyExtractor={(f) => f.id}
          numColumns={COL}
          contentContainerStyle={{ padding: GAP }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cell: { width: CELL, height: CELL, margin: GAP / 2 },
  thumb: { width: '100%', height: '100%', borderRadius: 4 },
  playBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  empty: { fontSize: 14, ...fonts.medium },
});
