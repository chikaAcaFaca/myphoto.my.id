import { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
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
import { radius, fonts } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';
import { HeaderIconButton } from '@/components/ScreenHeader';
import { useTheme } from '@/lib/theme-context';
import { ZoomPanView } from '@/components/ZoomPanView';
import { useT, type TKey } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const STICKER_SIZE = width - 80;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type StickerShape = 'circle' | 'rounded' | 'star' | 'heart' | 'text';

const SHAPES: { key: StickerShape; labelKey: TKey; icon: string }[] = [
  { key: 'circle', labelKey: 'sticker.shapeCircle', icon: 'ellipse-outline' },
  { key: 'rounded', labelKey: 'sticker.shapeRounded', icon: 'square-outline' },
  { key: 'star', labelKey: 'sticker.shapeStar', icon: 'star-outline' },
  { key: 'heart', labelKey: 'sticker.shapeHeart', icon: 'heart-outline' },
  { key: 'text', labelKey: 'sticker.shapeText', icon: 'text-outline' },
];

const BORDER_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

// SVG paths for complex shapes
const STAR_PATH = 'M50,5 L61,35 L95,35 L68,57 L79,91 L50,70 L21,91 L32,57 L5,35 L39,35 Z';
const HEART_PATH = 'M50,90 C25,65 0,50 0,30 C0,13 13,0 30,0 C40,0 48,5 50,15 C52,5 60,0 70,0 C87,0 100,13 100,30 C100,50 75,65 50,90 Z';

export default function StickerMakerScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
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
        Alert.alert(t('sticker.noSubjectTitle'), t('sticker.noSubjectMessage'));
      } else {
        Alert.alert(t('common.error'), t('sticker.removeBgFailed'));
      }
    } finally {
      setRemovingBg(false);
    }
  }, [imageUri, id, ensureOnCloud, t]);

  const handleSave = useCallback(async () => {
    if (!imageUri && shape !== 'text') return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') {
        Alert.alert(t('common.permission'), t('sticker.allowGallery'));
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
        // Drop the sticker into a dedicated "MyPhoto Stickers" album so the
        // user can find it in the Viber / WhatsApp / Telegram image picker
        // instead of scrolling through every photo on the device.
        const asset = await MediaLibrary.createAssetAsync(saveUri);
        try {
          const album = await MediaLibrary.getAlbumAsync('MyPhoto Stickers');
          if (album) {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
          } else {
            await MediaLibrary.createAlbumAsync('MyPhoto Stickers', asset, false);
          }
        } catch (e) {
          // Album step is best-effort — if it fails the asset is still in
          // the device gallery, just not under our named album.
          console.warn('Album organize failed:', e);
        }
      }
      Alert.alert(
        t('sticker.savedTitle'),
        t('sticker.savedToDevice', { album: 'MyPhoto Stickers' }),
      );
    } catch (e) {
      Alert.alert(t('common.error'), t('sticker.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [imageUri, shape, captureSticker, t]);

  // Save the styled sticker into the user's MySpace cloud (personal space).
  const handleSaveToSpace = useCallback(async () => {
    setSavingSpace(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert(t('sticker.signInTitle'), t('sticker.signInToSave'));
        return;
      }
      const captured = (await captureSticker()) || imageUri;
      if (!captured) {
        Alert.alert(t('common.error'), t('sticker.nothingToSave'));
        return;
      }
      const ok = await saveToMySpace({
        uri: captured,
        filename: `stiker-${Date.now()}.png`,
        mimeType: 'image/png',
        token,
        folderName: 'Stikeri',
        isSticker: true,
      });
      if (ok) {
        Alert.alert(
          t('common.saved'),
          t('sticker.savedToSpace', { album: 'Stikeri' }),
        );
      } else {
        Alert.alert(t('common.error'), t('sticker.saveToSpaceFailed'));
      }
    } finally {
      setSavingSpace(false);
    }
  }, [captureSticker, imageUri, getToken, t]);

  const renderStickerPreview = () => {
    if (shape === 'text') {
      return (
        <View style={[styles.textSticker, { borderColor }]}>
          <Text style={styles.textStickerContent}>
            {stickerText || t('sticker.textPlaceholderPreview')}
          </Text>
          <Text style={styles.textStickerBrand}>myphotomy.space</Text>
        </View>
      );
    }

    if (!imageUri) {
      return (
        <TouchableOpacity style={[styles.pickBtn, { backgroundColor: tc.bgCard, borderColor: tc.border }]} onPress={pickImage}>
          <Ionicons name="image-outline" size={48} color={tc.textMuted} />
          <Text style={[styles.pickText, { color: tc.textSecondary }]}>{t('sticker.pickImage')}</Text>
        </TouchableOpacity>
      );
    }

    const s = STICKER_SIZE;

    if (shape === 'circle' || shape === 'rounded') {
      const br = shape === 'circle' ? s / 2 : 30;
      return (
        <View style={[styles.stickerFrame, { borderRadius: br, borderColor, borderWidth: 4 }]}>
          {/* Pinch-to-zoom + drag the subject inside the clipped frame. The
              frame's overflow:hidden clips the image to the chosen shape. */}
          <ZoomPanView style={StyleSheet.absoluteFillObject} panAtBaseScale>
            <Image
              source={{ uri: imageUri }}
              style={[styles.stickerImage, { borderRadius: br - 4 }]}
              contentFit="cover"
            />
          </ZoomPanView>
        </View>
      );
    }

    // Star and Heart use SVG clip path. We wrap the whole SVG in ZoomPanView
    // so pinch/pan works here too — the outline scales with the image as a
    // side-effect, but pinch is what the user actually asked for and the
    // outline only ever looks "bigger", not wrong.
    const clipId = shape === 'star' ? 'starClip' : 'heartClip';
    const pathD = shape === 'star' ? STAR_PATH : HEART_PATH;

    return (
      <View style={{ width: s, height: s, overflow: 'hidden' }}>
        <ZoomPanView style={StyleSheet.absoluteFillObject} panAtBaseScale>
          <Svg width={s} height={s} viewBox="0 0 100 100">
            <Defs>
              <ClipPath id={clipId}>
                <Path d={pathD} />
              </ClipPath>
            </Defs>
            <SvgImage
              href={imageUri}
              x={0}
              y={0}
              width={100}
              height={100}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
            <Path d={pathD} stroke={borderColor} strokeWidth="3" fill="none" />
          </Svg>
        </ZoomPanView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader
        title={t('sticker.title')}
        actions={
          <>
            {savingSpace ? (
              <View style={[styles.headerBusy, { backgroundColor: tc.bgInput }]}>
                <ActivityIndicator size="small" color={tc.text} />
              </View>
            ) : (
              <HeaderIconButton icon="cloud-upload-outline" label={t('sticker.saveToMySpace')} onPress={handleSaveToSpace} />
            )}
            {saving ? (
              <View style={[styles.headerBusy, { backgroundColor: tc.bgInput }]}>
                <ActivityIndicator size="small" color={tc.text} />
              </View>
            ) : (
              <HeaderIconButton icon="download-outline" label={t('common.save')} onPress={handleSave} />
            )}
          </>
        }
      />

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
        {/* Preview */}
        <View style={styles.previewArea}>
          <View style={[styles.checkerboard, { backgroundColor: tc.bgInput, borderColor: tc.border }]}>
            <View ref={stickerRef} collapsable={false}>
              {renderStickerPreview()}
            </View>
          </View>
        </View>

        {/* All shapes (circle/rounded/star/heart) use pinch-to-zoom + drag via
            ZoomPanView now. The +/- buttons are gone — they were strictly worse
            and confused the user about which gesture was authoritative. */}
        {imageUri && shape !== 'text' && (
          <Text style={[styles.zoomHint, { color: tc.textSecondary }]}>
            {t('sticker.gestureHint')}
          </Text>
        )}

        {/* Tools */}
        <View style={[styles.toolsCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
          {/* Remove BG */}
          {imageUri && !bgRemoved && shape !== 'text' && (
            <TouchableOpacity style={[styles.removeBgBtn, { backgroundColor: tc.bgInput }]} onPress={handleRemoveBg} disabled={removingBg}>
              {removingBg ? <ActivityIndicator size="small" color={tc.text} /> : (
                <Ionicons name="cut-outline" size={16} color={tc.text} />
              )}
              <Text style={[styles.removeBgText, { color: tc.text }]}>{t('sticker.removeBg')}</Text>
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
              <Text style={styles.removeBgText}>{t('sticker.saveToMySpace')}</Text>
            </TouchableOpacity>
          )}

          {/* Text input for text sticker */}
          {shape === 'text' && (
            <TextInput
              style={[styles.textInput, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
              placeholder={t('sticker.textInputPlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={stickerText}
              onChangeText={setStickerText}
              maxLength={100}
              multiline
            />
          )}

          {/* Shape */}
          <Text style={[styles.label, { color: tc.textSecondary }]}>{t('sticker.shape')}</Text>
          <View style={styles.optionRow}>
            {SHAPES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.shapeBtn, { borderColor: tc.border }, shape === s.key && { backgroundColor: tc.primaryLight, borderColor: tc.primary }]}
                onPress={() => setShape(s.key)}
              >
                <Ionicons name={s.icon as any} size={20} color={shape === s.key ? tc.primary : tc.textSecondary} />
                <Text style={[styles.shapeBtnText, { color: tc.textSecondary }, shape === s.key && { color: tc.primary }]}>{t(s.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Border color */}
          <Text style={[styles.label, { color: tc.textSecondary }]}>{t('sticker.borderColor')}</Text>
          <View style={styles.colorRow}>
            {BORDER_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorCircle, { backgroundColor: c, borderColor: tc.border }, borderColor === c && [styles.colorSelected, { borderColor: tc.text }]]}
                onPress={() => setBorderColor(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: borderColor === c }}
              />
            ))}
          </View>

          {/* Change image */}
          {shape !== 'text' && (
            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
              <Ionicons name="swap-horizontal" size={16} color={tc.text} />
              <Text style={[styles.changeBtnText, { color: tc.text }]}>
                {imageUri ? t('sticker.changeImage') : t('sticker.pickImage')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBusy: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  previewArea: { paddingTop: 8, paddingBottom: 20 },
  checkerboard: {
    width: STICKER_SIZE + 16, height: STICKER_SIZE + 16,
    borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  stickerFrame: { width: STICKER_SIZE, height: STICKER_SIZE, overflow: 'hidden' },
  stickerImage: { width: '100%', height: '100%' },
  pickBtn: {
    width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  textSticker: {
    width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4,
    backgroundColor: '#fff', padding: 20,
  },
  textStickerContent: { fontSize: 24, ...fonts.extrabold, textAlign: 'center', color: '#16181D' },
  textStickerBrand: { fontSize: 10, ...fonts.medium, color: '#8A909B', marginTop: 12 },
  zoomHint: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  toolsCard: { width: width - 24, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginTop: 8 },
  removeBgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.full, minHeight: 48, paddingVertical: 12, marginBottom: 10,
  },
  removeBgText: { color: '#fff', fontSize: 15, ...fonts.bold },
  textInput: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, marginBottom: 12, minHeight: 60, textAlignVertical: 'top',
  },
  label: { fontSize: 12, ...fonts.semibold, letterSpacing: 0.3, marginTop: 8, marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  shapeBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1,
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, minWidth: 56, minHeight: 56,
  },
  shapeBtnText: { fontSize: 11, ...fonts.medium },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1 },
  colorSelected: { borderWidth: 3 },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, minHeight: 44, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
});
