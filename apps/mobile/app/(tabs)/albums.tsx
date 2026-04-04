import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { Album } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 2;
const GAP = 10;
const CARD_W = (width - 12 * 2 - GAP) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function AlbumsScreen() {
  const { colors: tc } = useTheme();
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
    if (!trimmed) { Alert.alert('Greska', 'Unesite naziv albuma.'); return; }
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
      Alert.alert('Greska', 'Kreiranje albuma nije uspelo.');
    } finally {
      setCreating(false);
    }
  };

  const renderAlbum = ({ item }: { item: Album }) => (
    <TouchableOpacity style={[styles.albumCard, { backgroundColor: tc.bgCard }]} activeOpacity={0.7} delayPressIn={100}>
      {item.coverFileId ? (
        <Image
          source={{ uri: `${API_URL}/api/thumbnail/${item.coverFileId}?size=medium` }}
          style={styles.albumCover}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.albumCover, styles.albumCoverEmpty]}>
          <Ionicons name="images-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.albumInfo}>
        <Text style={[styles.albumName, { color: tc.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.albumCount, { color: tc.textMuted }]}>{item.fileCount} slika</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Albums</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>Nema albuma</Text>
          <Text style={[styles.emptySubtext, { color: tc.textMuted }]}>Kreirajte prvi album da organizujete slike</Text>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.7} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Novi album</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
      {/* Create Album Modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>Novi album</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Naziv albuma"
              placeholderTextColor={colors.textMuted}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="Opis (opciono)"
              placeholderTextColor={colors.textMuted}
              value={newAlbumDesc}
              onChangeText={setNewAlbumDesc}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCreate(false); setNewAlbumName(''); setNewAlbumDesc(''); }}>
                <Text style={styles.modalCancelText}>Otkazi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleCreateAlbum} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalCreateText}>Kreiraj</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  addBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  row: { gap: GAP },
  albumCard: {
    width: CARD_W, borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: '#fff', marginBottom: GAP,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  albumCover: { width: '100%', height: 100 },
  albumCoverEmpty: { backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  albumInfo: { padding: 10 },
  albumName: { fontSize: 13, ...fonts.bold, color: colors.text },
  albumCount: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md,
  },
  createBtnText: { color: '#fff', fontSize: 14, ...fonts.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: radius.lg, padding: 20, width: width - 48, maxWidth: 400 },
  modalTitle: { fontSize: 18, ...fonts.bold, color: colors.text, marginBottom: 16 },
  modalInput: {
    backgroundColor: colors.bgInput, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, marginBottom: 12, ...fonts.medium,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  modalCancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md },
  modalCancelText: { fontSize: 14, color: colors.textSecondary, ...fonts.semibold },
  modalCreateBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.md },
  modalCreateText: { fontSize: 14, color: '#fff', ...fonts.semibold },
});
