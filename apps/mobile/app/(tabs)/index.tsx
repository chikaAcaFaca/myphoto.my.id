import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import { useSync } from '@/lib/sync-context';
import { useAuth } from '@/lib/auth-context';
import type { FileMetadata } from '@myphoto/shared';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 6) / 3;

export default function PhotosScreen() {
  const [localPhotos, setLocalPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [cloudPhotos, setCloudPhotos] = useState<FileMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'device' | 'cloud'>('device');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const { user } = useAuth();
  const { startSync, syncProgress, isSyncing, pendingCount } = useSync();

  // Request permissions and load photos
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        await loadLocalPhotos();
      }
      setIsLoading(false);
    })();
  }, []);

  const loadLocalPhotos = async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: ['photo', 'video'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 100,
      });
      setLocalPhotos(assets);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLocalPhotos();
    setRefreshing(false);
  }, []);

  const renderPhoto = ({ item }: { item: MediaLibrary.Asset }) => (
    <TouchableOpacity style={styles.photoItem}>
      <Image
        source={{ uri: item.uri }}
        style={styles.photo}
        contentFit="cover"
        transition={200}
      />
      {item.mediaType === 'video' && (
        <View style={styles.videoIndicator}>
          <Ionicons name="play" size={12} color="#fff" />
          <Text style={styles.videoDuration}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="images-outline" size={64} color="#9ca3af" />
          <Text style={styles.permissionTitle}>Photo Access Required</Text>
          <Text style={styles.permissionText}>
            MyPhoto needs access to your photos to back them up securely.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              setHasPermission(status === 'granted');
              if (status === 'granted') {
                loadLocalPhotos();
              }
            }}
          >
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photos</Text>
        <View style={styles.headerActions}>
          {isSyncing ? (
            <View style={styles.syncIndicator}>
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text style={styles.syncText}>Syncing...</Text>
            </View>
          ) : pendingCount > 0 ? (
            <TouchableOpacity onPress={startSync} style={styles.syncButton}>
              <Ionicons name="cloud-upload-outline" size={24} color="#0ea5e9" />
              <Text style={styles.pendingBadge}>{pendingCount}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'device' && styles.activeTab]}
          onPress={() => setActiveTab('device')}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={18}
            color={activeTab === 'device' ? '#0ea5e9' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'device' && styles.activeTabText]}>
            Device
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cloud' && styles.activeTab]}
          onPress={() => setActiveTab('cloud')}
        >
          <Ionicons
            name="cloud-outline"
            size={18}
            color={activeTab === 'cloud' ? '#0ea5e9' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === 'cloud' && styles.activeTabText]}>
            Cloud
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync progress */}
      {isSyncing && syncProgress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${syncProgress}%` }]} />
        </View>
      )}

      {/* Photos grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'device' ? localPhotos : []}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {activeTab === 'device'
                  ? 'No photos on this device'
                  : 'No photos in the cloud yet'}
              </Text>
              {activeTab === 'device' && (
                <Text style={styles.emptySubtext}>
                  Take some photos to get started
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncText: {
    color: '#0ea5e9',
    fontSize: 14,
  },
  syncButton: {
    position: 'relative',
    padding: 8,
  },
  pendingBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#e0f2fe',
  },
  tabText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0ea5e9',
  },
  progressContainer: {
    height: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0ea5e9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 1,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  photo: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  videoDuration: {
    color: '#fff',
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
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
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
