import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 2;

// Placeholder data - in real app, fetch from API
const albums = [
  { id: '1', name: 'Favorites', count: 24, cover: null },
  { id: '2', name: 'Screenshots', count: 156, cover: null },
  { id: '3', name: 'Vacation 2024', count: 89, cover: null },
  { id: '4', name: 'Family', count: 234, cover: null },
];

export default function AlbumsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Albums</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

      {/* Albums Grid */}
      <FlatList
        data={albums}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.albumItem}>
            <View style={styles.albumCover}>
              {item.cover ? (
                <Image source={{ uri: item.cover }} style={styles.coverImage} contentFit="cover" />
              ) : (
                <Ionicons name="images" size={32} color="#d1d5db" />
              )}
            </View>
            <Text style={styles.albumName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.albumCount}>{item.count} items</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No albums yet</Text>
            <Text style={styles.emptySubtext}>Create an album to organize your photos</Text>
            <TouchableOpacity style={styles.createButton}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Album</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  gridContent: {
    padding: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  albumItem: {
    width: ITEM_SIZE,
    marginBottom: 16,
  },
  albumCover: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  albumCount: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
