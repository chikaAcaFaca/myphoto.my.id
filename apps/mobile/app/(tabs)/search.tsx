import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 6) / 3;

// Suggested searches
const suggestions = [
  { icon: 'paw', label: 'Pets', color: '#f59e0b' },
  { icon: 'car', label: 'Cars', color: '#3b82f6' },
  { icon: 'restaurant', label: 'Food', color: '#ef4444' },
  { icon: 'leaf', label: 'Nature', color: '#22c55e' },
  { icon: 'people', label: 'People', color: '#8b5cf6' },
  { icon: 'airplane', label: 'Travel', color: '#06b6d4' },
];

// Recent searches
const recentSearches = ['beach', 'birthday', 'dog'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    // In real app, call search API
    setTimeout(() => {
      setResults([]);
      setIsSearching(false);
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search photos, videos..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {query.length === 0 ? (
        <View style={styles.content}>
          {/* Suggested Searches */}
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.suggestionsGrid}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.suggestionItem}
                onPress={() => setQuery(item.label)}
              >
                <View style={[styles.suggestionIcon, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={24} color="#fff" />
                </View>
                <Text style={styles.suggestionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Recent</Text>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.recentItem}
                  onPress={() => setQuery(term)}
                >
                  <Ionicons name="time-outline" size={20} color="#9ca3af" />
                  <Text style={styles.recentText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem}>
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.resultImage}
                contentFit="cover"
              />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.resultsGrid}
        />
      ) : (
        <View style={styles.emptyResults}>
          <Ionicons name="search-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {isSearching ? 'Searching...' : `No results for "${query}"`}
          </Text>
          <Text style={styles.emptySubtext}>
            Try searching for things like "dog", "beach", or "birthday"
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  suggestionItem: {
    alignItems: 'center',
    width: (width - 64) / 3,
  },
  suggestionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  recentText: {
    fontSize: 16,
    color: '#374151',
  },
  resultsGrid: {
    padding: 1,
  },
  resultItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  resultImage: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  emptyResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
