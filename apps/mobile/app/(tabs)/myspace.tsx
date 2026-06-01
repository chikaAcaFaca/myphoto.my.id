import { Component, useState, useEffect, useCallback, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { formatBytes } from '@myphoto/shared';
import { downloadToDevice, type CloudFile } from '@/lib/cloud-download';
import type { DiskFolder, DiskFile } from '@myphoto/shared';

// Tab-local ErrorBoundary so a single bad record doesn't dump the user back
// to the launcher. The global ErrorBoundary in _layout would catch a JS
// throw too, but it tears down the whole nav stack; this one keeps the user
// inside the tabs.
class MySpaceErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MySpace render error:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
          <Ionicons name="warning-outline" size={48} color="#facc15" />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
            MySpace nije uspeo da se učita
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#0ea5e9', borderRadius: 8 }}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Pokušaj ponovo</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const FOLDER_COLORS = ['#dbeafe', '#fce7f3', '#dcfce7', '#fff7ed', '#f3e8ff', '#fef3c7'];

function getFileIcon(mimeType: string | undefined | null, filename?: string): string {
  // Disk files saved before mimeType was always set can land here with
  // mimeType=undefined. Calling .startsWith on undefined throws TypeError —
  // and since renderFile runs once per row, that throw blew up the whole
  // MySpace screen on mount (user landed in Downloads, app exited to home).
  const m = (mimeType || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'videocam';
  if (m.startsWith('audio/')) return 'musical-notes';
  if (m.includes('pdf')) return 'document-text';
  if (m.includes('zip') || m.includes('rar') || m.includes('android.package')) return 'archive';
  // Filename-extension fallback for older records with no mimeType at all.
  const ext = (filename || '').toLowerCase().split('.').pop() || '';
  if (['apk', 'zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'videocam';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return 'musical-notes';
  if (ext === 'pdf') return 'document-text';
  return 'document';
}

export default function MySpaceScreenWithBoundary() {
  return (
    <MySpaceErrorBoundary>
      <MySpaceScreen />
    </MySpaceErrorBoundary>
  );
}

// One entry in the navigation history — the folder we landed on plus the
// path (breadcrumbs) we had at the time, so Back/Forward restores both.
type NavEntry = { id: string; name: string; parents: { id: string; name: string }[] };
const ROOT_ENTRY: NavEntry = { id: 'root', name: 'Home', parents: [] };

function MySpaceScreen() {
  const { colors: tc } = useTheme();
  const { getToken } = useAuth();
  const [folders, setFolders] = useState<DiskFolder[]>([]);
  const [files, setFiles] = useState<DiskFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  // Windows-Explorer-style nav history: full visit sequence + cursor. Back
  // walks the cursor left, Forward walks it right, Up adds a parent-folder
  // entry (counts as a navigation, so it pushes onto history).
  const [history, setHistory] = useState<NavEntry[]>([ROOT_ENTRY]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const canGoUp = breadcrumbs.length > 0;

  const fetchFolder = useCallback(async (parentId: string, refresh = false) => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/folders?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Force arrays even if the API momentarily returns null / an error
      // shape — Array.prototype.map / spread on a non-array would crash the
      // render at line 193's `[...folders.map(...), ...files.map(...)]`.
      setFolders(Array.isArray(data.folders) ? data.folders : []);
      setFiles(Array.isArray(data.files) ? data.files : []);
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

  // Apply a NavEntry as the current view — used by Back/Forward where we
  // already know exactly where we're going.
  const applyEntry = (entry: NavEntry) => {
    setBreadcrumbs(entry.id === 'root' ? [] : [...entry.parents, { id: entry.id, name: entry.name }]);
    setCurrentFolder(entry.id);
    setLoading(true);
  };

  // Drilling INTO a folder is a forward navigation. We trim anything past
  // the current cursor (matches browser/Explorer "you can't go forward to a
  // future you've abandoned") and push the new entry on top.
  const navigateToFolder = (folder: DiskFolder) => {
    const entry: NavEntry = {
      id: folder.id,
      name: folder.name || 'Folder',
      parents: breadcrumbs,
    };
    setHistory((h) => [...h.slice(0, historyIndex + 1), entry]);
    setHistoryIndex((i) => i + 1);
    applyEntry(entry);
  };

  const goBack = () => {
    if (!canGoBack) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    applyEntry(history[i]);
  };

  const goForward = () => {
    if (!canGoForward) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    applyEntry(history[i]);
  };

  // Up = the parent folder. Adds an entry to history (Explorer does too —
  // Up arrow shows up in the Back stack afterwards).
  const goUp = () => {
    if (!canGoUp) return;
    const newCrumbs = breadcrumbs.slice(0, -1);
    const parent = newCrumbs.length > 0 ? newCrumbs[newCrumbs.length - 1] : null;
    const entry: NavEntry = parent
      ? { id: parent.id, name: parent.name, parents: newCrumbs.slice(0, -1) }
      : ROOT_ENTRY;
    setHistory((h) => [...h.slice(0, historyIndex + 1), entry]);
    setHistoryIndex((i) => i + 1);
    applyEntry(entry);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFolder(currentFolder, true);
  };

  // Date can come back as an ISO string, a Firestore Timestamp object that
  // didn't get serialised, or undefined; we just want a date string and
  // never want a throw to nuke the row.
  const safeDate = (v: any): string => {
    try {
      if (!v) return '';
      const d = v instanceof Date ? v : new Date(v);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString();
    } catch { return ''; }
  };

  const renderFolder = (folder: DiskFolder, index: number) => (
    <TouchableOpacity key={folder.id} style={[styles.folderItem, { backgroundColor: tc.bgCard }]} onPress={() => navigateToFolder(folder)}>
      <View style={[styles.folderIcon, { backgroundColor: FOLDER_COLORS[index % FOLDER_COLORS.length] }]}>
        <Ionicons name="folder" size={20} color={colors.accent} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: tc.text }]} numberOfLines={1}>{folder.name || 'Bez imena'}</Text>
        <Text style={[styles.folderMeta, { color: tc.textMuted }]}>{safeDate(folder.updatedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
    </TouchableOpacity>
  );

  const handleFilePress = async (file: DiskFile) => {
    Alert.alert(file.name, formatBytes(file.size), [
      { text: 'Otkazi', style: 'cancel' },
      {
        text: 'Preuzmi na uredjaj',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;
            const safeMime = file.mimeType || '';
            const cloudFile: CloudFile = {
              id: file.id,
              name: file.name,
              s3Key: file.s3Key,
              mimeType: safeMime,
              size: file.size,
              type: safeMime.startsWith('image/') ? 'image' : safeMime.startsWith('video/') ? 'video' : 'document',
            };
            const result = await downloadToDevice(cloudFile, token);
            if (result.success) {
              Alert.alert('Preuzeto', `${file.name} je sacuvan na uredjaj.`);
            } else {
              Alert.alert('Greska', result.error || 'Preuzimanje nije uspelo.');
            }
          } catch (e) {
            Alert.alert('Greska', 'Mrezna greska.');
          }
        },
      },
    ]);
  };

  const renderFile = (file: DiskFile) => (
    <TouchableOpacity key={file.id} style={[styles.folderItem, { backgroundColor: tc.bgCard }]} onPress={() => handleFilePress(file)}>
      <View style={[styles.folderIcon, { backgroundColor: '#f1f5f9' }]}>
        <Ionicons name={getFileIcon(file.mimeType, file.name) as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: tc.text }]} numberOfLines={1}>{file.name || 'Bez imena'}</Text>
        <Text style={[styles.folderMeta, { color: tc.textMuted }]}>{formatBytes(file.size || 0)}</Text>
      </View>
      <Ionicons name="download-outline" size={18} color={tc.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>MySpace</Text>
          <Ionicons name="search" size={22} color="rgba(255,255,255,0.8)" />
        </View>
        <Text style={styles.headerSubtitle}>Vasi fajlovi u cloudu</Text>
      </View>

      {/* Nav toolbar — Windows-Explorer-style: ← Back / → Forward / ↑ Up
          on the left, then the home button + breadcrumbs as the address
          path. Stays visible even at root so the arrows are reachable on
          first scroll into a folder. */}
      <View style={[styles.breadcrumbs, { backgroundColor: tc.bgCard }]}>
        <TouchableOpacity onPress={goBack} disabled={!canGoBack} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={18} color={canGoBack ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goForward} disabled={!canGoForward} style={styles.navBtn}>
          <Ionicons name="arrow-forward" size={18} color={canGoForward ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goUp} disabled={!canGoUp} style={styles.navBtn}>
          <Ionicons name="arrow-up" size={18} color={canGoUp ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.navDivider} />
        <TouchableOpacity onPress={() => {
          // Home — same as navigating to root via the nav (push history).
          if (currentFolder === 'root') return;
          setHistory((h) => [...h.slice(0, historyIndex + 1), ROOT_ENTRY]);
          setHistoryIndex((i) => i + 1);
          applyEntry(ROOT_ENTRY);
        }}>
          <Ionicons name="home" size={16} color={colors.primary} />
        </TouchableOpacity>
        {breadcrumbs.map((bc, i) => (
          <View key={bc.id} style={styles.breadcrumbItem}>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            <TouchableOpacity onPress={() => {
              // Click a breadcrumb segment = navigate to it, push history.
              const entry: NavEntry = { id: bc.id, name: bc.name, parents: breadcrumbs.slice(0, i) };
              setHistory((h) => [...h.slice(0, historyIndex + 1), entry]);
              setHistoryIndex((idx) => idx + 1);
              applyEntry(entry);
            }}>
              <Text style={styles.breadcrumbText} numberOfLines={1}>{bc.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

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
          // Skip null/garbage entries up front so a single bad record can't
          // throw inside .map / spread and tear the screen down.
          data={[
            ...folders.filter(Boolean).map((f, i) => ({ ...f, _type: 'folder' as const, _idx: i })),
            ...files.filter(Boolean).map((f) => ({ ...f, _type: 'file' as const, _idx: 0 })),
          ]}
          keyExtractor={(item, i) => (item?.id ? String(item.id) : `row-${i}`)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => {
            // Final safety net — even with everything guarded, one rogue
            // row shouldn't take the whole list with it.
            try {
              if (item._type === 'folder') {
                return renderFolder(item as DiskFolder & { _type: 'folder' }, item._idx);
              }
              return renderFile(item as DiskFile & { _type: 'file' });
            } catch (e) {
              console.warn('MySpace row render skipped:', e);
              return null;
            }
          }}
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 4,
  },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  navDivider: { width: 1, height: 20, backgroundColor: colors.borderLight, marginHorizontal: 4 },
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
