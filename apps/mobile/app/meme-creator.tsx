import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Share, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const MEME_TEMPLATES = [
  { id: 'classic', label: 'Klasicni', topPos: 0.05, bottomPos: 0.88 },
  { id: 'top-only', label: 'Gore', topPos: 0.08, bottomPos: null },
  { id: 'bottom-only', label: 'Dole', topPos: null, bottomPos: 0.85 },
  { id: 'center', label: 'Centar', topPos: 0.45, bottomPos: null },
];

const FONT_SIZES = [
  { label: 'S', size: 24 },
  { label: 'M', size: 32 },
  { label: 'L', size: 42 },
  { label: 'XL', size: 56 },
];

export default function MemeCreatorScreen() {
  const { colors: tc } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [template, setTemplate] = useState(MEME_TEMPLATES[0]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [saving, setSaving] = useState(false);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!imageUri) return;
    try {
      const shareUrl = imageUri.startsWith('http')
        ? `${API_URL}/api/stream/${id}`
        : imageUri;
      await Share.share({
        message: `${topText ? topText + '\n' : ''}${bottomText ? bottomText + '\n' : ''}\nNapravljeno u MyPhoto app`,
        url: shareUrl,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  }, [imageUri, topText, bottomText, id]);

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
        const token = await getToken();
        const urlRes = await fetch(`${API_URL}/api/files/${id}/download-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (urlRes.ok) {
          const { downloadUrl } = await urlRes.json();
          const dl = await FileSystem.downloadAsync(downloadUrl, `${FileSystem.cacheDirectory}meme_${Date.now()}.jpg`);
          saveUri = dl.uri;
        }
      }

      await MediaLibrary.saveToLibraryAsync(saveUri);
      Alert.alert('Sacuvano!', 'Meme je sacuvan u galeriju. Podeli ga sa prijateljima!');
    } catch (e) {
      Alert.alert('Greska', 'Cuvanje nije uspelo.');
    } finally {
      setSaving(false);
    }
  }, [imageUri, id, getToken]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: tc.bg }]}>
        {/* Top bar */}
        <View style={[styles.topBar, { backgroundColor: tc.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meme Kreator</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={handleShare} style={styles.topBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.topBtn} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                <Ionicons name="download-outline" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Image preview with text overlay */}
          <View style={styles.previewContainer}>
            {imageUri ? (
              <View style={styles.memeFrame}>
                <Image source={{ uri: imageUri }} style={styles.memeImage} contentFit="cover" />
                {/* Top text */}
                {template.topPos !== null && topText ? (
                  <Text style={[styles.memeText, { top: `${template.topPos * 100}%`, fontSize: fontSize.size }]}>
                    {topText.toUpperCase()}
                  </Text>
                ) : null}
                {/* Bottom text */}
                {template.bottomPos !== null && bottomText ? (
                  <Text style={[styles.memeText, { top: `${template.bottomPos * 100}%`, fontSize: fontSize.size }]}>
                    {bottomText.toUpperCase()}
                  </Text>
                ) : null}
                {/* Watermark */}
                <Text style={styles.watermark}>Made with MyPhoto</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.pickImage, { backgroundColor: tc.bgCard }]} onPress={pickImage}>
                <Ionicons name="image-outline" size={48} color={tc.textMuted} />
                <Text style={[styles.pickText, { color: tc.textMuted }]}>Izaberi sliku</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Controls */}
          <View style={[styles.controls, { backgroundColor: tc.bgCard }]}>
            {/* Text inputs */}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
                placeholder="Tekst gore..."
                placeholderTextColor={tc.textMuted}
                value={topText}
                onChangeText={setTopText}
                maxLength={100}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
                placeholder="Tekst dole..."
                placeholderTextColor={tc.textMuted}
                value={bottomText}
                onChangeText={setBottomText}
                maxLength={100}
              />
            </View>

            {/* Template selector */}
            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>RASPORED</Text>
            <View style={styles.optionRow}>
              {MEME_TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.optionBtn, template.id === t.id && { backgroundColor: tc.primary + '20', borderColor: tc.primary }]}
                  onPress={() => setTemplate(t)}
                >
                  <Text style={[styles.optionText, template.id === t.id && { color: tc.primary }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Font size selector */}
            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>VELICINA TEKSTA</Text>
            <View style={styles.optionRow}>
              {FONT_SIZES.map((f) => (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.optionBtn, fontSize.label === f.label && { backgroundColor: tc.primary + '20', borderColor: tc.primary }]}
                  onPress={() => setFontSize(f)}
                >
                  <Text style={[styles.optionText, fontSize.label === f.label && { color: tc.primary }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Pick different image */}
            {imageUri && (
              <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
                <Ionicons name="swap-horizontal" size={16} color={tc.primary} />
                <Text style={[styles.changeBtnText, { color: tc.primary }]}>Promeni sliku</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  previewContainer: { alignItems: 'center', paddingVertical: 12 },
  memeFrame: { width: width - 24, aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  memeImage: { width: '100%', height: '100%' },
  memeText: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
    color: '#fff', ...fonts.extrabold, textTransform: 'uppercase',
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
    paddingHorizontal: 8,
  },
  watermark: {
    position: 'absolute', bottom: 4, right: 6,
    color: 'rgba(255,255,255,0.5)', fontSize: 9, ...fonts.medium,
  },
  pickImage: {
    width: width - 24, aspectRatio: 1, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  controls: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 40,
  },
  inputRow: { marginBottom: 10 },
  input: {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14,
  },
  controlLabel: { fontSize: 10, ...fonts.bold, letterSpacing: 1, marginTop: 8, marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  optionBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  optionText: { fontSize: 12, ...fonts.semibold, color: colors.textSecondary },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
});
