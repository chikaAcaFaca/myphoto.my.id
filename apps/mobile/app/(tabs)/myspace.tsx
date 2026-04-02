import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { formatBytes } from '@myphoto/shared';
import type { DiskFolder, DiskFile } from '@myphoto/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const FOLDER_COLORS = ['#dbeafe', '#fce7f3', '#dcfce7', '#fff7ed', '#f3e8ff', '#fef3c7'];

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'videocam';
  if (mimeType.startsWith('audio/')) return 'musical-notes';
  if (mimeType.includes('pdf')) return 'document-text';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'document';
}

export default function MySpaceScreen() {
  const { getToken } = useAuth();
  const [folders, setFolders] = useState<DiskFolder[]>([]);
  const [files, setFiles] = useState<DiskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  const fetchFolder = useCallback(async (parentId: string, refresh = false) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/folders?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setFolders(data.folders || []);
      setFiles(data.files || []);
    } catch (e) {
      console.error('Error fetching folder:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchFolder(currentFolder);
  }, [currentFolder, fetchFolder]);

  const navigateToFolder = (folder: DiskFolder) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolder(folder.id);
    setLoading(true);
  };

  const navigateBack = () => {
    if (breadcrumbs.length === 0) return;
    const newBc = [...breadcrumbs];
    newBc.pop();
    setBreadcrumbs(newBc);
    setCurrentFolder(newBc.length > 0 ? newBc[newBc.length - 1].id : 'root');
    setLoading(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFolder(currentFolder, true);
  };

  const renderFolder = (folder: DiskFolder, index: number) => (
    <TouchableOpacity key={folder.id} style={styles.folderItem} onPress={() => navigateToFolder(folder)}>
      <View style={[styles.folderIcon, { backgroundColor: FOLDER_COLORS[index % FOLDER_COLORS.length] }]}>
        <Ionicons name="folder" size={20} color={colors.accent} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={styles.folderName} numberOfLines={1}>{folder.name}</Text>
        <Text style={styles.folderMeta}>{new Date(folder.updatedAt).toLocaleDateString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderFile = (file: DiskFile) => (
    <TouchableOpacity key={file.id} style={styles.folderItem}>
      <View style={[styles.folderIcon, { backgroundColor: '#f1f5f9' }]}>
        <Ionicons name={getFileIcon(file.mimeType) as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={styles.folderName} numberOfLines={1}>{file.name}</Text>
        <Text style={styles.folderMeta}>{formatBytes(file.size)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MySpace</Text>
          <Ionicons name="search" size={22} color="rgba(255,255,255,0.8)" />
        </View>
        <Text style={styles.headerSubtitle}>Vasi fajlovi u cloudu</Text>
      </View>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <View style={styles.breadcrumbs}>
          <TouchableOpacity onPress={() => { setBreadcrumbs([]); setCurrentFolder('root'); setLoading(true); }}>
            <Ionicons name="home" size={16} color={colors.primary} />
          </TouchableOpacity>
          {breadcrumbs.map((bc, i) => (
            <View key={bc.id} style={styles.breadcrumbItem}>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              <TouchableOpacity onPress={() => {
                setBreadcrumbs(breadcrumbs.slice(0, i + 1));
                setCurrentFolder(bc.id);
                setLoading(true);
              }}>
                <Text style={styles.breadcrumbText} numberOfLines={1}>{bc.name}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : folders.length === 0 && files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Prazan folder</Text>
        </View>
      ) : (
        <FlatList
          data={[...folders.map(f => ({ ...f, _type: 'folder' as const })), ...files.map(f => ({ ...f, _type: 'file' as const }))]}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item, index }) => {
            if (item._type === 'folder') return renderFolder(item as DiskFolder & { _type: 'folder' }, index);
            return renderFile(item as DiskFile & { _type: 'file' });
          }}
          ListHeaderComponent={
            folders.length > 0 && files.length > 0 ? (
              <Text style={styles.sectionTitle}>Fajlovi</Text>
            ) : null
          }
          // Show section title before files
          stickyHeaderIndices={folders.length > 0 && files.length > 0 ? [folders.length] : undefined}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  breadcrumbs: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 4,
  },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 12, color: colors.primary, ...fonts.semibold, maxWidth: 80 },
  folderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  folderIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 13, ...fonts.semibold, color: colors.text },
  folderMeta: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
  sectionTitle: { fontSize: 11, ...fonts.bold, color: colors.textSecondary, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, ...fonts.semibold, color: colors.textMuted, marginTop: 12 },
  fab: {
    position: 'absolute', bottom: 80, right: 16,
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
