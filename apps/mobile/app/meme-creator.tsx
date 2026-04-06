import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Alert, ActivityIndicator, Share, Platform, ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { checkMemeLimit, getMemeUsageStats } from '@/lib/meme-limits';
import { moderateCaption } from '@/lib/ai-captions';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const MEME_TEMPLATES = [
  { id: 'classic', label: 'Klasicni', topPos: 0.03, bottomPos: 0.78 },
  { id: 'top-only', label: 'Gore', topPos: 0.05, bottomPos: null },
  { id: 'bottom-only', label: 'Dole', topPos: null, bottomPos: 0.75 },
  { id: 'center', label: 'Centar', topPos: 0.40, bottomPos: null },
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
  const { user, appUser, getToken } = useAuth();

  const [mediaUri, setMediaUri] = useState<string | null>(
    id ? `${API_URL}/api/thumbnail/${id}?size=large` : null
  );
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [template, setTemplate] = useState(MEME_TEMPLATES[0]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [memeStats, setMemeStats] = useState<{ daily: number; maxDaily: number; monthly: number; maxMonthly: number } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const videoRef = useRef<Video>(null);

  // Load meme usage stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await getMemeUsageStats(appUser?.storageLimit || 0);
      setMemeStats({ daily: stats.daily, maxDaily: stats.maxDaily, monthly: stats.monthly, maxMonthly: stats.maxMonthly });
    };
    loadStats();
  }, [appUser?.storageLimit]);

  const pickMedia = useCallback(async (type: 'image' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      quality: 0.9,
      videoMaxDuration: 30, // max 30 sec for memes
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaUri(asset.uri);
      // Detect if it's a GIF
      const isGif = asset.uri.toLowerCase().endsWith('.gif') ||
                    asset.mimeType?.includes('gif');
      setMediaType(type === 'video' ? 'video' : (isGif ? 'gif' : 'image'));
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!mediaUri) return;

    // Manual meme limit check (Free users can't create)
    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, false);
    if (!limitCheck.allowed) {
      Alert.alert('Nadogradite plan', limitCheck.reason, [
        { text: 'OK' },
        { text: 'Pogledaj planove', onPress: () => require('expo-linking').openURL('https://myphotomy.space/pricing') },
      ]);
      return;
    }

    // AI content moderation — check caption text
    const captionText = [topText, bottomText].filter(Boolean).join(' ');
    if (captionText.length > 0) {
      const modResult = await moderateCaption(captionText);
      if (modResult.flagged) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '⚠️ Upozorenje o sadržaju',
            `Ovaj sadržaj može kršiti Uslove korišćenja.\n\nRazlog: ${modResult.reason}\n\nObjavljivanjem preuzimate POTPUNU odgovornost za sve pravne posledice, uključujući krivičnu ili prekršajnu. Nastaviti?`,
            [
              { text: 'Odustani', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Objavi na svoju odgovornost', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });
        if (!proceed) return;
        // TODO: Log consent to server (userId, timestamp, reason, content hash)
      }
    }

    try {
      const shareUrl = mediaUri.startsWith('http')
        ? `${API_URL}/api/stream/${id}`
        : mediaUri;
      await Share.share({
        message: `${topText ? topText + '\n' : ''}${bottomText ? bottomText + '\n' : ''}\n@${user?.displayName || 'user'} • myphotomy.space`,
        url: shareUrl,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  }, [mediaUri, topText, bottomText, id, appUser?.storageLimit]);

  const handleSave = useCallback(async () => {
    if (!mediaUri) return;

    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, false);
    if (!limitCheck.allowed) {
      Alert.alert('Nadogradite plan', limitCheck.reason, [
        { text: 'OK' },
        { text: 'Pogledaj planove', onPress: () => require('expo-linking').openURL('https://myphotomy.space/pricing') },
      ]);
      return;
    }

    setSaving(true);
    try {
      const perms = mediaType === 'video' ? ['video'] : ['photo'];
      const { status } = await MediaLibrary.requestPermissionsAsync(false, perms as any);
      if (status !== 'granted') {
        Alert.alert('Dozvola', 'Dozvolite pristup galeriji.');
        return;
      }

      let saveUri = mediaUri;
      if (mediaUri.startsWith('http')) {
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
  }, [mediaUri, mediaType, id, getToken]);

  const handlePublish = useCallback(async () => {
    if (!mediaUri) return;
    const captionText = [topText, bottomText].filter(Boolean).join(' ');
    if (!captionText.trim()) {
      Alert.alert('Dodaj tekst', 'Meme mora imati tekst pre objave na MemeWall.');
      return;
    }

    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, false);
    if (!limitCheck.allowed) {
      Alert.alert('Nadogradite plan', limitCheck.reason, [
        { text: 'OK' },
        { text: 'Pogledaj planove', onPress: () => require('expo-linking').openURL('https://myphotomy.space/pricing') },
      ]);
      return;
    }

    // AI content moderation
    const modResult = await moderateCaption(captionText);
    if (modResult.flagged) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Upozorenje o sadrzaju',
          `Ovaj sadrzaj moze krsiti Uslove koriscenja.\n\nRazlog: ${modResult.reason}\n\nObjavljivanjem preuzimate POTPUNU odgovornost za sve pravne posledice, ukljucujuci krivicnu ili prekrsajnu. Nastaviti?`,
          [
            { text: 'Odustani', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Objavi na svoju odgovornost', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
    }

    setPublishing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileId: id || null,
          mediaUri: mediaUri.startsWith('http') ? null : mediaUri,
          mediaType,
          caption: captionText,
          topText,
          bottomText,
          template: template.id,
          fontSize: fontSize.size,
        }),
      });
      if (res.ok) {
        Alert.alert('Objavljeno!', 'Tvoj meme je sada na MemeWall-u!', [
          { text: 'Pogledaj', onPress: () => router.push('/meme-wall') },
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Greska', 'Objavljivanje nije uspelo. Pokusajte ponovo.');
      }
    } catch (e) {
      Alert.alert('Greska', 'Objavljivanje nije uspelo.');
    } finally {
      setPublishing(false);
    }
  }, [mediaUri, topText, bottomText, template, fontSize, mediaType, id, appUser?.storageLimit, getToken]);

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
          {/* AI usage indicator */}
          {memeStats && (
            <View style={[styles.usageBanner, { backgroundColor: tc.bgCard }]}>
              <Ionicons name="sparkles" size={14} color={tc.primary} />
              <Text style={[styles.usageText, { color: tc.textMuted }]}>
                {appUser && appUser.storageLimit > 1073741824
                  ? `AI: ${memeStats.daily}/${memeStats.maxDaily} danas · Rucno: neograniceno`
                  : 'Nadogradite plan za kreiranje memova'}
              </Text>
            </View>
          )}

          {/* Media type picker */}
          {!mediaUri && (
            <View style={styles.mediaTypePicker}>
              <TouchableOpacity
                style={[styles.mediaTypeBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => pickMedia('image')}
              >
                <Ionicons name="image-outline" size={24} color="#fff" />
                <Text style={styles.mediaTypeText}>Slika / GIF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaTypeBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={() => pickMedia('video')}
              >
                <Ionicons name="videocam-outline" size={24} color="#fff" />
                <Text style={styles.mediaTypeText}>Video</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Media preview with text overlay */}
          <View style={styles.previewContainer}>
            {mediaUri ? (
              <View style={styles.memeFrame}>
                {mediaType === 'video' ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setIsPlaying(!isPlaying)}>
                    <Video
                      ref={videoRef}
                      source={{ uri: mediaUri }}
                      style={styles.memeImage}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={isPlaying}
                      isLooping
                      isMuted={false}
                    />
                    {!isPlaying && (
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={48} color="rgba(255,255,255,0.8)" />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Image
                    source={{ uri: mediaUri }}
                    style={[styles.memeImage, {
                      transform: [
                        { scale: imageZoom },
                        { translateX: imageOffsetX },
                        { translateY: imageOffsetY },
                      ],
                    }]}
                    contentFit="cover"
                  />
                )}
                {/* Top text */}
                {template.topPos !== null && topText ? (
                  <Text
                    style={[styles.memeText, { top: `${template.topPos * 100}%`, fontSize: fontSize.size }]}
                    adjustsFontSizeToFit
                    numberOfLines={3}
                    minimumFontScale={0.5}
                  >
                    {topText.toUpperCase()}
                  </Text>
                ) : null}
                {/* Bottom text */}
                {template.bottomPos !== null && bottomText ? (
                  <Text
                    style={[styles.memeText, { top: `${template.bottomPos * 100}%`, fontSize: fontSize.size }]}
                    adjustsFontSizeToFit
                    numberOfLines={3}
                    minimumFontScale={0.5}
                  >
                    {bottomText.toUpperCase()}
                  </Text>
                ) : null}
                {/* Media type badge */}
                {mediaType !== 'image' && (
                  <View style={styles.mediaTypeBadge}>
                    <Ionicons name={mediaType === 'video' ? 'videocam' : 'infinite'} size={12} color="#fff" />
                    <Text style={styles.mediaTypeBadgeText}>{mediaType === 'video' ? 'VIDEO' : 'GIF'}</Text>
                  </View>
                )}
                {/* Watermark */}
                <Text style={styles.watermark}>
                  @{user?.displayName || 'user'} • myphotomy.space
                </Text>
              </View>
            ) : null}
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

            {/* Image zoom & pan */}
            {mediaUri && mediaType === 'image' && (
              <>
                <Text style={[styles.controlLabel, { color: tc.textMuted }]}>SLIKA ZOOM I POZICIJA</Text>
                <View style={styles.zoomControls}>
                  <TouchableOpacity
                    style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]}
                    onPress={() => setImageZoom(Math.max(0.5, imageZoom - 0.1))}
                  >
                    <Ionicons name="remove" size={18} color={tc.text} />
                  </TouchableOpacity>
                  <Text style={[styles.zoomLabel, { color: tc.textMuted }]}>{Math.round(imageZoom * 100)}%</Text>
                  <TouchableOpacity
                    style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]}
                    onPress={() => setImageZoom(Math.min(3, imageZoom + 0.1))}
                  >
                    <Ionicons name="add" size={18} color={tc.text} />
                  </TouchableOpacity>
                  <View style={{ width: 16 }} />
                  <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]} onPress={() => setImageOffsetX(imageOffsetX - 10)}>
                    <Ionicons name="arrow-back" size={16} color={tc.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]} onPress={() => setImageOffsetY(imageOffsetY - 10)}>
                    <Ionicons name="arrow-up" size={16} color={tc.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]} onPress={() => setImageOffsetY(imageOffsetY + 10)}>
                    <Ionicons name="arrow-down" size={16} color={tc.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]} onPress={() => setImageOffsetX(imageOffsetX + 10)}>
                    <Ionicons name="arrow-forward" size={16} color={tc.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.zoomBtn, { backgroundColor: tc.bgInput }]}
                    onPress={() => { setImageZoom(1); setImageOffsetX(0); setImageOffsetY(0); }}
                  >
                    <Ionicons name="refresh" size={16} color={tc.text} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Publish to MemeWall */}
            {mediaUri && (topText || bottomText) && (
              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="globe-outline" size={18} color="#fff" />
                )}
                <Text style={styles.publishText}>
                  {publishing ? 'Objavljujem...' : 'Objavi na MemeWall'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Pick different media */}
            {mediaUri && (
              <View style={styles.changeRow}>
                <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('image')}>
                  <Ionicons name="image-outline" size={16} color={tc.primary} />
                  <Text style={[styles.changeBtnText, { color: tc.primary }]}>Slika/GIF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('video')}>
                  <Ionicons name="videocam-outline" size={16} color={tc.primary} />
                  <Text style={[styles.changeBtnText, { color: tc.primary }]}>Video</Text>
                </TouchableOpacity>
              </View>
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
  memeFrame: { width: width - 24, aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  memeImage: { width: '100%', height: '100%' },
  memeText: {
    position: 'absolute', left: 8, right: 8, textAlign: 'center',
    color: '#fff', ...fonts.extrabold, textTransform: 'uppercase',
    textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4,
    paddingHorizontal: 6, paddingVertical: 4,
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
  // Media type picker
  mediaTypePicker: {
    flexDirection: 'row', gap: 12, justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  mediaTypeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: radius.md, paddingVertical: 16,
  },
  mediaTypeText: { color: '#fff', fontSize: 14, ...fonts.bold },
  changeRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 12 },
  // Video overlay
  playOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaTypeBadge: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  mediaTypeBadgeText: { color: '#fff', fontSize: 10, ...fonts.bold },
  usageBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, marginHorizontal: 12, marginTop: 4,
    borderRadius: 8,
  },
  usageText: { fontSize: 11, ...fonts.medium },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  zoomBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  zoomLabel: { fontSize: 12, ...fonts.bold, width: 40, textAlign: 'center' },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f97316', borderRadius: radius.md, paddingVertical: 14,
    marginTop: 16,
  },
  publishText: { color: '#fff', fontSize: 14, ...fonts.bold },
});
