import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 12;
const FACE_SIZE = (width - 24 - GAP * (COL - 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface Person {
  id: string;
  name?: string;
  photoCount: number;
  sampleUrl?: string;
  sampleFileId?: string;
}

export default function PeopleScreen() {
  const { getToken } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [renaming, setRenaming] = useState<Person | null>(null);
  const [newName, setNewName] = useState('');

  const fetchPeople = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/people`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people || data || []);
    } catch (e) {
      console.error('Error fetching people:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  const onRefresh = () => { setRefreshing(true); fetchPeople(); };

  const handleRename = async () => {
    if (!renaming || !newName.trim()) return;
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/people/${renaming.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setPeople(prev => prev.map(p => p.id === renaming.id ? { ...p, name: newName.trim() } : p));
      setRenaming(null);
      setNewName('');
    } catch (e) {
      Alert.alert('Greska', 'Preimenovanje nije uspelo.');
    }
  };

  const renderPerson = ({ item }: { item: Person }) => (
    <TouchableOpacity
      style={styles.personCard}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/person-detail',
        params: { id: item.id, name: item.name || 'Nepoznato' },
      })}
      onLongPress={() => { setRenaming(item); setNewName(item.name || ''); }}
    >
      <View style={styles.faceCircle}>
        {item.sampleFileId ? (
          <Image
            source={{ uri: `${API_URL}/api/thumbnail/${item.sampleFileId}?size=small` }}
            style={styles.faceImage}
          />
        ) : (
          <Ionicons name="person" size={32} color={colors.textMuted} />
        )}
      </View>
      <Text style={styles.personName} numberOfLines={1}>{item.name || 'Nepoznato'}</Text>
      <Text style={styles.personCount}>{item.photoCount} slika</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ljudi</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : people.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nema prepoznatih lica</Text>
          <Text style={styles.emptySubtext}>Lica ce biti automatski prepoznata iz vasih slika</Text>
        </View>
      ) : (
        <FlatList
          data={people}
          renderItem={renderPerson}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}

      {/* Rename modal */}
      <Modal visible={!!renaming} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Preimenuj osobu</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Ime osobe"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setRenaming(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Otkazi</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRename} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveText}>Sacuvaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  row: { gap: GAP, paddingHorizontal: 0 },
  personCard: { width: FACE_SIZE, alignItems: 'center', marginBottom: 16 },
  faceCircle: {
    width: FACE_SIZE - 16, height: FACE_SIZE - 16, borderRadius: (FACE_SIZE - 16) / 2,
    backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  faceImage: { width: '100%', height: '100%' },
  personName: { fontSize: 12, ...fonts.semibold, color: colors.text, marginTop: 6, textAlign: 'center' },
  personCount: { fontSize: 10, color: colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: '#fff', borderRadius: radius.lg, padding: 20, width: width - 48,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  modalTitle: { fontSize: 16, ...fonts.bold, color: colors.text, marginBottom: 12 },
  modalInput: {
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 13, color: colors.textMuted, ...fonts.semibold },
  modalSaveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 16 },
  modalSaveText: { fontSize: 13, color: '#fff', ...fonts.semibold },
});
