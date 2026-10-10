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
import { useTheme } from '@/lib/theme-context';
import type { FileMetadata } from '@myphoto/shared';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const { width } = Dimensions.get('window');
const THUMB = 80;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface DuplicateGroup {
  id: string;
  files: FileMetadata[];
  similarity: number;
}

export default function DuplicatesScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
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
      Alert.alert(t('common.error'), t('duplicates.dismissFailed'));
    }
  };

  const handleDeleteFile = (fileId: string, groupId: string) => {
    Alert.alert(t('duplicates.deleteConfirmTitle'), t('duplicates.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive', onPress: async () => {
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
            Alert.alert(t('common.error'), t('duplicates.deleteFailed'));
          }
        },
      },
    ]);
  };

  const renderGroup = ({ item }: { item: DuplicateGroup }) => (
    <View style={[styles.groupCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
      <View style={styles.groupHeader}>
        <View style={[styles.similarityBadge, { backgroundColor: tc.bgInput }]}>
          <Text style={[styles.similarityText, { color: tc.text }]}>{t('duplicates.similarity', { percent: Math.round(item.similarity * 100) })}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDismiss(item.id)} style={styles.dismissBtn}>
          <Text style={[styles.dismissText, { color: tc.textSecondary }]}>{t('duplicates.dismiss')}</Text>
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
                style={[styles.thumb, { backgroundColor: tc.bgInput }]}
              />
            </TouchableOpacity>
            {i > 0 && (
              <TouchableOpacity
                style={[styles.deleteSmall, { backgroundColor: tc.error }]}
                onPress={() => handleDeleteFile(file.id, item.id)}
                accessibilityRole="button"
                accessibilityLabel={t('common.delete')}
                hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
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
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('duplicates.title')} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={64} color={tc.success} />
          <Text style={[styles.emptyText, { color: tc.text }]}>{t('duplicates.empty')}</Text>
          <Text style={[styles.emptySubtext, { color: tc.textSecondary }]}>{t('duplicates.emptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
          ListHeaderComponent={
            <Text style={[styles.countText, { color: tc.textSecondary }]}>{tp('duplicates.groupCount', groups.length)}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  countText: { fontSize: 12, color: colors.textMuted, ...fonts.medium, marginBottom: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, ...fonts.bold, color: colors.text, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  groupCard: {
    borderRadius: radius.lg, padding: 12, marginBottom: 10, borderWidth: 1,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  similarityBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  similarityText: { fontSize: 11, ...fonts.semibold },
  dismissBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  dismissText: { fontSize: 13, ...fonts.semibold },
  thumbRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  thumbWrap: { position: 'relative' },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  deleteSmall: {
    position: 'absolute', top: 4, right: 4,
    borderRadius: 11,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
});
