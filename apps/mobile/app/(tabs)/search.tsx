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
import { colors, fonts } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';
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
  const { colors: tc, isDark } = useTheme();
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
      style={[styles.cell, { backgroundColor: tc.bgInput }]}
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
      <StackHeader title={t('search.title')}>
        <View style={[styles.searchBox, { backgroundColor: tc.bgInput }]}>
          <Ionicons name="search" size={18} color={tc.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: tc.text }]}
            placeholder={t('search.placeholder')}
            placeholderTextColor={tc.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.clearBtn}
              onPress={() => { setQuery(''); setResults([]); setSearched(false); }}
            >
              <Ionicons name="close-circle" size={18} color={tc.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </StackHeader>

      {/* Cloud / Device toggle */}
      <View accessibilityRole="tablist" style={[styles.toggleContainer, { backgroundColor: tc.bgInput }]}>
        {([
          { mode: 'cloud' as const, icon: 'cloud-outline' as const, label: t('search.modeCloud') },
          { mode: 'device' as const, icon: 'phone-portrait-outline' as const, label: t('search.modeDevice') },
        ]).map(({ mode, icon, label }) => {
          const selected = searchMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.toggleTab, selected && [styles.toggleTabActive, { backgroundColor: isDark ? tc.bgCard : '#FFFFFF' }]]}
              onPress={() => { setSearchMode(mode); setSearched(false); setResults([]); setLocalResults([]); }}
            >
              <Ionicons name={icon} size={15} color={selected ? tc.text : tc.textSecondary} />
              <Text style={[styles.toggleText, { color: selected ? tc.text : tc.textSecondary, fontWeight: selected ? '700' : '600' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!searched ? (
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionLabel, { color: tc.textSecondary }]}>{t('search.aiSuggestions')}</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s.label}
                style={[styles.suggestionChip, { backgroundColor: tc.bgCard, borderColor: tc.border }]}
                onPress={() => { setQuery(s.label); doSearch(s.label); }}
              >
                <Text style={[styles.suggestionText, { color: tc.text }]}>{s.icon} {t(s.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : searchMode === 'device' ? (
        localResults.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={48} color={tc.textMuted} />
            <Text style={[styles.noResults, { color: tc.textSecondary }]}>{t('search.noLocalResults', { query })}</Text>
            <Text style={{ fontSize: 12, color: tc.textMuted, marginTop: 4, textAlign: 'center' }}>
              {t('search.indexingHint')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={localResults}
            keyExtractor={(item) => item.assetId}
            contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 12 }}
            ListHeaderComponent={
              <Text style={[styles.resultCount, { color: tc.textSecondary }]}>{tp('search.localCount', localResults.length)}</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.localResultCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
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
          <Ionicons name="search-outline" size={48} color={tc.textMuted} />
          <Text style={[styles.noResults, { color: tc.textSecondary }]}>{t('search.noResults', { query })}</Text>
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
            <Text style={[styles.resultCount, { color: tc.textSecondary }]}>{tp('search.resultCount', results.length)}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 4,
    borderRadius: 14, paddingLeft: 14, paddingRight: 2, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  clearBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, ...fonts.bold, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  suggestionChip: { borderWidth: 1, paddingHorizontal: 14, height: 40, justifyContent: 'center', borderRadius: 20 },
  suggestionText: { fontSize: 14, ...fonts.semibold },
  row: { gap: GAP, paddingHorizontal: 1 },
  cell: { width: CELL, height: CELL, marginBottom: GAP, backgroundColor: colors.bgInput, borderRadius: 2 },
  cellImage: { width: '100%', height: '100%', borderRadius: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  noResults: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  resultCount: { fontSize: 13, ...fonts.semibold, paddingHorizontal: 12, paddingVertical: 8 },
  // Toggle (segmented, like LibrarySwitcher)
  toggleContainer: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4, borderRadius: 14, padding: 4 },
  toggleTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 10 },
  toggleTabActive: {
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  toggleText: { fontSize: 14 },
  // Local results
  localResultCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1,
    marginBottom: 8, gap: 10,
  },
  localLabels: { fontSize: 14, ...fonts.medium },
  sceneBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
});
