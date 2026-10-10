import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, ScrollView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { radius, fonts, memeFlame } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { generateAiCaptions, recaptionMeme, type CaptionLanguage } from '@/lib/ai-captions';
import { checkMemeLimit, incrementMemeUsage } from '@/lib/meme-limits';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
/** Ink on the flame orange: white fails 4.5:1 for small text, this passes. */
const ON_FLAME = '#111214';

export default function AiCaptionScreen() {
  const { colors: tc } = useTheme();
  const { t, language } = useT();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { appUser, getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [captions, setCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lang, setLang] = useState<CaptionLanguage>(language);

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
      Alert.alert(t('aiCaption.limitTitle'), limitCheck.reason, [
        { text: t('common.ok') },
        { text: t('common.upgradePlan'), onPress: () => router.push('/pricing') },
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
  }, [imageUri, id, getToken, lang, t, appUser?.storageLimit]);

  const handleCopy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert(t('aiCaption.copiedTitle'), t('aiCaption.copiedMessage'));
  }, [t]);

  const handleShare = useCallback(async (caption: string) => {
    await Share.share({
      message: `${caption}\n\n${t('aiCaption.shareFooter')}`,
    });
  }, [t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('aiCaption.title')} />

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
            <TouchableOpacity style={[styles.pickBtn, { backgroundColor: tc.bgCard, borderColor: tc.border }]} onPress={pickImage}>
              <Ionicons name="image-outline" size={48} color={tc.textMuted} />
              <Text style={[styles.pickText, { color: tc.textSecondary }]}>{t('aiCaption.pickImage')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Language picker */}
        {imageUri && (
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, { borderColor: tc.border }, lang === 'sr' && styles.langBtnActive]}
              onPress={() => setLang('sr')}
            >
              <Text style={[styles.langText, { color: tc.textSecondary }, lang === 'sr' && styles.langTextActive]}>Srpski</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, { borderColor: tc.border }, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langText, { color: tc.textSecondary }, lang === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Generate button */}
        {imageUri && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: memeFlame, opacity: generating ? 0.7 : 1 }]}
            onPress={generateCaptions}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color={ON_FLAME} />
            ) : (
              <Ionicons name="sparkles" size={18} color={ON_FLAME} />
            )}
            <Text style={styles.generateText}>
              {generating ? t('aiCaption.generating') : captions.length > 0 ? t('aiCaption.generateMore') : t('aiCaption.generate')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Recaption existing meme */}
        {imageUri && selectedCaption && (
          <TouchableOpacity
            style={[styles.recaptionBtn, { borderColor: tc.border, backgroundColor: tc.bgCard }]}
            onPress={async () => {
              setGenerating(true);
              const results = await recaptionMeme(selectedCaption, 'meme slika', 5, lang);
              setCaptions(results);
              setSelectedCaption(null);
              setGenerating(false);
            }}
            disabled={generating}
          >
            <Ionicons name="refresh" size={16} color={tc.text} />
            <Text style={[styles.recaptionText, { color: tc.text }]}>{t('aiCaption.recaption')}</Text>
          </TouchableOpacity>
        )}

        {/* Captions list */}
        {captions.length > 0 && (
          <View style={styles.captionsContainer}>
            <View style={styles.captionsHeader}>
              <Text style={[styles.captionsTitle, { color: tc.text }]}>{t('aiCaption.chooseCaption')}</Text>
              <TouchableOpacity
                onPress={generateCaptions}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel={t('aiCaption.generateMore')}
              >
                <Ionicons name="refresh" size={20} color={tc.text} />
              </TouchableOpacity>
            </View>

            {captions.map((caption, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.captionCard,
                  { backgroundColor: tc.bgCard, borderColor: tc.border },
                  selectedCaption === caption && { borderColor: memeFlame, borderWidth: 2 },
                ]}
                onPress={() => setSelectedCaption(caption)}
              >
                <Text style={[styles.captionText, { color: tc.text }]}>{caption}</Text>
                <View style={styles.captionActions}>
                  <TouchableOpacity
                    onPress={() => handleCopy(caption)}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.invite.copy')}
                  >
                    <Ionicons name="copy-outline" size={18} color={tc.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShare(caption)}
                    style={styles.iconBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.share')}
                  >
                    <Ionicons name="share-outline" size={18} color={tc.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Change image */}
        {imageUri && (
          <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
            <Ionicons name="swap-horizontal" size={16} color={tc.text} />
            <Text style={[styles.changeBtnText, { color: tc.text }]}>{t('aiCaption.changeImage')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  previewArea: { alignItems: 'center', paddingTop: 4, paddingBottom: 16 },
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
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed',
  },
  pickText: { fontSize: 14, ...fonts.medium, marginTop: 8 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: radius.full, minHeight: 50, paddingVertical: 14,
  },
  generateText: { color: ON_FLAME, fontSize: 15, ...fonts.bold },
  captionsContainer: { paddingHorizontal: 16, paddingTop: 8 },
  captionsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  captionsTitle: { fontSize: 18, letterSpacing: -0.2, ...fonts.display },
  captionCard: {
    borderRadius: radius.lg, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, marginBottom: 8,
    borderWidth: 1,
  },
  captionText: { fontSize: 15, ...fonts.medium, lineHeight: 21 },
  captionActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recaptionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderRadius: radius.full, minHeight: 44, paddingVertical: 10,
  },
  recaptionText: { fontSize: 13, ...fonts.semibold },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, minHeight: 44, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
  langRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
  },
  langBtn: {
    paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', borderRadius: radius.full,
    borderWidth: 1,
  },
  langBtnActive: {
    backgroundColor: memeFlame, borderColor: memeFlame,
  },
  langText: { fontSize: 14, ...fonts.semibold },
  langTextActive: { color: ON_FLAME },
});
