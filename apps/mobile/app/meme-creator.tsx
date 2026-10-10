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
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { checkMemeLimit, getMemeUsageStats } from '@/lib/meme-limits';
import { moderateCaption } from '@/lib/ai-captions';
import { saveToMySpace } from '@/lib/myspace-upload';
import { ZoomPanView } from '@/components/ZoomPanView';
import { useT, type TKey } from '@/lib/i18n';
import { withRef } from '@/lib/referral-link';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

const MEME_TEMPLATES: { id: string; labelKey: TKey; topPos: number | null; bottomPos: number | null }[] = [
  { id: 'classic', labelKey: 'meme.creator.layoutClassic', topPos: 0.03, bottomPos: 0.78 },
  { id: 'top-only', labelKey: 'meme.creator.layoutTop', topPos: 0.05, bottomPos: null },
  { id: 'bottom-only', labelKey: 'meme.creator.layoutBottom', topPos: null, bottomPos: 0.75 },
  { id: 'center', labelKey: 'meme.creator.layoutCenter', topPos: 0.40, bottomPos: null },
];

// Meme frame orientation — lets landscape media (esp. video) use a wide frame
// instead of being cropped into the default portrait box.
const MEME_ASPECTS: { id: string; labelKey: TKey; ratio: number }[] = [
  { id: 'portrait', labelKey: 'meme.creator.aspectPortrait', ratio: 4 / 5 },
  { id: 'square', labelKey: 'meme.creator.aspectSquare', ratio: 1 },
  { id: 'landscape', labelKey: 'meme.creator.aspectLandscape', ratio: 16 / 9 },
];

const FONT_SIZES = [
  { label: 'S', size: 24 },
  { label: 'M', size: 32 },
  { label: 'L', size: 42 },
  { label: 'XL', size: 56 },
];

export default function MemeCreatorScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { id, name, uri: sourceUri, isUploaded, type, remixOfId, remixOfAuthor } = useLocalSearchParams<{
    id?: string; name?: string; uri?: string; isUploaded?: string; type?: string;
    // Set by the meme-wall Remix button. We forward remixOfId to the publish
    // POST so the server can snapshot the original author for the attribution
    // badge — original author stays credited, only the comment changes.
    remixOfId?: string; remixOfAuthor?: string;
  }>();
  const { user, appUser, getToken } = useAuth();

  // Prefer the URI passed in from the viewer (works for device-only
  // photos too) and fall back to the cloud thumbnail. The previous
  // version always hit /api/thumbnail/{deviceId} which 404s for
  // photos that haven't been backed up yet, so the meme creator
  // landed empty and forced the user to pick from album again.
  const [mediaUri, setMediaUri] = useState<string | null>(
    sourceUri || (id && isUploaded === '1' ? `${API_URL}/api/thumbnail/${id}?size=large` : null)
  );
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>(type === 'video' ? 'video' : 'image');
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [template, setTemplate] = useState(MEME_TEMPLATES[0]);
  const [memeAspect, setMemeAspect] = useState(MEME_ASPECTS[0]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [saving, setSaving] = useState(false);
  const [savingSpace, setSavingSpace] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [memeStats, setMemeStats] = useState<{ daily: number; maxDaily: number; monthly: number; maxMonthly: number } | null>(null);
  const videoRef = useRef<Video>(null);
  // The meme preview frame (image + text + watermark). We snapshot this with
  // react-native-view-shot so the published/saved image has the text baked in
  // — matching the web canvas pipeline, and producing a file:// URI that
  // always uploads (device content:// URIs otherwise get skipped).
  const memeFrameRef = useRef<View>(null);

  // Capture the meme preview into a flat JPG file. Image memes only — for
  // video/gif we keep the original media (a snapshot would freeze the frame).
  const captureMeme = useCallback(async (): Promise<string | null> => {
    if (mediaType !== 'image' || !memeFrameRef.current) return null;
    try {
      const uri = await captureRef(memeFrameRef, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
      return uri.startsWith('file') || uri.startsWith('/') ? (uri.startsWith('/') ? `file://${uri}` : uri) : uri;
    } catch (e) {
      console.warn('Meme capture failed:', e);
      return null;
    }
  }, [mediaType]);

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
      Alert.alert(t('meme.upgradeTitle'), limitCheck.reason, [
        { text: t('common.ok') },
        { text: t('common.viewPlans'), onPress: () => router.push('/pricing') },
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
            `⚠️ ${t('meme.creator.contentWarningTitle')}`,
            t('meme.creator.contentWarningMessage', { reason: modResult.reason }),
            [
              { text: t('meme.creator.giveUp'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('meme.creator.publishAtOwnRisk'), style: 'destructive', onPress: () => resolve(true) },
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
        message: `${topText ? topText + '\n' : ''}${bottomText ? bottomText + '\n' : ''}\n@${user?.displayName || t('common.user')} • myphotomy.space`,
        url: shareUrl,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  }, [mediaUri, topText, bottomText, id, appUser?.storageLimit, t]);

  const handleSave = useCallback(async () => {
    if (!mediaUri) return;

    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, false);
    if (!limitCheck.allowed) {
      Alert.alert(t('meme.upgradeTitle'), limitCheck.reason, [
        { text: t('common.ok') },
        { text: t('common.viewPlans'), onPress: () => router.push('/pricing') },
      ]);
      return;
    }

    setSaving(true);
    try {
      const perms = mediaType === 'video' ? ['video'] : ['photo'];
      const { status } = await MediaLibrary.requestPermissionsAsync(false, perms as any);
      if (status !== 'granted') {
        Alert.alert(t('common.permission'), t('meme.creator.allowGallery'));
        return;
      }

      let saveUri = mediaUri;
      // Image memes: save the baked snapshot (text + watermark) so the file in
      // the gallery is the actual meme, not the bare source photo.
      const baked = await captureMeme();
      if (baked) {
        saveUri = baked;
      } else if (mediaUri.startsWith('http')) {
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
      Alert.alert(t('meme.creator.savedTitle'), t('meme.creator.savedToGallery'));
    } catch (e) {
      Alert.alert(t('common.error'), t('meme.creator.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [mediaUri, mediaType, id, getToken, captureMeme, t]);

  // Save the meme into the user's MySpace cloud (personal space). Image memes
  // save the baked snapshot (text + watermark); video keeps the source.
  const handleSaveToSpace = useCallback(async () => {
    if (!mediaUri) return;
    setSavingSpace(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert(t('meme.signInTitle'), t('meme.creator.signInToSave'));
        return;
      }
      const isVideo = mediaType === 'video';
      const uploadUri = (await captureMeme()) || mediaUri;
      const ok = await saveToMySpace({
        uri: uploadUri,
        filename: `meme-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        token,
      });
      Alert.alert(
        ok ? t('common.saved') : t('common.error'),
        ok ? t('meme.creator.savedToSpace', { folder: 'MyPhoto Kreacije' }) : t('meme.creator.saveToSpaceFailed'),
      );
    } finally {
      setSavingSpace(false);
    }
  }, [mediaUri, mediaType, getToken, captureMeme, t]);

  // Synchronous in-flight flag so a rapid second tap can't start a second
  // publish before the `publishing` state re-renders (root cause of duplicates).
  const publishingRef = useRef(false);

  const handlePublish = useCallback(async () => {
    if (!mediaUri) return;
    // setPublishing(true) only lands after the await-heavy limit/moderation
    // checks below, so a double-tap used to mint two meme docs. Block re-entry
    // immediately here.
    if (publishingRef.current) return;
    const captionText = [topText, bottomText].filter(Boolean).join(' ');
    if (!captionText.trim()) {
      Alert.alert(t('meme.creator.addTextTitle'), t('meme.creator.addTextMessage'));
      return;
    }

    publishingRef.current = true;
    const limitCheck = await checkMemeLimit(appUser?.storageLimit || 0, false);
    if (!limitCheck.allowed) {
      publishingRef.current = false;
      Alert.alert(t('meme.upgradeTitle'), limitCheck.reason, [
        { text: t('common.ok') },
        { text: t('common.viewPlans'), onPress: () => router.push('/pricing') },
      ]);
      return;
    }

    // AI content moderation
    const modResult = await moderateCaption(captionText);
    if (modResult.flagged) {
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          t('meme.creator.contentWarningTitle'),
          t('meme.creator.contentWarningMessage', { reason: modResult.reason }),
          [
            { text: t('meme.creator.giveUp'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('meme.creator.publishAtOwnRisk'), style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) { publishingRef.current = false; return; }
    }

    setPublishing(true);
    // Prepared before the POST: the server needs the exact byte size to pin
    // the presigned URL and charge it against the user's storage quota.
    let uploadSource: string | null = null;
    let tmpPathToCleanup: string | null = null;
    try {
      const token = await getToken();

      // Three URI shapes show up here:
      //   - file:// or absolute path → upload directly
      //   - http(s):// → download to cache then upload
      //   - content:// (Android MediaLibrary device photos) → resolve
      //     to file:// via MediaLibrary first, otherwise the upload
      //     silently no-ops and the published meme has no image.
      // For image memes, bake the text into a JPG snapshot first — this
      // matches the web canvas output AND yields a file:// URI. Video/gif
      // memes upload the original media (captureMeme returns null for them);
      // text is overlaid at display time on the wall.
      const uploadMime =
        mediaType === 'video' ? 'video/mp4' : mediaType === 'gif' ? 'image/gif' : 'image/jpeg';
      let uploadSize = 0;
      try {
        const baked = await captureMeme();
        let src = baked || mediaUri;
        tmpPathToCleanup = baked;
        if (src.startsWith('content://') && id) {
          const info = await MediaLibrary.getAssetInfoAsync(id);
          if (info?.localUri) src = info.localUri;
        }
        if (src.startsWith('http')) {
          const tmpPath = `${FileSystem.cacheDirectory}meme_upload_${Date.now()}.jpg`;
          const dl = await FileSystem.downloadAsync(src, tmpPath);
          src = dl.uri;
          tmpPathToCleanup = tmpPath;
        }
        if (src.startsWith('file://') || src.startsWith('/')) {
          const info = await FileSystem.getInfoAsync(src);
          if (info.exists && typeof info.size === 'number' && info.size > 0) {
            uploadSource = src;
            uploadSize = info.size;
          }
        } else {
          console.warn('Meme upload skipped — unsupported URI scheme:', src);
        }
      } catch (prepErr) {
        console.warn('Meme media prepare failed:', prepErr);
      }

      const res = await fetch(`${API_URL}/api/meme-wall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileId: id || null,
          mediaType,
          caption: captionText,
          topText,
          bottomText,
          template: template.id,
          fontSize: fontSize.size,
          imageData: !!uploadSource,
          ...(uploadSource ? { size: uploadSize } : {}),
          ...(remixOfId ? { remixOfId } : {}),
        }),
      });
      if (res.ok) {
        const responseData = await res.json();

        if (responseData.uploadUrl && uploadSource) {
          try {
            await FileSystem.uploadAsync(responseData.uploadUrl, uploadSource, {
              httpMethod: 'PUT',
              headers: { 'Content-Type': uploadMime },
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            });
          } catch (uploadErr) {
            console.warn('Meme image upload failed:', uploadErr);
          }
        }

        const shareUrl = withRef(`${API_URL}${responseData.shareUrl || '/meme-wall'}`, appUser?.referralCode);
        Alert.alert(t('meme.creator.publishedTitle'), t('meme.creator.publishedMessage'), [
          { text: t('meme.creator.view'), onPress: () => router.push('/meme-wall') },
          {
            text: t('common.share'),
            onPress: () => {
              Share.share({
                message: `${captionText}\n\n${t('meme.madeWith')}\n${shareUrl}`,
              });
            },
          },
          { text: t('common.ok') },
        ]);
      } else {
        const errData = await res.json().catch(() => null);
        Alert.alert(t('common.error'), errData?.error || t('meme.creator.publishFailedRetry'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('meme.creator.publishFailed'));
    } finally {
      if (tmpPathToCleanup) {
        FileSystem.deleteAsync(tmpPathToCleanup, { idempotent: true }).catch(() => {});
      }
      setPublishing(false);
      publishingRef.current = false;
    }
  }, [mediaUri, topText, bottomText, template, fontSize, mediaType, id, appUser?.storageLimit, getToken, captureMeme, t]);

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
          <Text style={styles.headerTitle}>
            {remixOfId ? t('meme.creator.remixTitle', { name: remixOfAuthor || '...' }) : t('meme.creator.title')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={handleShare} style={styles.topBtn}>
              <Ionicons name="share-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveToSpace} style={styles.topBtn} disabled={savingSpace}>
              {savingSpace ? <ActivityIndicator size="small" color="#fff" /> : (
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              )}
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
                  ? t('meme.creator.usage', { used: memeStats.daily, max: memeStats.maxDaily })
                  : t('meme.creator.upgradeToCreate')}
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
                <Text style={styles.mediaTypeText}>{t('meme.creator.imageGif')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaTypeBtn, { backgroundColor: '#8b5cf6' }]}
                onPress={() => pickMedia('video')}
              >
                <Ionicons name="videocam-outline" size={24} color="#fff" />
                <Text style={styles.mediaTypeText}>{t('meme.creator.video')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Media preview with text overlay */}
          <View style={styles.previewContainer}>
            {mediaUri ? (
              <View ref={memeFrameRef} collapsable={false} style={[styles.memeFrame, { aspectRatio: memeAspect.ratio }]}>
                {mediaType === 'video' ? (
                  <TouchableOpacity activeOpacity={0.9} style={StyleSheet.absoluteFill} onPress={() => setIsPlaying(!isPlaying)}>
                    <Video
                      ref={videoRef}
                      source={{ uri: mediaUri }}
                      style={styles.memeImage}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={isPlaying}
                      isLooping
                      isMuted={false}
                      // shouldPlay alone wasn't enough on some Androids — the
                      // player painted the first frame and stalled. playAsync
                      // in onLoad makes auto-start deterministic.
                      onLoad={() => { if (isPlaying) videoRef.current?.playAsync().catch(() => {}); }}
                    />
                    {!isPlaying && (
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={48} color="rgba(255,255,255,0.8)" />
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  // Pinch-zoom + drag to position the image; contentFit "contain"
                  // so nothing is force-cropped (zoom in to fill if you want).
                  <ZoomPanView style={StyleSheet.absoluteFillObject}>
                    <Image
                      source={{ uri: mediaUri }}
                      style={styles.memeImage}
                      contentFit="contain"
                    />
                  </ZoomPanView>
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
                    <Text style={styles.mediaTypeBadgeText}>{mediaType === 'video' ? t('meme.creator.videoBadge') : 'GIF'}</Text>
                  </View>
                )}
                {/* Watermark - always visible branding */}
                <Text style={styles.watermark}>
                  myphotomy.space
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
                placeholder={t('meme.creator.topPlaceholder')}
                placeholderTextColor={tc.textMuted}
                value={topText}
                onChangeText={setTopText}
                maxLength={100}
              />
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
                placeholder={t('meme.creator.bottomPlaceholder')}
                placeholderTextColor={tc.textMuted}
                value={bottomText}
                onChangeText={setBottomText}
                maxLength={100}
              />
            </View>

            {/* Orientation / aspect selector */}
            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>{t('meme.creator.orientation')}</Text>
            <View style={styles.optionRow}>
              {MEME_ASPECTS.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.optionBtn, memeAspect.id === a.id && { backgroundColor: tc.primary + '20', borderColor: tc.primary }]}
                  onPress={() => setMemeAspect(a)}
                >
                  <Text style={[styles.optionText, memeAspect.id === a.id && { color: tc.primary }]}>{t(a.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Template selector */}
            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>{t('meme.creator.layout')}</Text>
            <View style={styles.optionRow}>
              {MEME_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  style={[styles.optionBtn, template.id === tpl.id && { backgroundColor: tc.primary + '20', borderColor: tc.primary }]}
                  onPress={() => setTemplate(tpl)}
                >
                  <Text style={[styles.optionText, template.id === tpl.id && { color: tc.primary }]}>{t(tpl.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Font size selector */}
            <Text style={[styles.controlLabel, { color: tc.textMuted }]}>{t('meme.creator.textSize')}</Text>
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

            {/* Image positioning is now via gestures on the preview above. */}
            {mediaUri && mediaType === 'image' && (
              <Text style={[styles.controlLabel, { color: tc.textMuted, textAlign: 'center', marginTop: 6 }]}>
                {t('meme.creator.gestureHint')}
              </Text>
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
                  {publishing ? t('meme.creator.publishing') : t('meme.creator.publish')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Share on social media */}
            {mediaUri && (topText || bottomText) && (
              <TouchableOpacity
                style={[styles.publishBtn, { backgroundColor: '#3b82f6', marginTop: 8 }]}
                onPress={async () => {
                  try {
                    const caption = [topText, bottomText].filter(Boolean).join(' ');
                    await Share.share({
                      message: `${caption}\n\n${t('meme.madeWith')}\nhttps://myphotomy.space`,
                      url: mediaUri.startsWith('file') ? mediaUri : undefined,
                    });
                  } catch {}
                }}
              >
                <Ionicons name="share-social" size={18} color="#fff" />
                <Text style={styles.publishText}>{t('meme.creator.shareSocial')}</Text>
              </TouchableOpacity>
            )}

            {/* Save the meme into the user's personal MySpace cloud */}
            {mediaUri && (
              <TouchableOpacity
                style={[styles.publishBtn, { backgroundColor: tc.primary, marginTop: 8 }]}
                onPress={handleSaveToSpace}
                disabled={savingSpace}
              >
                {savingSpace ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                )}
                <Text style={styles.publishText}>{t('meme.saveToMySpace')}</Text>
              </TouchableOpacity>
            )}

            {/* Pick different media */}
            {mediaUri && (
              <View style={styles.changeRow}>
                <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('image')}>
                  <Ionicons name="image-outline" size={16} color={tc.primary} />
                  <Text style={[styles.changeBtnText, { color: tc.primary }]}>{t('meme.creator.imageGif')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeBtn} onPress={() => pickMedia('video')}>
                  <Ionicons name="videocam-outline" size={16} color={tc.primary} />
                  <Text style={[styles.changeBtnText, { color: tc.primary }]}>{t('meme.creator.video')}</Text>
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
    position: 'absolute', bottom: 6, right: 8,
    color: '#fff', fontSize: 11, ...fonts.bold,
    textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3,
    letterSpacing: 0.5,
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
