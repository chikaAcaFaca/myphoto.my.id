import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function PersonDetailScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { getToken } = useAuth();
  const [photos, setPhotos] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPhotos = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/people/${id}/photos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data.files || data.photos || data || []);
    } catch (e) {
      console.error('Error fetching person photos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, id]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const onRefresh = () => { setRefreshing(true); fetchPhotos(); };

  const renderItem = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={[styles.cell, { backgroundColor: tc.bgInput }]}
      activeOpacity={0.8}
      onPress={() => router.push({
        pathname: '/photo-viewer',
        params: { id: item.id, name: item.name, type: item.type, isFavorite: item.isFavorite ? '1' : '0' },
      })}
    >
      <Image
        source={{ uri: `${API_URL}/api/thumbnail/${item.id}?size=small` }}
        style={styles.cellImage}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={name || t('people.person')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={64} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('people.noPhotos')}</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
          ListHeaderComponent={
            <Text style={[styles.countText, { color: tc.textSecondary }]}>{tp('common.photos', photos.length)}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  countText: { fontSize: 12, color: colors.textMuted, ...fonts.medium, paddingHorizontal: 12, paddingVertical: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
});
