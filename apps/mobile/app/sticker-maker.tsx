import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Platform, ScrollView, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Defs, ClipPath, Circle, Rect, Path, Image as SvgImage } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { removeBackground, NoSubjectError } from '@/lib/remove-bg';
import { useCloudGate } from '@/lib/cloud-gate';
import { saveToMySpace } from '@/lib/myspace-upload';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const STICKER_SIZE = width - 80;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type StickerShape = 'circle' | 'rounded' | 'star' | 'heart' | 'text';

const SHAPES: { key: StickerShape; label: string; icon: string }[] = [
  { key: 'circle', label: 'Krug', icon: 'ellipse-outline' },
  { key: 'rounded', label: 'Zaobljeno', icon: 'square-outline' },
  { key: 'star', label: 'Zvezda', icon: 'star-outline' },
  { key: 'heart', label: 'Srce', icon: 'heart-outline' },
  { key: 'text', label: 'Tekst', icon: 'text-outline' },
];

const BORDER_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

// SVG paths for complex shapes
const STAR_PATH = 'M50,5 L61,35 L95,35 L68,57 L79,91 L50,70 L21,91 L32,57 L5,35 L39,35 Z';
const HEART_PATH = 'M50,90 C25,65 0,50 0,30 C0,13 13,0 30,0 C40,0 48,5 50,15 C52,5 60,0 70,0 C87,0 100,13 100,30 C100,50 75,65 50,90 Z';

export default function StickerMakerScreen() {
  const { colors: tc } = useTheme();
  const { id, name, uri: sourceUri } = useLocalSearchParams<{ id?: string; name?: string; uri?: string }>();
  const { ensureOnCloud } = useCloudGate();
  const { getToken } = useAuth();

  // A `uri` param means a tool handed us a ready image (e.g. a background-
  // removed PNG from the editor) — use it directly. Otherwise fall back to the
  // cloud thumbnail for an id-based open.
  const [imageUri, setImageUri] = useState<string | null>(
    sourceUri || (id ? `${API_URL}/api/thumbnail/${id}?size=large` : null)
  );
  const [shape, setShape] = useState<StickerShape>('circle');
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingSpace, setSavingSpace] = useState(false);
  const [stickerText, setStickerText] = useState('');
  const [zoom, setZoom] = useState(1);
  // Snapshot target — the styled sticker (shape + border, transparent around
  // it) rather than the bare source image, so saved files are real stickers.
  const stickerRef = useRef<View>(null);

  const captureSticker = useCallback(async (): Promise<string | null> => {
    if (!stickerRef.current) return null;
    try {
      const uri = await captureRef(stickerRef, { format: 'png', quality: 1, result: 'tmpfile' });
      return uri.startsWith('/') ? `file://${uri}` : uri;
    } catch (e) {
      console.warn('Sticker capture failed:', e);
      return null;
    }
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setBgRemoved(false);
      setZoom(1);
    }
  }, []);

  const handleRemoveBg = useCallback(async () => {
    if (!imageUri) return;

    // Cloud gate. A server thumbnail (id-based) is already in the cloud; a
    // freshly picked image has no cloud identity, so it passes through. The
    // gate becomes meaningful here once stickers can target device-only
    // gallery photos.
    const ready = await ensureOnCloud({ isUploaded: imageUri.startsWith('http') });
    if (!ready) return;

    setRemovingBg(true);
    try {
      // On-device segmentation needs a local file. Server thumbnails and any
      // other remote URIs are downloaded to cache first; picked images are
      // already local.
      let localUri = imageUri;
      if (imageUri.startsWith('http')) {
        const dl = await FileSystem.downloadAsync(
          imageUri,
          `${FileSystem.cacheDirectory}sticker_src_${id || Date.now()}.jpg`
        );
        localUri = dl.uri;
      }

      const resultUri = await removeBackground(localUri);
      setImageUri(resultUri);
      setBgRemoved(true);
    } catch (e) {
      if (e instanceof NoSubjectError) {
        Alert.alert('Nema subjekta', 'Nije pronađen jasan subjekt na slici. Pokušaj sa drugom slikom.');
      } else {
        Alert.alert('Greska', 'Uklanjanje pozadine nije uspelo.');
      }
    } finally {
      setRemovingBg(false);
    }
  }, [imageUri, id, ensureOnCloud]);

  const handleSave = useCallback(async () => {
    if (!imageUri && shape !== 'text') return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Dozvolite pristup galeriji.');
        return;
      }
      // Save the actual styled sticker (shape + border, transparent around it),
      // not the bare source image. Fall back to the image if capture fails.
      let saveUri = (await captureSticker()) || imageUri || '';
      if (saveUri.startsWith('http')) {
        const dl = await FileSystem.downloadAsync(saveUri, `${FileSystem.cacheDirectory}sticker_${Date.now()}.png`);
        saveUri = dl.uri;
      }
      if (saveUri) {
        await MediaLibrary.saveToLibraryAsync(saveUri);
      }
      Alert.alert('Sacuvano!', 'Stiker je sacuvan. Mozete ga koristiti u Viberu i drugim aplikacijama!');
    } catch (e) {
      Alert.alert('Greska', 'Cuvanje nije uspelo.');
    } finally {
      setSaving(false);
    }
  }, [imageUri, shape, captureSticker]);

  // Save the styled sticker into the user's MySpace cloud (personal space).
  const handleSaveToSpace = useCallback(async () => {
    setSavingSpace(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Prijava', 'Prijavi se da bi sačuvao u svoj prostor.');
        return;
      }
      const captured = (await captureSticker()) || imageUri;
      if (!captured) {
        Alert.alert('Greška', 'Nema slike za čuvanje.');
        return;
      }
      const ok = await saveToMySpace({
        uri: captured,
        filename: `stiker-${Date.now()}.png`,
        mimeType: 'image/png',
        token,
      });
      Alert.alert(
        ok ? 'Sačuvano' : 'Greška',
        ok ? 'Stiker je u tvom prostoru (folder „MyPhoto Kreacije").' : 'Čuvanje u prostor nije uspelo.',
      );
    } finally {
      setSavingSpace(false);
    }
  }, [captureSticker, imageUri, getToken]);

  const renderStickerPreview = () => {
    if (shape === 'text') {
      return (
        <View style={[styles.textSticker, { borderColor }]}>
          <Text style={styles.textStickerContent}>
            {stickerText || 'Tvoj tekst ovde'}
          </Text>
          <Text style={styles.textStickerBrand}>myphotomy.space</Text>
        </View>
      );
    }

    if (!imageUri) {
      return (
        <TouchableOpacity style={[styles.pickBtn, { backgroundColor: tc.bgCard }]} onPress={pickImage}>
          <Ionicons name="image-outline" size={48} color={tc.textMuted} />
          <Text style={[styles.pickText, { color: tc.textMuted }]}>Izaberi sliku</Text>
        </TouchableOpacity>
      );
    }

    const s = STICKER_SIZE;

    if (shape === 'circle' || shape === 'rounded') {
      const br = shape === 'circle' ? s / 2 : 30;
      return (
        <View style={[styles.stickerFrame, { borderRadius: br, borderColor, borderWidth: 4 }]}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.stickerImage, { borderRadius: br - 4, transform: [{ scale: zoom }] }]}
            contentFit="cover"
          />
        </View>
      );
    }

    // Star and Heart use SVG clip path
    const clipId = shape === 'star' ? 'starClip' : 'heartClip';
    const pathD = shape === 'star' ? STAR_PATH : HEART_PATH;

    return (
      <View style={{ width: s, height: s }}>
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Defs>
            <ClipPath id={clipId}>
              <Path d={pathD} />
            </ClipPath>
          </Defs>
          <SvgImage
            href={imageUri}
            x={((1 - zoom) / 2) * 100}
            y={((1 - zoom) / 2) * 100}
            width={100 * zoom}
            height={100 * zoom}
            clipPath={`url(#${clipId})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <Path d={pathD} stroke={borderColor} strokeWidth="3" fill="none" />
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={[styles.topBar, { backgroundColor: '#ec4899' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stiker Kreator</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={handleSaveToSpace} disabled={savingSpace} style={styles.topBtn}>
            {savingSpace ? <ActivityIndicator size="small" color="#fff" /> : (
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.topBtn}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
        {/* Preview */}
        <View style={styles.previewArea}>
          <View style={styles.checkerboard}>
            <View ref={stickerRef} collapsable={false}>
              {renderStickerPreview()}
            </View>
          </View>
        </View>

        {/* Zoom control */}
        {imageUri && shape !== 'text' && (
          <View style={styles.zoomRow}>
            <TouchableOpacity onPress={() => setZoom(Math.max(0.5, zoom - 0.1))} style={styles.zoomBtn}>
              <Ionicons name="remove" size={20} color={tc.text} />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: tc.textMuted }]}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity onPress={() => setZoom(Math.min(2, zoom + 0.1))} style={styles.zoomBtn}>
              <Ionicons name="add" size={20} color={tc.text} />
            </TouchableOpacity>
          </View>
        )}

        {/* Tools */}
        <View style={[styles.toolsCard, { backgroundColor: tc.bgCard }]}>
          {/* Remove BG */}
          {imageUri && !bgRemoved && shape !== 'text' && (
            <TouchableOpacity style={[styles.removeBgBtn, { backgroundColor: '#ec4899' }]} onPress={handleRemoveBg} disabled={removingBg}>
              {removingBg ? <ActivityIndicator size="small" color="#fff" /> : (
                <Ionicons name="cut-outline" size={16} color="#fff" />
              )}
              <Text style={styles.removeBgText}>Ukloni pozadinu</Text>
            </TouchableOpacity>
          )}

          {/* Save sticker into personal MySpace cloud */}
          {imageUri && shape !== 'text' && (
            <TouchableOpacity
              style={[styles.removeBgBtn, { backgroundColor: tc.primary }]}
              onPress={handleSaveToSpace}
              disabled={savingSpace}
            >
              {savingSpace ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              )}
              <Text style={styles.removeBgText}>Sačuvaj u moj prostor</Text>
            </TouchableOpacity>
          )}

          {/* Text input for text sticker */}
          {shape === 'text' && (
            <TextInput
              style={[styles.textInput, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
              placeholder="Ukucaj tekst za stiker..."
              placeholderTextColor={tc.textMuted}
              value={stickerText}
              onChangeText={setStickerText}
              maxLength={100}
              multiline
            />
          )}

          {/* Shape */}
          <Text style={[styles.label, { color: tc.textMuted }]}>OBLIK</Text>
          <View style={styles.optionRow}>
            {SHAPES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.shapeBtn, shape === s.key && { backgroundColor: '#ec4899' + '20', borderColor: '#ec4899' }]}
                onPress={() => setShape(s.key)}
              >
                <Ionicons name={s.icon as any} size={20} color={shape === s.key ? '#ec4899' : tc.textMuted} />
                <Text style={[styles.shapeBtnText, shape === s.key && { color: '#ec4899' }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Border color */}
          <Text style={[styles.label, { color: tc.textMuted }]}>BOJA OKVIRA</Text>
          <View style={styles.colorRow}>
            {BORDER_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorCircle, { backgroundColor: c }, borderColor === c && styles.colorSelected]}
                onPress={() => setBorderColor(c)}
              />
            ))}
          </View>

          {/* Change image */}
          {shape !== 'text' && (
            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
              <Ionicons name="swap-horizontal" size={16} color={tc.primary} />
              <Text style={[styles.changeBtnText, { color: tc.primary }]}>
                {imageUri ? 'Promeni sliku' : 'Izaberi sliku'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, paddingTop: Platform.OS === 'ios' ? 50 : 8,
  },
  topBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  previewArea: { paddingVertical: 20 },
  checkerboard: {
    width: STICKER_SIZE + 16, height: STICKER_SIZE + 16,
    backgroundColor: '#e5e7eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#d1d5db',
  },
  stickerFrame: { width: STICKER_SIZE, height: STICKER_SIZE, overflow: 'hidden' },
  stickerImage: { width: '100%', height: '100%' },
  pickBtn: {
    width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  textSticker: {
    width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4,
    backgroundColor: '#fff', padding: 20,
  },
  textStickerContent: { fontSize: 24, ...fonts.extrabold, textAlign: 'center', color: '#1e293b' },
  textStickerBrand: { fontSize: 10, ...fonts.medium, color: '#94a3b8', marginTop: 12 },
  zoomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8,
  },
  zoomBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomText: { fontSize: 14, ...fonts.bold, width: 50, textAlign: 'center' },
  toolsCard: { width: width - 24, borderRadius: radius.lg, padding: 16, marginTop: 8 },
  removeBgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.md, paddingVertical: 12, marginBottom: 12,
  },
  removeBgText: { color: '#fff', fontSize: 13, ...fonts.bold },
  textInput: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, marginBottom: 12, minHeight: 60, textAlignVertical: 'top',
  },
  label: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginTop: 8, marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  shapeBtn: {
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8,
  },
  shapeBtnText: { fontSize: 9, ...fonts.medium, color: colors.textSecondary },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#d1d5db' },
  colorSelected: { borderWidth: 3, borderColor: '#1e293b' },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
});
