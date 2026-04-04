import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const THUMB = 80;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface DuplicateGroup {
  id: string;
  files: FileMetadata[];
  similarity: number;
}

export default function DuplicatesScreen() {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDuplicates = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || data.duplicates || data || []);
    } catch (e) {
      console.error('Error fetching duplicates:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const onRefresh = () => { setRefreshing(true); fetchDuplicates(); };

  const handleDismiss = async (groupId: string) => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/duplicates/${groupId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (e) {
      Alert.alert('Greska', 'Nije moguce odbaciti duplikat.');
    }
  };

  const handleDeleteFile = (fileId: string, groupId: string) => {
    Alert.alert('Obrisati duplikat?', 'Fajl ce biti premesten u korpu.', [
      { text: 'Otkazi', style: 'cancel' },
      {
        text: 'Obrisi', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${API_URL}/api/files/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token || ''}`,
              },
              body: JSON.stringify({ fileIds: [fileId] }),
            });
            setGroups(prev => prev.map(g => {
              if (g.id !== groupId) return g;
              const updated = g.files.filter(f => f.id !== fileId);
              return updated.length < 2 ? null! : { ...g, files: updated };
            }).filter(Boolean));
          } catch (e) {
            Alert.alert('Greska', 'Brisanje nije uspelo.');
          }
        },
      },
    ]);
  };

  const renderGroup = ({ item }: { item: DuplicateGroup }) => (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.similarityBadge}>
          <Text style={styles.similarityText}>{Math.round(item.similarity * 100)}% slicno</Text>
        </View>
        <TouchableOpacity onPress={() => handleDismiss(item.id)}>
          <Text style={styles.dismissText}>Odbaci</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.thumbRow}>
        {item.files.map((file, i) => (
          <View key={file.id} style={styles.thumbWrap}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: '/photo-viewer',
                params: { id: file.id, name: file.name, type: file.type },
              })}
            >
              <Image
                source={{ uri: `${API_URL}/api/thumbnail/${file.id}?size=small` }}
                style={styles.thumb}
              />
            </TouchableOpacity>
            {i > 0 && (
              <TouchableOpacity
                style={styles.deleteSmall}
                onPress={() => handleDeleteFile(file.id, item.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Duplikati</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
          <Text style={styles.emptyText}>Nema duplikata</Text>
          <Text style={styles.emptySubtext}>Sve vase slike su jedinstvene</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <Text style={styles.countText}>{groups.length} grupa duplikata</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  countText: { fontSize: 12, color: colors.textMuted, ...fonts.medium, marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  groupCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, padding: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  similarityBadge: {
    backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  similarityText: { fontSize: 11, ...fonts.semibold, color: '#92400e' },
  dismissText: { fontSize: 12, color: colors.textMuted, ...fonts.medium },
  thumbRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  thumbWrap: { position: 'relative' },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  deleteSmall: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
});
