import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, HeaderIconButton } from '@/components/ScreenHeader';
import { LibrarySwitcher } from '@/components/LibrarySwitcher';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { Album } from '@myphoto/shared';
import { useT } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const COL = 2;
const GAP = 10;
const CARD_W = (width - 12 * 2 - GAP) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function AlbumsScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const { getToken } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [creating, setCreating] = useState(false);

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

  const handleCreateAlbum = async () => {
    const trimmed = newAlbumName.trim();
    if (!trimmed) { Alert.alert(t('common.error'), t('albums.nameRequired')); return; }
    setCreating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, description: newAlbumDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setShowCreate(false);
      setNewAlbumName('');
      setNewAlbumDesc('');
      fetchAlbums();
    } catch (e) {
      Alert.alert(t('common.error'), t('albums.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const renderAlbum = ({ item }: { item: Album }) => {
    const previews: string[] = (item as any).previewThumbUrls || [];
    const cover =
      (item as any).coverThumbUrl ||
      (item.coverFileId ? `${API_URL}/api/thumbnail/${item.coverFileId}?size=medium` : null);
    return (
      <TouchableOpacity
        style={[styles.albumCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}
        activeOpacity={0.7}
        delayPressIn={100}
        onPress={() => router.push({ pathname: '/album-detail' as any, params: { id: item.id, name: item.name } })}
      >
        {previews.length > 1 ? (
          <View style={[styles.mosaic, { backgroundColor: tc.bgInput }]}>
            {previews.slice(0, 4).map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.mosaicCell} resizeMode="cover" />
            ))}
          </View>
        ) : previews.length === 1 || cover ? (
          <Image source={{ uri: previews[0] || cover! }} style={styles.albumCover} resizeMode="cover" />
        ) : (
          <View style={[styles.albumCover, styles.albumCoverEmpty, { backgroundColor: tc.bgInput }]}>
            <Ionicons name="images-outline" size={32} color={tc.textMuted} />
          </View>
        )}
        <View style={styles.albumInfo}>
          <Text style={[styles.albumName, { color: tc.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.albumCount, { color: tc.textSecondary }]}>{tp('common.photos', item.fileCount || 0)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScreenHeader
        title={t('nav.tabs.photos')}
        actions={<HeaderIconButton icon="add" label={t('albums.create')} onPress={() => setShowCreate(true)} />}
      >
        <LibrarySwitcher active="albums" />
      </ScreenHeader>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={56} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('albums.empty')}</Text>
          <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>{t('albums.emptyHint')}</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: tc.primary }]} activeOpacity={0.7} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createBtnText}>{t('albums.newAlbum')}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} colors={[tc.primary]} />}
        />
      )}
      {/* Create Album Modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>{t('albums.newAlbum')}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: tc.bgCard, borderColor: tc.border, color: tc.text }]}
              placeholder={t('albums.namePlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { height: 72, textAlignVertical: 'top', backgroundColor: tc.bgCard, borderColor: tc.border, color: tc.text }]}
              placeholder={t('albums.descriptionPlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={newAlbumDesc}
              onChangeText={setNewAlbumDesc}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCreate(false); setNewAlbumName(''); setNewAlbumDesc(''); }}>
                <Text style={[styles.modalCancelText, { color: tc.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreateBtn, { backgroundColor: tc.primary }]} onPress={handleCreateAlbum} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalCreateText}>{t('albums.create')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  row: { gap: GAP },
  albumCard: {
    width: CARD_W, borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: GAP,
  },
  albumCover: { width: '100%', height: 110 },
  albumCoverEmpty: { alignItems: 'center', justifyContent: 'center' },
  mosaic: { width: '100%', height: 110, flexDirection: 'row', flexWrap: 'wrap' },
  mosaicCell: { width: '50%', height: 55 },
  albumInfo: { paddingHorizontal: 12, paddingVertical: 10 },
  albumName: { fontSize: 14, ...fonts.bold },
  albumCount: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 20, ...fonts.display, marginTop: 12 },
  emptySubtext: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 22, height: 52, borderRadius: 26,
  },
  createBtnText: { color: '#fff', fontSize: 16, ...fonts.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 20, width: width - 48, maxWidth: 400 },
  modalTitle: { fontSize: 20, ...fonts.display, marginBottom: 16 },
  modalInput: {
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, minHeight: 48,
    fontSize: 15, marginBottom: 12, ...fonts.medium,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancelBtn: { paddingHorizontal: 18, height: 44, justifyContent: 'center', borderRadius: 22 },
  modalCancelText: { fontSize: 15, ...fonts.semibold },
  modalCreateBtn: { paddingHorizontal: 22, height: 44, justifyContent: 'center', borderRadius: 22 },
  modalCreateText: { fontSize: 15, color: '#fff', ...fonts.bold },
});
