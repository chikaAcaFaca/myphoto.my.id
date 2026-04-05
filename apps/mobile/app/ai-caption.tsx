import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Platform, ScrollView, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { generateAiCaptions, recaptionMeme, type CaptionLanguage } from '@/lib/ai-captions';
import { checkMemeLimit, incrementMemeUsage } from '@/lib/meme-limits';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function AiCaptionScreen() {
  const { colors: tc } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { appUser, getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [captions, setCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lang, setLang] = useState<CaptionLanguage>('sr');

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setCaptions([]);
      setSelectedCaption(null);
    }
  }, []);

  const generateCaptions = useCallback(async () => {
    if (!imageUri) return;

    // AI limit check — manual memes are free, AI has limits
    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, true);
    if (!limitCheck.allowed) {
      Alert.alert('AI limit dostignut', limitCheck.reason, [
        { text: 'OK' },
        { text: 'Nadogradi plan', onPress: () => router.push('/settings') },
      ]);
      return;
    }

    setGenerating(true);
    try {
      let labels: string[] = [];
      let sceneType = 'default';

      // Fetch file metadata for labels
      if (id) {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/files/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const file = data.file || data;
          labels = file.labels || [];
          sceneType = file.sceneType || 'default';
        }
      }

      // Generate captions — tries Gemini AI first, falls back to templates
      const results = await generateAiCaptions(labels, sceneType, 5, undefined, lang);
      setCaptions(results);
      await incrementMemeUsage();
    } catch (e) {
      console.log('Caption generation error:', e);
      const results = await generateAiCaptions([], 'default', 5, undefined, lang);
      setCaptions(results);
    } finally {
      setGenerating(false);
    }
  }, [imageUri, id, getToken]);

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Kopirano!', 'Tekst je kopiran u clipboard.');
  }, []);

  const handleShare = useCallback(async (caption: string) => {
    await Share.share({
      message: `${caption}\n\nNapravljeno u MyPhoto app`,
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      <View style={[styles.topBar, { backgroundColor: '#06b6d4' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Komentari</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Image preview */}
        <View style={styles.previewArea}>
          {imageUri ? (
            <View style={styles.imageFrame}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              {selectedCaption && (
                <View style={styles.captionOverlay}>
                  <Text style={styles.captionOverlayText}>{selectedCaption}</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: tc.bgCard }]} onPress={pickImage}>
              <Ionicons name="image-outline" size={48} color={tc.textMuted} />
              <Text style={[styles.pickText, { color: tc.textMuted }]}>Izaberi sliku</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language picker */}
        {imageUri && (
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'sr' && styles.langBtnActive]}
              onPress={() => setLang('sr')}
            >
              <Text style={[styles.langText, lang === 'sr' && styles.langTextActive]}>Srpski</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate button */}
        {imageUri && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: '#06b6d4' }]}
            onPress={generateCaptions}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
            <Text style={styles.generateText}>
              {generating ? 'Generisem...' : captions.length > 0 ? 'Generisi nove komentare' : 'Generisi smesne komentare'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Recaption existing meme */}
        {imageUri && selectedCaption && (
          <TouchableOpacity
            style={[styles.recaptionBtn, { borderColor: '#06b6d4' }]}
            onPress={async () => {
              setGenerating(true);
              const results = await recaptionMeme(selectedCaption, 'meme slika', 5, lang);
              setCaptions(results);
              setSelectedCaption(null);
              setGenerating(false);
            }}
            disabled={generating}
          >
            <Ionicons name="refresh" size={16} color="#06b6d4" />
            <Text style={[styles.recaptionText, { color: '#06b6d4' }]}>Izmeni ovaj komentar sa AI</Text>
          </TouchableOpacity>
        )}

        {/* Captions list */}
        {captions.length > 0 && (
          <View style={styles.captionsContainer}>
            <View style={styles.captionsHeader}>
              <Text style={[styles.captionsTitle, { color: tc.text }]}>Izaberite komentar</Text>
              <TouchableOpacity onPress={generateCaptions}>
                <Ionicons name="refresh" size={18} color={tc.primary} />
              </TouchableOpacity>
            </View>

            {captions.map((caption, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.captionCard,
                  { backgroundColor: tc.bgCard },
                  selectedCaption === caption && { borderColor: '#06b6d4', borderWidth: 2 },
                ]}
                onPress={() => setSelectedCaption(caption)}
              >
                <Text style={[styles.captionText, { color: tc.text }]}>{caption}</Text>
                <View style={styles.captionActions}>
                  <TouchableOpacity onPress={() => handleCopy(caption)} style={styles.captionActionBtn}>
                    <Ionicons name="copy-outline" size={16} color={tc.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleShare(caption)} style={styles.captionActionBtn}>
                    <Ionicons name="share-outline" size={16} color={tc.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Change image */}
        {imageUri && (
          <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
            <Ionicons name="swap-horizontal" size={16} color={tc.primary} />
            <Text style={[styles.changeBtnText, { color: tc.primary }]}>Promeni sliku</Text>
          </TouchableOpacity>
        )}
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
  previewArea: { alignItems: 'center', paddingVertical: 16 },
  imageFrame: {
    width: width - 32, aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden',
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  captionOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 12,
  },
  captionOverlayText: { color: '#fff', fontSize: 14, ...fonts.bold, textAlign: 'center' },
  pickBtn: {
    width: width - 32, aspectRatio: 1, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: radius.md, paddingVertical: 14,
  },
  generateText: { color: '#fff', fontSize: 14, ...fonts.bold },
  captionsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  captionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  captionsTitle: { fontSize: 14, ...fonts.bold },
  captionCard: {
    borderRadius: radius.md, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  captionText: { fontSize: 13, ...fonts.medium, lineHeight: 18 },
  captionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  captionActionBtn: { padding: 4 },
  recaptionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10,
  },
  recaptionText: { fontSize: 13, ...fonts.semibold },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
  langRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
  },
  langBtn: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  langBtnActive: {
    backgroundColor: '#06b6d4', borderColor: '#06b6d4',
  },
  langText: { fontSize: 13, ...fonts.semibold, color: colors.textSecondary },
  langTextActive: { color: '#fff' },
});
