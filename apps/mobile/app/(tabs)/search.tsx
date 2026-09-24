import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Dimensions, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { setViewerPhotos } from '@/lib/photo-list-store';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { searchLocalPhotos, type PhotoIndexEntry } from '@/lib/local-search-index';
import type { FileMetadata } from '@myphoto/shared';
import { useT, type TKey } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const COL = 3;
const GAP = 2;
const CELL = (width - GAP * (COL + 1)) / COL;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

// `label` is the search term sent to the AI index (English labels); `key`
// is only the displayed, translated chip text.
const SUGGESTIONS: { label: string; key: TKey; icon: string }[] = [
  { label: 'Pets', key: 'search.suggestions.pets', icon: '🐶' },
  { label: 'Cars', key: 'search.suggestions.cars', icon: '🚗' },
  { label: 'Food', key: 'search.suggestions.food', icon: '🍔' },
  { label: 'Nature', key: 'search.suggestions.nature', icon: '🌳' },
  { label: 'People', key: 'search.suggestions.people', icon: '👥' },
  { label: 'Travel', key: 'search.suggestions.travel', icon: '✈️' },
  { label: 'Architecture', key: 'search.suggestions.architecture', icon: '🏛️' },
  { label: 'Sunset', key: 'search.suggestions.sunset', icon: '🌅' },
];

export default function SearchScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileMetadata[]>([]);
  const [localResults, setLocalResults] = useState<PhotoIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<'cloud' | 'device'>('cloud');

  const doSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setLoading(true);
    setSearched(true);

    if (searchMode === 'device') {
      try {
        const local = await searchLocalPhotos(searchQuery);
        setLocalResults(local);
        setResults([]);
      } catch (e) {
        console.log('Local search error:', e);
        setLocalResults([]);
      } finally {
        setLoading(false);
      }
      return;
    }

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
      setLocalResults([]);
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
      onPress={() => {
        setViewerPhotos(results.map((f) => ({ id: f.id, name: f.name, type: f.type, isFavorite: f.isFavorite ? '1' : '0' })));
        router.push({ pathname: '/photo-viewer', params: { id: item.id, name: item.name, type: item.type, isFavorite: item.isFavorite ? '1' : '0' } });
      }}
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
        <Text style={[styles.title, { color: tc.text }]}>{t('search.title')}</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
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

      {/* Cloud / Device toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleTab, searchMode === 'cloud' && [styles.toggleTabActive, { backgroundColor: tc.bgCard }]]}
          onPress={() => { setSearchMode('cloud'); setSearched(false); setResults([]); setLocalResults([]); }}
        >
          <Ionicons name="cloud-outline" size={14} color={searchMode === 'cloud' ? tc.primary : colors.textMuted} />
          <Text style={[styles.toggleText, searchMode === 'cloud' && { color: tc.primary }]}>{t('search.modeCloud')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleTab, searchMode === 'device' && [styles.toggleTabActive, { backgroundColor: tc.bgCard }]]}
          onPress={() => { setSearchMode('device'); setSearched(false); setResults([]); setLocalResults([]); }}
        >
          <Ionicons name="phone-portrait-outline" size={14} color={searchMode === 'device' ? tc.primary : colors.textMuted} />
          <Text style={[styles.toggleText, searchMode === 'device' && { color: tc.primary }]}>{t('search.modeDevice')}</Text>
        </TouchableOpacity>
      </View>

      {!searched ? (
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: tc.textMuted }]}>{t('search.aiSuggestions')}</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s.label}
                style={styles.suggestionChip}
                onPress={() => { setQuery(s.label); doSearch(s.label); }}
              >
                <Text style={[styles.suggestionText, { color: tc.primary }]}>{s.icon} {t(s.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchMode === 'device' ? (
        localResults.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.noResults}>{t('search.noLocalResults', { query })}</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              {t('search.indexingHint')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={localResults}
            keyExtractor={(item) => item.assetId}
            contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 12 }}
            ListHeaderComponent={
              <Text style={styles.resultCount}>{tp('search.localCount', localResults.length)}</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.localResultCard, { backgroundColor: tc.bgCard }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.localLabels, { color: tc.text }]} numberOfLines={1}>{item.labels || t('search.noLabels')}</Text>
                  <Text style={{ fontSize: 11, color: tc.textMuted }}>
                    {item.sceneType} {item.isScreenshot ? t('search.screenshot') : ''}
                  </Text>
                </View>
                <View style={[styles.sceneBadge, { backgroundColor: tc.bgInput }]}>
                  <Text style={{ fontSize: 10, color: tc.primary }}>{item.sceneType}</Text>
                </View>
              </View>
            )}
          />
        )
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.noResults}>{t('search.noResults', { query })}</Text>
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
            <Text style={styles.resultCount}>{tp('search.resultCount', results.length)}</Text>
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
  // Toggle
  toggleContainer: {
    flexDirection: 'row', marginHorizontal: 12, marginVertical: 8,
    backgroundColor: colors.bgInput, borderRadius: radius.md, padding: 3,
  },
  toggleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 10 },
  toggleTabActive: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary },
  // Local results
  localResultCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md,
    marginBottom: 6, gap: 10,
  },
  localLabels: { fontSize: 13, ...fonts.medium },
  sceneBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
});
