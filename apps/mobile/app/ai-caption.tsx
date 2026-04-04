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

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

// Funny caption templates based on detected labels
const CAPTION_TEMPLATES: Record<string, string[]> = {
  food: [
    'Dieta pocinje od ponedeljka... vec 5 godina 😂',
    'Kad kazes "samo jedan zalogaj" a onda... 🍕',
    'Ovaj obrok je napravljen sa puno ljubavi i jos vise kalorija',
    'Kuvar sam od rodjenja. Problem je sto tada niko to ne jede 👨‍🍳',
    'Fitness guru: "Jedi zdravo!" Ja u 3 ujutru:',
  ],
  animal: [
    'Kad te sefovka gleda dok surfujes Instagram na poslu 🐶',
    'Ja kad cujem da neko otvara frizider',
    'Mood: ne diraj me, spavam ❌',
    'Jedan lajk = jedna mrvica za mene 🐱',
    'Kad roditelji kazu "imamo gosta" a ti nisi spreman',
  ],
  people: [
    'Ekipa koja zajedno propada, zajedno se i smeje 😎',
    'Kad kazes "idem u 10" a krenes u 11:30',
    'Ovo je moj "radim nesto produktivno" izraz lica',
    'Glavni u grupi koji nikad nema plan',
    'Kad ti drugar kaze "veruj mi brate"...',
  ],
  nature: [
    'Setnja u prirodi: 5 min odmora, 50 min trazenja signala 📱',
    'Priroda je lepa dok ne dodju komarci 🦟',
    'Instagram vs. Realnost: ja u prirodi',
    'Kad kazes "idem da se opustim" a telefon je na 5%',
    'Ovo je mesto gde WiFi ne postoji. Aj cao! 👋',
  ],
  vehicle: [
    'Kad parkiras perfektno iz prvog pokusaja 🅿️',
    'Moj auto posle zimske sezone: "Sta mi radis brate?"',
    'GPS kaze levo, ja idem desno. Ko ce koga.',
    'Gorivo: prazno. Volja za zivotom: takodje prazno.',
    'Kad vidis policiju i odjednom vozis 30km/h ⚠️',
  ],
  default: [
    'Kad ne znas sta da napises ali hoces lajkove 😅',
    'Ovo je moj zvanicni mood za danas',
    'Bez konteksta, samo vibes ✨',
    'Posalji ovo nekom ko treba da se nasmeje 😂',
    'Nema objasnjenja. Samo poglej. 👀',
  ],
};

export default function AiCaptionScreen() {
  const { colors: tc } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { getToken } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [captions, setCaptions] = useState<string[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
    setGenerating(true);
    try {
      if (id) {
        const token = await getToken();

        // Try AI-powered caption generation first
        try {
          const aiRes = await fetch(`${API_URL}/api/ai/generate-captions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ fileId: id, language: 'sr', count: 5 }),
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (aiData.captions && aiData.captions.length > 0) {
              setCaptions(aiData.captions);
              setGenerating(false);
              return;
            }
          }
        } catch {
          // AI endpoint not available, fall back to templates
        }

        // Fallback: template-based captions using file labels
        const res = await fetch(`${API_URL}/api/files/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const file = data.file || data;
          const labels = file.labels || [];

          let category = 'default';
          for (const label of labels) {
            const lower = label.toLowerCase();
            if (lower.includes('food') || lower.includes('meal')) { category = 'food'; break; }
            if (lower.includes('animal') || lower.includes('dog') || lower.includes('cat')) { category = 'animal'; break; }
            if (lower.includes('person') || lower.includes('people')) { category = 'people'; break; }
            if (lower.includes('plant') || lower.includes('nature') || lower.includes('sky')) { category = 'nature'; break; }
            if (lower.includes('car') || lower.includes('vehicle')) { category = 'vehicle'; break; }
          }

          const templates = [...(CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.default)];
          for (let i = templates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [templates[i], templates[j]] = [templates[j], templates[i]];
          }
          setCaptions(templates.slice(0, 5));
          setGenerating(false);
          return;
        }
      }

      // Fallback: random captions from all categories
      const all = Object.values(CAPTION_TEMPLATES).flat();
      const shuffled = all.sort(() => Math.random() - 0.5);
      setCaptions(shuffled.slice(0, 5));
    } catch (e) {
      console.log('Caption generation error:', e);
      const fallback = CAPTION_TEMPLATES.default;
      setCaptions(fallback);
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

        {/* Generate button */}
        {imageUri && captions.length === 0 && (
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
              {generating ? 'Generisem...' : 'Generisi smesne komentare'}
            </Text>
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
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 10,
  },
  changeBtnText: { fontSize: 13, ...fonts.semibold },
});
