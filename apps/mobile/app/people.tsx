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
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

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
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
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
      Alert.alert(t('common.error'), t('people.renameFailed'));
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
      <View style={[styles.faceCircle, { backgroundColor: tc.bgInput }]}>
        {item.sampleFileId ? (
          <Image
            source={{ uri: `${API_URL}/api/thumbnail/${item.sampleFileId}?size=small` }}
            style={styles.faceImage}
          />
        ) : (
          <Ionicons name="person" size={32} color={tc.textMuted} />
        )}
      </View>
      <Text style={[styles.personName, { color: tc.text }]} numberOfLines={1}>{item.name || t('people.unknown')}</Text>
      <Text style={[styles.personCount, { color: tc.textSecondary }]}>{tp('common.photos', item.photoCount)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('people.title')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : people.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('people.emptyTitle')}</Text>
          <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>{t('people.emptySubtitle')}</Text>
        </View>
      ) : (
        <FlatList
          data={people}
          renderItem={renderPerson}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
        />
      )}

      {/* Rename modal */}
      <Modal visible={!!renaming} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: tc.bgCard }]}>
            <Text style={[styles.modalTitle, { color: tc.text }]}>{t('people.renameTitle')}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: tc.bgInput, color: tc.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('people.namePlaceholder')}
              placeholderTextColor={tc.textMuted}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setRenaming(null)} style={[styles.modalCancelBtn, { backgroundColor: tc.bgInput }]}>
                <Text style={[styles.modalCancelText, { color: tc.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRename} style={[styles.modalSaveBtn, { backgroundColor: tc.primary }]}>
                <Text style={styles.modalSaveText}>{t('common.save')}</Text>
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
    borderRadius: radius.xl, padding: 20, width: width - 48,
  },
  modalTitle: { fontSize: 16, ...fonts.bold, color: colors.text, marginBottom: 12 },
  modalInput: {
    borderRadius: radius.md, minHeight: 44,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalCancelBtn: { height: 44, borderRadius: 22, paddingHorizontal: 18, justifyContent: 'center' },
  modalCancelText: { fontSize: 14, ...fonts.semibold },
  modalSaveBtn: { height: 44, borderRadius: 22, paddingHorizontal: 18, justifyContent: 'center' },
  modalSaveText: { fontSize: 14, color: '#fff', ...fonts.bold },
});
