import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Dimensions, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const SUGGESTIONS = [
  { label: 'Pets', icon: '🐶' },
  { label: 'Cars', icon: '🚗' },
  { label: 'Food', icon: '🍔' },
  { label: 'Nature', icon: '🌳' },
  { label: 'People', icon: '👥' },
  { label: 'Travel', icon: '✈️' },
  { label: 'Architecture', icon: '🏛️' },
  { label: 'Sunset', icon: '🌅' },
];

export default function SearchScreen() {
  const { colors: tc } = useTheme();
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: searchQuery, pageSize: 50 }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.items || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = ({ item }: { item: FileMetadata }) => (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.8}
      delayPressIn={100}
      onPress={() => router.push({ pathname: '/photo-viewer', params: { id: item.id, name: item.name, type: item.type, isFavorite: item.isFavorite ? '1' : '0' } })}
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
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: tc.text }]}>Search</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search photos, videos, files..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!searched ? (
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>AI SUGGESTIONS</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s.label}
                style={styles.suggestionChip}
                onPress={() => { setQuery(s.label); doSearch(s.label); }}
              >
                <Text style={[styles.suggestionText, { color: tc.primary }]}>{s.icon} {s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.noResults}>Nema rezultata za "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.id}
          numColumns={COL}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{results.length} rezultata</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerArea: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, ...fonts.extrabold, color: colors.text, marginBottom: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgInput, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },
  sectionLabel: { fontSize: 10, ...fonts.bold, color: colors.textMuted, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12 },
  suggestionChip: { backgroundColor: '#e0f2fe', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  suggestionText: { fontSize: 12, ...fonts.semibold, color: '#0369a1' },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  noResults: { fontSize: 14, color: colors.textMuted, marginTop: 12 },
  resultCount: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary, paddingHorizontal: 12, paddingVertical: 8 },
});
