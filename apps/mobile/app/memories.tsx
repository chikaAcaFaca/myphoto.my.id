import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const THUMB = 120;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface MemoryGroup {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  files: FileMetadata[];
}

export default function MemoriesScreen() {
  const { getToken } = useAuth();
  const [onThisDay, setOnThisDay] = useState<FileMetadata[]>([]);
  const [memories, setMemories] = useState<MemoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [otdRes, memRes] = await Promise.all([
        fetch(`${API_URL}/api/memories/on-this-day`, { headers }),
        fetch(`${API_URL}/api/memories`, { headers }),
      ]);

      if (otdRes.ok) {
        const data = await otdRes.json();
        setOnThisDay(data.files || data.items || data || []);
      }
      if (memRes.ok) {
        const data = await memRes.json();
        setMemories(data.memories || data || []);
      }
    } catch (e) {
      console.error('Error fetching memories:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const onRefresh = () => { setRefreshing(true); fetchMemories(); };

  const openPhoto = (item: FileMetadata) => {
    router.push({
      pathname: '/photo-viewer',
      params: { id: item.id, name: item.name, type: item.type, isFavorite: item.isFavorite ? '1' : '0' },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBg}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Secanja</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isEmpty = onThisDay.length === 0 && memories.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secanja</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nema secanja</Text>
          <Text style={styles.emptySubtext}>Secanja ce se pojaviti kako budete dodavali slike</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* On This Day */}
          {onThisDay.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Na ovaj dan</Text>
              </View>
              <FlatList
                data={onThisDay}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => openPhoto(item)} activeOpacity={0.8}>
                    <Image
                      source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=medium` }}
                      style={styles.otdThumb}
                    />
                    {item.takenAt && (
                      <Text style={styles.otdYear}>
                        {new Date(item.takenAt).getFullYear()}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Memory collections */}
          {memories.map((memory) => (
            <View key={memory.id} style={styles.memoryCard}>
              <Text style={styles.memoryTitle}>{memory.title}</Text>
              {memory.description && (
                <Text style={styles.memoryDesc}>{memory.description}</Text>
              )}
              <FlatList
                data={memory.files?.slice(0, 10) || []}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, marginTop: 8 }}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => openPhoto(item)} activeOpacity={0.8}>
                    <Image
                      source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=small` }}
                      style={styles.memThumb}
                    />
                  </TouchableOpacity>
                )}
              />
            </View>
          ))}
        </ScrollView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, ...fonts.bold, color: colors.text },
  otdThumb: { width: THUMB, height: THUMB * 1.3, borderRadius: radius.md, backgroundColor: colors.bgInput },
  otdYear: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
    fontSize: 11, ...fonts.semibold, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    overflow: 'hidden',
  },
  memoryCard: {
    backgroundColor: '#fff', borderRadius: radius.lg, marginHorizontal: 12, marginTop: 14,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  memoryTitle: { fontSize: 15, ...fonts.bold, color: colors.text },
  memoryDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  memThumb: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: colors.bgInput },
});
