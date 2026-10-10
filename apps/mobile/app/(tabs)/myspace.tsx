import { Component, useState, useEffect, useCallback, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LibrarySwitcher } from '@/components/LibrarySwitcher';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { formatBytes } from '@myphoto/shared';
import { downloadToDevice, type CloudFile } from '@/lib/cloud-download';
import type { DiskFolder, DiskFile } from '@myphoto/shared';
import { useT, t as tStatic } from '@/lib/i18n';

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
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
          <Ionicons name="warning-outline" size={48} color={colors.warning} />
          <Text style={{ color: colors.text, fontSize: 18, marginTop: 12, textAlign: 'center', ...fonts.display }}>
            {tStatic('myspace.loadFailed')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            style={{ marginTop: 16, paddingHorizontal: 22, height: 48, justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 24 }}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{tStatic('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

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
  const navColor = (enabled: boolean) => (enabled ? tc.text : tc.textMuted);
  const { t, dateLocale } = useT();
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
      name: folder.name || t('myspace.folderFallback'),
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
      return d.toLocaleDateString(dateLocale);
    } catch { return ''; }
  };

  const renderFolder = (folder: DiskFolder, index: number) => (
    <TouchableOpacity key={folder.id} style={[styles.folderItem, { backgroundColor: tc.bgCard, borderColor: tc.border }]} onPress={() => navigateToFolder(folder)}>
      <View style={[styles.folderIcon, { backgroundColor: tc.primaryLight }]}>
        <Ionicons name="folder" size={20} color={tc.primary} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: tc.text }]} numberOfLines={1}>{folder.name || t('myspace.untitled')}</Text>
        <Text style={[styles.folderMeta, { color: tc.textSecondary }]}>{safeDate(folder.updatedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tc.textMuted} />
    </TouchableOpacity>
  );

  const handleFilePress = async (file: DiskFile) => {
    Alert.alert(file.name, formatBytes(file.size), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('myspace.downloadToDevice'),
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
              Alert.alert(t('myspace.downloadedTitle'), t('myspace.downloadedMessage', { name: file.name }));
            } else {
              Alert.alert(t('common.error'), result.error || t('myspace.downloadFailed'));
            }
          } catch (e) {
            Alert.alert(t('common.error'), t('myspace.networkError'));
          }
        },
      },
    ]);
  };

  const renderFile = (file: DiskFile) => (
    <TouchableOpacity key={file.id} style={[styles.folderItem, { backgroundColor: tc.bgCard, borderColor: tc.border }]} onPress={() => handleFilePress(file)}>
      <View style={[styles.folderIcon, { backgroundColor: tc.bgInput }]}>
        <Ionicons name={getFileIcon(file.mimeType, file.name) as any} size={20} color={tc.textSecondary} />
      </View>
      <View style={styles.folderInfo}>
        <Text style={[styles.folderName, { color: tc.text }]} numberOfLines={1}>{file.name || t('myspace.untitled')}</Text>
        <Text style={[styles.folderMeta, { color: tc.textSecondary }]}>{formatBytes(file.size || 0)}</Text>
      </View>
      <Ionicons name="download-outline" size={18} color={tc.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScreenHeader title={t('nav.tabs.photos')}>
        <LibrarySwitcher active="myspace" />
      </ScreenHeader>

      {/* Nav toolbar — Windows-Explorer-style: ← Back / → Forward / ↑ Up
          on the left, then the home button + breadcrumbs as the address
          path. Stays visible even at root so the arrows are reachable on
          first scroll into a folder. */}
      <View style={[styles.breadcrumbs, { backgroundColor: tc.bg, borderBottomColor: tc.border }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={goBack} disabled={!canGoBack} style={[styles.navBtn, { backgroundColor: tc.bgInput }]}>
          <Ionicons name="arrow-back" size={18} color={navColor(canGoBack)} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.next')} onPress={goForward} disabled={!canGoForward} style={[styles.navBtn, { backgroundColor: tc.bgInput }]}>
          <Ionicons name="arrow-forward" size={18} color={navColor(canGoForward)} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={goUp} disabled={!canGoUp} style={[styles.navBtn, { backgroundColor: tc.bgInput }]}>
          <Ionicons name="arrow-up" size={18} color={navColor(canGoUp)} />
        </TouchableOpacity>
        <View style={[styles.navDivider, { backgroundColor: tc.border }]} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('nav.library.myspace')} style={styles.homeBtn} onPress={() => {
          // Home — same as navigating to root via the nav (push history).
          if (currentFolder === 'root') return;
          setHistory((h) => [...h.slice(0, historyIndex + 1), ROOT_ENTRY]);
          setHistoryIndex((i) => i + 1);
          applyEntry(ROOT_ENTRY);
        }}>
          <Ionicons name="home" size={18} color={tc.primary} />
        </TouchableOpacity>
        {breadcrumbs.map((bc, i) => (
          <View key={bc.id} style={styles.breadcrumbItem}>
            <Ionicons name="chevron-forward" size={14} color={tc.textMuted} />
            <TouchableOpacity style={styles.crumbBtn} onPress={() => {
              // Click a breadcrumb segment = navigate to it, push history.
              const entry: NavEntry = { id: bc.id, name: bc.name, parents: breadcrumbs.slice(0, i) };
              setHistory((h) => [...h.slice(0, historyIndex + 1), entry]);
              setHistoryIndex((idx) => idx + 1);
              applyEntry(entry);
            }}>
              <Text style={[styles.breadcrumbText, { color: tc.primary }]} numberOfLines={1}>{bc.name}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : folders.length === 0 && files.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={56} color={tc.textMuted} />
          <Text style={[styles.emptyText, { color: tc.textSecondary }]}>{t('myspace.emptyFolder')}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} colors={[tc.primary]} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  breadcrumbs: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderBottomWidth: 1, gap: 6,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  navDivider: { width: 1, height: 24, marginHorizontal: 2 },
  homeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  crumbBtn: { minHeight: 44, justifyContent: 'center' },
  breadcrumbText: { fontSize: 13, ...fonts.semibold, maxWidth: 80 },
  folderItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
    borderRadius: 14, borderWidth: 1,
  },
  folderIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  folderInfo: { flex: 1 },
  folderName: { fontSize: 15, ...fonts.semibold },
  folderMeta: { fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, ...fonts.semibold, marginTop: 12 },
});
