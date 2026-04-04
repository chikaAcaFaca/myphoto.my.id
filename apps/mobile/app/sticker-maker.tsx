import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const STICKER_SIZE = width - 80;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type StickerShape = 'circle' | 'rounded' | 'star' | 'heart';

const SHAPES: { key: StickerShape; label: string; icon: string }[] = [
  { key: 'circle', label: 'Krug', icon: 'ellipse-outline' },
  { key: 'rounded', label: 'Zaobljeno', icon: 'square-outline' },
  { key: 'star', label: 'Zvezda', icon: 'star-outline' },
  { key: 'heart', label: 'Srce', icon: 'heart-outline' },
];

const BORDER_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function StickerMakerScreen() {
  const { colors: tc } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [shape, setShape] = useState<StickerShape>('circle');
  const [borderColor, setBorderColor] = useState('#ffffff');
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setBgRemoved(false);
    }
  }, []);

  const handleRemoveBg = useCallback(async () => {
    if (!imageUri || !id) return;
    setRemovingBg(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files/${id}/remove-bg`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.resultUrl) {
          setImageUri(data.resultUrl);
          setBgRemoved(true);
        }
      } else {
        Alert.alert('Info', 'Uklanjanje pozadine nije dostupno za ovu sliku.');
      }
    } catch (e) {
      Alert.alert('Greska', 'Uklanjanje pozadine nije uspelo.');
    } finally {
      setRemovingBg(false);
    }
  }, [imageUri, id, getToken]);

  const handleSave = useCallback(async () => {
    if (!imageUri) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Dozvolite pristup galeriji.');
        return;
      }
      let saveUri = imageUri;
      if (imageUri.startsWith('http')) {
        const dl = await FileSystem.downloadAsync(imageUri, `${FileSystem.cacheDirectory}sticker_${Date.now()}.png`);
        saveUri = dl.uri;
      }
      await MediaLibrary.saveToLibraryAsync(saveUri);
      Alert.alert('Sacuvano!', 'Stiker je sacuvan. Mozete ga koristiti u Viberu i drugim aplikacijama!');
    } catch (e) {
      Alert.alert('Greska', 'Cuvanje nije uspelo.');
    } finally {
      setSaving(false);
    }
  }, [imageUri]);

  const getBorderRadius = (): number => {
    switch (shape) {
      case 'circle': return STICKER_SIZE / 2;
      case 'rounded': return 30;
      default: return 0;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={[styles.topBar, { backgroundColor: '#ec4899' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stiker Kreator</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.topBtn}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : (
            <Ionicons name="download-outline" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 60 }}>
        {/* Preview */}
        <View style={styles.previewArea}>
          <View style={styles.checkerboard}>
            {imageUri ? (
              <View style={[
                styles.stickerFrame,
                {
                  borderRadius: getBorderRadius(),
                  borderColor: borderColor,
                  borderWidth: 4,
                },
              ]}>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.stickerImage, { borderRadius: getBorderRadius() - 4 }]}
                  contentFit="cover"
                />
              </View>
            ) : (
              <TouchableOpacity style={[styles.pickBtn, { backgroundColor: tc.bgCard }]} onPress={pickImage}>
                <Ionicons name="image-outline" size={48} color={tc.textMuted} />
                <Text style={[styles.pickText, { color: tc.textMuted }]}>Izaberi sliku</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tools */}
        <View style={[styles.toolsCard, { backgroundColor: tc.bgCard }]}>
          {/* Remove BG */}
          {imageUri && id && !bgRemoved && (
            <TouchableOpacity style={[styles.removeBgBtn, { backgroundColor: '#ec4899' }]} onPress={handleRemoveBg} disabled={removingBg}>
              {removingBg ? <ActivityIndicator size="small" color="#fff" /> : (
                <Ionicons name="cut-outline" size={16} color="#fff" />
              )}
              <Text style={styles.removeBgText}>Ukloni pozadinu</Text>
            </TouchableOpacity>
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
          {imageUri && (
            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
              <Ionicons name="swap-horizontal" size={16} color={tc.primary} />
              <Text style={[styles.changeBtnText, { color: tc.primary }]}>Promeni sliku</Text>
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
    // Checkerboard pattern simulated with border
    borderWidth: 1, borderColor: '#d1d5db',
  },
  stickerFrame: { width: STICKER_SIZE, height: STICKER_SIZE, overflow: 'hidden' },
  stickerImage: { width: '100%', height: '100%' },
  pickBtn: {
    width: STICKER_SIZE, height: STICKER_SIZE, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  toolsCard: { width: width - 24, borderRadius: radius.lg, padding: 16, marginTop: 8 },
  removeBgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.md, paddingVertical: 12, marginBottom: 12,
  },
  removeBgText: { color: '#fff', fontSize: 13, ...fonts.bold },
  label: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginTop: 8, marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  shapeBtn: {
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8,
  },
  shapeBtnText: { fontSize: 10, ...fonts.medium, color: colors.textSecondary },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  colorCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#d1d5db' },
  colorSelected: { borderWidth: 3, borderColor: '#1e293b' },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
});
