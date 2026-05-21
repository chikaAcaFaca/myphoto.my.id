import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/lib/auth-context';
import { useCloudGate } from '@/lib/cloud-gate';
import { removeBackground, NoSubjectError } from '@/lib/remove-bg';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type FilterType = 'original' | 'bright' | 'contrast' | 'warm' | 'cool' | 'bw';

// Filters are wired but the underlying color-grading isn't shipped yet —
// expo-image-manipulator only does resize/rotate/crop, so adding a real
// brightness/contrast pipeline needs a separate dependency (Skia, GL, or
// a server pass). Until then we keep the Original button working and the
// rest mark themselves as "Uskoro" instead of throwing.
const FILTERS: { key: FilterType; label: string; icon: string; comingSoon?: boolean }[] = [
  { key: 'original', label: 'Original', icon: 'image-outline' },
  { key: 'bright', label: 'Svetlo', icon: 'sunny-outline', comingSoon: true },
  { key: 'contrast', label: 'Kontrast', icon: 'contrast-outline', comingSoon: true },
  { key: 'warm', label: 'Toplo', icon: 'flame-outline', comingSoon: true },
  { key: 'cool', label: 'Hladno', icon: 'snow-outline', comingSoon: true },
  { key: 'bw', label: 'C/B', icon: 'moon-outline', comingSoon: true },
];

export default function ImageEditorScreen() {
  const { colors: tc } = useTheme();
  const { id, name, uri: sourceUri, isUploaded } = useLocalSearchParams<{
    id: string; name: string; uri?: string; isUploaded?: string;
  }>();
  const { getToken } = useAuth();
  const { ensureOnCloud } = useCloudGate();
  // Image is loaded via a presigned S3 URL fetched on mount — the
  // /api/stream/[id] endpoint authenticates via session cookie which
  // mobile (Bearer-token-only) can't satisfy, so dropping it directly
  // into expo-image's source results in a black frame.
  const [currentUri, setCurrentUri] = useState<string>(sourceUri || '');
  const [originalUri, setOriginalUri] = useState<string>(sourceUri || '');
  const [imageLoading, setImageLoading] = useState<boolean>(!sourceUri);
  const [activeFilter, setActiveFilter] = useState<FilterType>('original');
  const [processing, setProcessing] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sourceUri || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setImageLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/files/${id}/download-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { downloadUrl } = await res.json();
        if (cancelled) return;
        setCurrentUri(downloadUrl);
        setOriginalUri(downloadUrl);
      } catch (e) {
        console.error('Editor image load error:', e);
        if (!cancelled) Alert.alert('Greska', 'Nije moguce ucitati sliku za izmenu.');
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, sourceUri, getToken]);

  const applyFilter = useCallback(async (filter: FilterType) => {
    if (filter === 'original') {
      setCurrentUri(originalUri);
      setActiveFilter('original');
      return;
    }
    // Until real color filters land, the non-Original buttons just
    // surface a friendly notice rather than running the no-op pipeline
    // that previously left users staring at the same image.
    Alert.alert('Uskoro', 'Filteri za boje su u izradi i biće dostupni u sledećoj verziji aplikacije.');
  }, [originalUri]);

  const handleRemoveBg = useCallback(async () => {
    if (!currentUri) return;

    // Cloud gate: we only process photos that are protected in the cloud. A
    // photo opened by cloud id resolves to an http URL (already backed up);
    // a device-only photo carries isUploaded='0' and gets backed up first.
    const isOnCloud = isUploaded === '1' || currentUri.startsWith('http');
    const ready = await ensureOnCloud({ assetId: id, isUploaded: isOnCloud });
    if (!ready) return;

    setRemovingBg(true);
    try {
      // On-device segmentation needs a local file. Remote (presigned S3)
      // images are downloaded to cache first; local URIs are used as-is.
      let localUri = currentUri;
      if (currentUri.startsWith('http')) {
        const dl = await FileSystem.downloadAsync(
          currentUri,
          `${FileSystem.cacheDirectory}removebg_src_${id || Date.now()}.jpg`
        );
        localUri = dl.uri;
      }

      const resultUri = await removeBackground(localUri);
      setCurrentUri(resultUri);
      Alert.alert('Uspeh', 'Pozadina je uklonjena!');
    } catch (e) {
      if (e instanceof NoSubjectError) {
        Alert.alert('Nema subjekta', 'Nije pronađen jasan subjekt na slici. Pokušaj sa drugom slikom.');
      } else {
        console.log('Remove bg error:', e);
        Alert.alert('Greska', 'Uklanjanje pozadine nije uspelo. Pokušaj ponovo.');
      }
    } finally {
      setRemovingBg(false);
    }
  }, [currentUri, id, isUploaded, ensureOnCloud]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Dozvolite pristup galeriji.');
        return;
      }

      let saveUri = currentUri;
      // If it's a remote URL, download first
      if (currentUri.startsWith('http')) {
        const download = await FileSystem.downloadAsync(
          currentUri,
          `${FileSystem.cacheDirectory}save_edited_${id}.jpg`
        );
        saveUri = download.uri;
      }

      await MediaLibrary.saveToLibraryAsync(saveUri);
      Alert.alert('Sacuvano', 'Slika je sacuvana u galeriju.');
    } catch (e) {
      console.log('Save error:', e);
      Alert.alert('Greska', 'Cuvanje nije uspelo.');
    } finally {
      setSaving(false);
    }
  }, [currentUri, id]);

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>{name || 'Editor'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.topBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="download-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Image preview */}
      <View style={styles.imageContainer}>
        {processing || removingBg || imageLoading ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>
              {imageLoading
                ? 'Učitavam sliku...'
                : removingBg
                  ? 'Uklanjam pozadinu...'
                  : 'Primenjujem filter...'}
            </Text>
          </View>
        ) : null}
        {currentUri ? (
          <Image
            source={{ uri: currentUri }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
        ) : null}
      </View>

      {/* Tools */}
      <View style={[styles.toolsContainer, { backgroundColor: tc.bgCard }]}>
        {/* Remove Background button */}
        <TouchableOpacity
          style={[styles.removeBgBtn, { backgroundColor: colors.accent }]}
          onPress={handleRemoveBg}
          disabled={removingBg}
        >
          {removingBg ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cut-outline" size={18} color="#fff" />
          )}
          <Text style={styles.removeBgText}>Ukloni pozadinu</Text>
        </TouchableOpacity>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterBtn,
                activeFilter === f.key && { borderColor: colors.primary, borderWidth: 2 },
                f.comingSoon && { opacity: 0.55 },
              ]}
              onPress={() => applyFilter(f.key)}
              disabled={processing}
            >
              <Ionicons
                name={f.icon as any}
                size={20}
                color={activeFilter === f.key ? colors.primary : tc.textMuted}
              />
              <Text style={[styles.filterLabel, activeFilter === f.key && { color: colors.primary }]}>
                {f.label}
              </Text>
              {f.comingSoon && (
                <Text style={{ fontSize: 8, color: tc.textMuted, marginTop: 1 }}>uskoro</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 8, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileName: { flex: 1, color: '#fff', fontSize: 14, ...fonts.semibold, textAlign: 'center', marginHorizontal: 8 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  image: { width: width, height: height * 0.55 },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  processingText: { color: '#fff', fontSize: 13, ...fonts.medium, marginTop: 8 },
  toolsContainer: {
    paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  removeBgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: radius.md, paddingVertical: 12, marginBottom: 12,
  },
  removeBgText: { color: '#fff', fontSize: 13, ...fonts.bold },
  filtersRow: { paddingHorizontal: 12, gap: 12 },
  filterBtn: {
    alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent',
  },
  filterLabel: { fontSize: 10, ...fonts.medium, color: colors.textMuted },
});
