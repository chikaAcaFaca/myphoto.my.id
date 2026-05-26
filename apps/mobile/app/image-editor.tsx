import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Platform, ScrollView,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '@/lib/auth-context';
import { useCloudGate } from '@/lib/cloud-gate';
import { saveToMySpace } from '@/lib/myspace-upload';
import { removeBackground, NoSubjectError } from '@/lib/remove-bg';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { ZoomPanView, type ZoomPanTransform } from '@/components/ZoomPanView';

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
  const [savingSpace, setSavingSpace] = useState(false);
  const [cropping, setCropping] = useState(false);

  // Track the live pinch/pan transform + image+container dims so "Iseci na
  // ram" can compute the visible region in image-space and crop to it.
  const transformRef = useRef<ZoomPanTransform>({ scale: 1, translateX: 0, translateY: 0 });
  const [intrinsic, setIntrinsic] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

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

  // Fetch intrinsic image dims whenever the current image changes —
  // needed to map the visible viewport into image-space for the crop.
  useEffect(() => {
    if (!currentUri) { setIntrinsic(null); return; }
    let cancelled = false;
    RNImage.getSize(
      currentUri,
      (w, h) => { if (!cancelled) setIntrinsic({ width: w, height: h }); },
      () => { if (!cancelled) setIntrinsic(null); }
    );
    return () => { cancelled = true; };
  }, [currentUri]);

  // Crop the image to whatever's currently inside the preview frame after
  // pinch-zoom + pan. Math: with contentFit="contain", the image is laid
  // out at displayedW × displayedH centered in the container; ZoomPanView
  // then scales by `s` around that and translates by (tx, ty). We intersect
  // the displayed rect with the container rect and convert the result back
  // into the image's native pixel coords.
  const handleCrop = useCallback(async () => {
    if (!currentUri || !intrinsic || !containerSize) {
      Alert.alert('Sačekaj', 'Slika se još učitava.');
      return;
    }
    const { width: iw, height: ih } = intrinsic;
    const { w: cw, h: ch } = containerSize;
    const { scale: s, translateX: tx, translateY: ty } = transformRef.current;
    const ratioFit = Math.min(cw / iw, ch / ih);
    const dispW = iw * ratioFit * s;
    const dispH = ih * ratioFit * s;
    const dispX = (cw - dispW) / 2 + tx;
    const dispY = (ch - dispH) / 2 + ty;
    const visX1 = Math.max(0, dispX);
    const visY1 = Math.max(0, dispY);
    const visX2 = Math.min(cw, dispX + dispW);
    const visY2 = Math.min(ch, dispY + dispH);
    if (visX2 <= visX1 || visY2 <= visY1) {
      Alert.alert('Greška', 'Pomeri sliku tako da je vidljiva u kadru, pa pokušaj opet.');
      return;
    }
    const cropX = Math.round((visX1 - dispX) / (ratioFit * s));
    const cropY = Math.round((visY1 - dispY) / (ratioFit * s));
    const cropW = Math.round((visX2 - visX1) / (ratioFit * s));
    const cropH = Math.round((visY2 - visY1) / (ratioFit * s));
    // Edge clamp — float math can push us a pixel past the image bounds.
    const finalX = Math.max(0, Math.min(cropX, iw - 1));
    const finalY = Math.max(0, Math.min(cropY, ih - 1));
    const finalW = Math.max(1, Math.min(cropW, iw - finalX));
    const finalH = Math.max(1, Math.min(cropH, ih - finalY));

    setCropping(true);
    try {
      let localUri = currentUri;
      if (currentUri.startsWith('http')) {
        const dl = await FileSystem.downloadAsync(
          currentUri,
          `${FileSystem.cacheDirectory}crop_src_${Date.now()}.jpg`
        );
        localUri = dl.uri;
      }
      const out = await ImageManipulator.manipulateAsync(
        localUri,
        [{ crop: { originX: finalX, originY: finalY, width: finalW, height: finalH } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(out.uri);
    } catch (e) {
      console.warn('Crop error:', e);
      Alert.alert('Greška', 'Sečenje nije uspelo. Pokušaj ponovo.');
    } finally {
      setCropping(false);
    }
  }, [currentUri, intrinsic, containerSize]);

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

  // Save the current image (e.g. the background-removed cutout) into the
  // user's MySpace cloud — their personal space — not just the device gallery.
  const handleSaveToSpace = useCallback(async () => {
    if (!currentUri) return;
    setSavingSpace(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Prijava', 'Prijavi se da bi sačuvao u svoj prostor.');
        return;
      }
      const isPng = currentUri.toLowerCase().includes('.png') || currentUri.includes('removebg');
      const base = (name || 'slika').replace(/\.[^.]+$/, '');
      const ok = await saveToMySpace({
        uri: currentUri,
        filename: `${base}-${Date.now()}.${isPng ? 'png' : 'jpg'}`,
        mimeType: isPng ? 'image/png' : 'image/jpeg',
        token,
      });
      Alert.alert(
        ok ? 'Sačuvano' : 'Greška',
        ok ? 'Slika je u tvom prostoru (folder „MyPhoto Kreacije").' : 'Čuvanje u prostor nije uspelo. Pokušaj ponovo.',
      );
    } finally {
      setSavingSpace(false);
    }
  }, [currentUri, name, getToken]);

  // Hand the current image (e.g. a freshly background-removed PNG) straight
  // into the sticker / meme tools so the user doesn't have to re-pick it.
  const goToSticker = useCallback(() => {
    if (!currentUri) return;
    router.push({ pathname: '/sticker-maker', params: { uri: currentUri, name: name || 'Slika' } });
  }, [currentUri, name]);

  const goToMeme = useCallback(() => {
    if (!currentUri) return;
    router.push({
      pathname: '/meme-creator',
      params: { uri: currentUri, name: name || 'Slika', ...(id ? { id } : {}), isUploaded: isUploaded || '0' },
    });
  }, [currentUri, name, id, isUploaded]);

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>{name || 'Editor'}</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={handleSaveToSpace} disabled={savingSpace} style={styles.topBtn}>
            {savingSpace ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.topBtn}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Image preview */}
      <View
        style={styles.imageContainer}
        onLayout={(e) => setContainerSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {processing || removingBg || imageLoading || cropping ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>
              {imageLoading
                ? 'Učitavam sliku...'
                : removingBg
                  ? 'Uklanjam pozadinu...'
                  : cropping
                    ? 'Sečem...'
                    : 'Primenjujem filter...'}
            </Text>
          </View>
        ) : null}
        {currentUri ? (
          // Pinch to zoom + drag to pan. Remounting on uri change resets the
          // transform so a freshly cropped / bg-removed image opens at 1×.
          <ZoomPanView
            key={currentUri}
            style={StyleSheet.absoluteFillObject}
            onTransformChange={(t) => { transformRef.current = t; }}
          >
            <Image
              source={{ uri: currentUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
            />
          </ZoomPanView>
        ) : null}
      </View>

      {/* Tools */}
      <View style={[styles.toolsContainer, { backgroundColor: tc.bgCard }]}>
        <Text style={[styles.zoomHint, { color: tc.textMuted }]}>
          Uštipni sa 2 prsta za zum · prevuci da pomeriš · pa „Iseci na ram"
        </Text>

        {/* Crop to the visible viewport after pinch/pan. */}
        <TouchableOpacity
          style={[styles.removeBgBtn, { backgroundColor: '#0ea5e9' }]}
          onPress={handleCrop}
          disabled={cropping || !currentUri || !intrinsic}
        >
          {cropping ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="crop-outline" size={18} color="#fff" />
          )}
          <Text style={styles.removeBgText}>Iseci na ram</Text>
        </TouchableOpacity>

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

        {/* Turn the current image straight into a sticker or meme */}
        <View style={styles.makeRow}>
          <TouchableOpacity
            style={[styles.makeBtn, { backgroundColor: '#ec4899' }]}
            onPress={goToSticker}
            disabled={!currentUri || removingBg}
          >
            <Ionicons name="happy-outline" size={18} color="#fff" />
            <Text style={styles.makeBtnText}>Napravi stiker</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.makeBtn, { backgroundColor: '#f97316' }]}
            onPress={goToMeme}
            disabled={!currentUri || removingBg}
          >
            <Ionicons name="flame-outline" size={18} color="#fff" />
            <Text style={styles.makeBtnText}>Napravi meme</Text>
          </TouchableOpacity>
        </View>

        {/* Save to personal MySpace cloud */}
        <TouchableOpacity
          style={[styles.spaceBtn, { backgroundColor: colors.primary }]}
          onPress={handleSaveToSpace}
          disabled={!currentUri || savingSpace}
        >
          {savingSpace ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          )}
          <Text style={styles.makeBtnText}>Sačuvaj u moj prostor</Text>
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
  makeRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  makeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.md, paddingVertical: 11,
  },
  makeBtnText: { color: '#fff', fontSize: 13, ...fonts.bold },
  spaceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12, borderRadius: radius.md, paddingVertical: 11,
  },
  filtersRow: { paddingHorizontal: 12, gap: 12 },
  filterBtn: {
    alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent',
  },
  filterLabel: { fontSize: 10, ...fonts.medium, color: colors.textMuted },
  zoomHint: { fontSize: 11, textAlign: 'center', marginHorizontal: 16, marginBottom: 8 },
});
