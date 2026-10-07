import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Share, Platform, Modal, ScrollView, FlatList, type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { ZoomPanView } from '@/components/ZoomPanView';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { useCloudGate } from '@/lib/cloud-gate';
import { getViewerPhotos, type ViewerPhoto } from '@/lib/photo-list-store';
import { colors, fonts, radius } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { formatBytes } from '@myphoto/shared';
import type { FileMetadata } from '@myphoto/shared';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

// One page of the swipeable viewer. Loads its own media (device URI or a
// presigned cloud URL) so neighbouring photos are ready as you swipe. Only the
// active page's video plays.
function PhotoPage({ photo, isActive, pageW, pageH, getToken }: {
  photo: ViewerPhoto;
  isActive: boolean;
  pageW: number;
  pageH: number;
  getToken: () => Promise<string | null>;
}) {
  const { t } = useT();
  const isVideo = photo.type === 'video';
  const isLocalOnly = !!photo.localUri && photo.isUploaded !== '1';
  const [uri, setUri] = useState<string | null>(photo.localUri || null);
  const [loading, setLoading] = useState(!photo.localUri);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isLocalOnly) {
        // expo-av can't play content:// — resolve to file:// first. Images
        // render content:// fine, so we still upgrade in the background.
        if (photo.localUri?.startsWith('content://')) {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(photo.id);
            if (!cancelled && info?.localUri) setUri(info.localUri);
          } catch { /* keep content:// */ }
        }
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/files/${photo.id}/download-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { downloadUrl } = await res.json();
        if (!cancelled) setUri(downloadUrl);
      } catch (e) {
        console.error('Media load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [photo.id]);

  useEffect(() => {
    if (!isVideo) return;
    if (isActive) videoRef.current?.playAsync().catch(() => {});
    else videoRef.current?.pauseAsync().catch(() => {});
  }, [isActive, isVideo]);

  return (
    <View style={{ width: pageW, height: pageH, alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : !uri ? (
        <Text style={{ color: '#fff' }}>{t('viewer.loadFailed')}</Text>
      ) : isVideo ? (
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{ width: pageW, height: pageH }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isActive}
          isLooping={false}
        />
      ) : (
        <ZoomPanView style={{ width: pageW, height: pageH }}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={200} />
        </ZoomPanView>
      )}
    </View>
  );
}

export default function PhotoViewerScreen() {
  const { t, dateLocale } = useT();
  const params = useLocalSearchParams<{
    id: string; name: string; type: string; isFavorite?: string; isTrashed?: string;
    isArchived?: string; localUri?: string; isUploaded?: string;
  }>();
  // Swipe between photos: the gallery seeds an ordered list into the viewer
  // store before navigating; we page through it. If the store doesn't hold this
  // id (deep link / older caller) fall back to a single photo from the params.
  const photos = useMemo<ViewerPhoto[]>(() => {
    const stored = getViewerPhotos();
    if (stored.some((p) => p.id === params.id)) return stored;
    return [{
      id: params.id, name: params.name, type: params.type,
      isFavorite: params.isFavorite, isArchived: params.isArchived,
      isTrashed: params.isTrashed, localUri: params.localUri, isUploaded: params.isUploaded,
    }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const initialIndex = Math.max(0, photos.findIndex((p) => p.id === params.id));
  const [index, setIndex] = useState(initialIndex);
  const current = photos[index] || photos[0];
  const { id, name, type, localUri, isUploaded } = current;
  const isTrashed = current.isTrashed === '1';
  // A device photo (localUri, not backed up) has no cloud record under this id —
  // switch to local-only mode that reads from disk and hides cloud-only actions.
  const isLocalOnly = !!localUri && isUploaded !== '1';
  const [mediaH, setMediaH] = useState(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first && typeof first.index === 'number') setIndex(first.index);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const { colors: tc } = useTheme();
  const { getToken, appUser } = useAuth();
  const { ensureOnCloud } = useCloudGate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(current.isFavorite === '1');
  const [isArchived, setIsArchived] = useState(current.isArchived === '1');
  const [togglingFav, setTogglingFav] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileMetadata | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  // For cloud-backed media we fetch a presigned S3 URL; /api/stream/[id]
  // authenticates by session cookie which mobile (Bearer-only) can't
  // satisfy. For local-only media we just point the renderer at the
  // device URI and skip the API round-trip entirely.
  const [mediaUrl, setMediaUrl] = useState<string | null>(localUri || null);
  const [mediaLoading, setMediaLoading] = useState(!localUri);
  const isVideo = type === 'video';
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!id) return;
    // Local-only photos already have their URI in mediaUrl, no fetch
    // needed. Calling /api/files/{deviceId}/download-url would 404 and
    // surface a confusing "Nije moguće učitati fajl" toast.
    if (isLocalOnly) {
      const needsResolve = !!localUri && localUri.startsWith('content://');

      // expo-av's Video CANNOT play a content:// URI. For videos we therefore
      // resolve the file:// path BEFORE rendering (showing a spinner) instead
      // of mounting a player on content:// that silently never plays.
      if (isVideo && needsResolve) {
        setMediaLoading(true);
        let cancelled = false;
        (async () => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(id);
            if (!cancelled) setMediaUrl(info?.localUri || localUri);
          } catch (e) {
            console.warn('Failed to resolve content URI:', e);
            if (!cancelled) setMediaUrl(localUri || null);
          } finally {
            if (!cancelled) setMediaLoading(false);
          }
        })();
        return () => { cancelled = true; };
      }

      // Images render immediately (expo-image handles content:// fine); we
      // still upgrade content:// → file:// in the background.
      setMediaUrl(localUri || null);
      setMediaLoading(false);
      if (needsResolve) {
        let cancelled = false;
        (async () => {
          try {
            const info = await MediaLibrary.getAssetInfoAsync(id);
            if (!cancelled && info?.localUri) setMediaUrl(info.localUri);
          } catch (e) {
            console.warn('Failed to resolve content URI:', e);
          }
        })();
        return () => { cancelled = true; };
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setMediaLoading(true);
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/files/${id}/download-url`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { downloadUrl } = await res.json();
        if (!cancelled) setMediaUrl(downloadUrl);
      } catch (e) {
        console.error('Media load error:', e);
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, getToken, isLocalOnly, localUri]);

  // Swiping to another photo → reflect that photo's favorite/archived flags.
  useEffect(() => {
    setIsFavorite(current.isFavorite === '1');
    setIsArchived(current.isArchived === '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleSaveToDevice = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') {
        Alert.alert(t('common.permissionRequired'), t('viewer.galleryPermission'));
        return;
      }

      // Local-only photos are already in the device gallery — saving
      // them again would duplicate. Tell the user instead of erroring.
      if (isLocalOnly) {
        Alert.alert(t('viewer.alreadySavedTitle'), t('viewer.alreadySavedMessage'));
        return;
      }

      const token = await getToken();
      const ext = name?.split('.').pop() || 'jpg';
      const cacheUri = `${FileSystem.cacheDirectory}download_${id}.${ext}`;

      // Single fetch: ask the API for a presigned S3 URL, then download
      // the bytes from S3 directly. The earlier implementation double-
      // dipped (downloadAsync to the JSON endpoint, then again to the
      // real URL) which saved JSON to disk before the real download.
      const urlRes = await fetch(`${API_URL}/api/files/${id}/download-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!urlRes.ok) throw new Error('Failed to get download URL');
      const { downloadUrl } = await urlRes.json();

      const fileDownload = await FileSystem.downloadAsync(downloadUrl, cacheUri);

      await MediaLibrary.saveToLibraryAsync(fileDownload.uri);
      Alert.alert(t('common.saved'), t('viewer.savedToGallery'));
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert(t('common.error'), t('viewer.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const token = await getToken();
      let cloudFileId = id;
      // Device photos (home gallery) carry `localUri`; their `id` is a
      // MediaLibrary asset id, not a cloud file id, so /api/share can't find
      // it ("File not found"). Back the photo up if needed, then resolve its
      // cloud file id (by stored assetId, falling back to filename).
      if (localUri) {
        const ready = await ensureOnCloud({ assetId: id, isUploaded: isUploaded === '1' });
        if (!ready) return;
        const rr = await fetch(
          `${API_URL}/api/files/resolve?assetId=${encodeURIComponent(id)}&name=${encodeURIComponent(name || '')}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (rr.ok) {
          cloudFileId = (await rr.json()).fileId;
        } else {
          Alert.alert(t('viewer.shareTitle'), t('viewer.sharePrepareFailed'));
          return;
        }
      }

      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fileId: cloudFileId, permission: 'read' }),
      });

      // Append the sharer's referral code so a recipient who signs up via
      // the link credits this user (the referrer) with +250MB once the
      // recipient has uploaded 100MB (max 6 referrals).
      const refCode = appUser?.referralCode;
      const refSuffix = refCode ? `?ref=${encodeURIComponent(refCode)}` : '';

      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${API_URL}${data.shareUrl}${refSuffix}`;
        await Share.share({
          message: `${name}\n${shareUrl}${refCode ? `\n\n${t('viewer.shareReferral')}` : ''}`,
          url: shareUrl,
        });
      } else {
        Alert.alert(t('viewer.shareTitle'), t('viewer.shareFailed'));
      }
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const handleToggleFavorite = async () => {
    if (isLocalOnly) {
      Alert.alert(t('viewer.backupRequiredTitle'), t('viewer.backupRequiredFavorite'));
      return;
    }
    try {
      setTogglingFav(true);
      const newVal = !isFavorite;
      setIsFavorite(newVal); // optimistic
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isFavorite: newVal }),
      });
      if (!res.ok) {
        setIsFavorite(!newVal); // rollback
        Alert.alert(t('common.error'), t('viewer.favoriteFailed'));
      }
    } catch (e) {
      setIsFavorite(!isFavorite); // rollback
      console.error('Favorite error:', e);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleShowInfo = async () => {
    setShowInfo(true);
    if (fileInfo) return; // already loaded
    // For local-only photos the cloud endpoint would 404 — fall back
    // to whatever we can derive from the URL params instead of showing
    // an empty modal with "Nije moguće učitati detalje".
    if (isLocalOnly) {
      setFileInfo({
        id: id!,
        name: name || '',
        type: type === 'video' ? 'video' : 'image',
        size: 0,
        mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
      } as unknown as FileMetadata);
      return;
    }
    try {
      setLoadingInfo(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFileInfo(data.file || data);
      }
    } catch (e) {
      console.error('Info fetch error:', e);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleToggleArchive = async () => {
    try {
      const newVal = !isArchived;
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isArchived: newVal }),
      });
      if (res.ok) {
        setIsArchived(newVal);
        Alert.alert(newVal ? t('viewer.archivedTitle') : t('viewer.restoredTitle'), newVal ? t('viewer.archivedMessage') : t('viewer.unarchivedMessage'));
        router.back();
      } else {
        Alert.alert(t('common.error'), t('viewer.actionFailed'));
      }
    } catch (e) {
      console.error('Archive error:', e);
    }
  };

  const handleRestore = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/files/${id}/restore`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      Alert.alert(t('viewer.restoredTitle'), t('viewer.restoredFromTrash'));
      router.back();
    } catch (e) {
      console.error('Restore error:', e);
      Alert.alert(t('common.error'), t('viewer.restoreFailed'));
    }
  };

  const handlePermanentDelete = () => {
    Alert.alert(t('viewer.permanentDeleteTitle'), t('viewer.permanentDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('viewer.deleteForever'), style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/api/files/${id}/permanent-delete`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.back();
          } catch (e) {
            console.error('Permanent delete error:', e);
            Alert.alert(t('common.error'), t('viewer.deleteFailed'));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(t('viewer.moveToTrashTitle'), t('viewer.moveToTrashMessage', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('viewer.move'), style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            // Soft-delete: PATCH isTrashed=true via the per-file endpoint
            // (the older /api/files/delete is a hard-delete used by trash
            // emptying — the kanta button on a normal photo should be
            // recoverable).
            const res = await fetch(`${API_URL}/api/files/${id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ isTrashed: true }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.back();
          } catch (e) {
            console.error('Delete error:', e);
            Alert.alert(t('common.error'), t('viewer.moveToTrashFailed'));
          }
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fileName} numberOfLines={1}>{name || t('viewer.photo')}</Text>
        <TouchableOpacity style={styles.topBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Media pager — swipe left/right through the gallery's ordered photos */}
      <View style={styles.imageContainer} onLayout={(e) => setMediaH(e.nativeEvent.layout.height)}>
        {mediaH === 0 ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p) => p.id}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            windowSize={3}
            renderItem={({ item }) => (
              <PhotoPage photo={item} isActive={item.id === current.id} pageW={width} pageH={mediaH} getToken={getToken} />
            )}
          />
        )}
      </View>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {isTrashed ? (
          <>
            <TouchableOpacity style={styles.action} onPress={handleRestore}>
              <Ionicons name="arrow-undo-outline" size={22} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>{t('viewer.restore')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={handleShowInfo}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>{t('viewer.info')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={handlePermanentDelete}>
              <Ionicons name="skull-outline" size={22} color="#f87171" />
              <Text style={[styles.actionText, { color: '#f87171' }]}>{t('viewer.deleteForever')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.action} onPress={handleSaveToDevice} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#fff" />
              )}
              <Text style={styles.actionText}>{t('common.save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>{t('common.share')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={() => router.push({
              pathname: '/image-editor',
              // Pass localUri + isUploaded along so the editor knows to
              // skip the cloud download for device-only photos — same
              // pattern as the viewer above.
              params: {
                id: id!,
                name: name || 'Photo',
                ...(localUri ? { uri: mediaUrl || localUri } : {}),
                isUploaded: isUploaded || '0',
              },
            })}>
              <Ionicons name="brush-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>{t('viewer.edit')}</Text>
            </TouchableOpacity>

            {/* "Kreiraj" (creative hub) intentionally hidden — feature
                still in development, see deferred follow-up. */}

            <TouchableOpacity style={styles.action} onPress={() => router.push({
              pathname: '/meme-creator',
              params: {
                id: id!,
                name: name || 'Photo',
                // Pass the playable media URL (image or video) + its type so the
                // meme creator renders a <Video> for videos instead of a broken
                // <Image>. Works for cloud (mediaUrl) and device (localUri).
                ...((mediaUrl || localUri) ? { uri: mediaUrl || localUri } : {}),
                isUploaded: isUploaded || '0',
                type: type || 'image',
              },
            })}>
              <Ionicons name="flame-outline" size={22} color="#f97316" />
              <Text style={[styles.actionText, { color: '#f97316' }]}>{t('viewer.meme')}</Text>
            </TouchableOpacity>

            {/* Cloud-only actions are hidden for local-only photos.
                Favorite/archive/delete need a cloud record; Info has a
                graceful fallback so we keep it visible. */}
            {!isLocalOnly && (
              <TouchableOpacity style={styles.action} onPress={handleToggleFavorite} disabled={togglingFav}>
                {togglingFav ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isFavorite ? colors.accent : '#fff'}
                  />
                )}
                <Text style={[styles.actionText, isFavorite && { color: colors.accent }]}>{t('viewer.favorite')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.action} onPress={handleShowInfo}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>{t('viewer.info')}</Text>
            </TouchableOpacity>

            {!isLocalOnly && (
              <TouchableOpacity style={styles.action} onPress={handleToggleArchive}>
                <Ionicons name={isArchived ? 'arrow-undo-outline' : 'archive-outline'} size={22} color="#fff" />
                <Text style={styles.actionText}>{isArchived ? 'Vrati' : 'Arhiva'}</Text>
              </TouchableOpacity>
            )}

            {!isLocalOnly && (
              <TouchableOpacity style={styles.action} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color="#f87171" />
                <Text style={[styles.actionText, { color: '#f87171' }]}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Info Modal */}
      <Modal visible={showInfo} animationType="slide" transparent>
        <View style={styles.infoOverlay}>
          <View style={[styles.infoSheet, { backgroundColor: tc.bgCard }]}>
            <View style={[styles.infoHeader, { borderBottomColor: tc.borderLight }]}>
              <Text style={styles.infoTitle}>{t('viewer.details')}</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingInfo ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : fileInfo ? (
              <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>{t('viewer.sectionFile')}</Text>
                  <InfoRow label={t('viewer.name')} value={fileInfo.name} />
                  <InfoRow label={t('viewer.size')} value={formatBytes(fileInfo.size || 0)} />
                  {fileInfo.width && fileInfo.height && (
                    <InfoRow label={t('viewer.dimensions')} value={`${fileInfo.width} x ${fileInfo.height}`} />
                  )}
                  <InfoRow label={t('viewer.type')} value={fileInfo.mimeType || fileInfo.type || '-'} />
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>{t('viewer.sectionDate')}</Text>
                  <InfoRow label={t('viewer.taken')} value={fileInfo.takenAt ? new Date(fileInfo.takenAt).toLocaleDateString(dateLocale) : '-'} />
                  <InfoRow label={t('viewer.uploaded')} value={fileInfo.createdAt ? new Date(fileInfo.createdAt).toLocaleDateString(dateLocale) : '-'} />
                </View>

                {fileInfo.cameraModel && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>{t('viewer.sectionDevice')}</Text>
                    <InfoRow label={t('viewer.camera')} value={fileInfo.cameraModel} />
                    {fileInfo.cameraMake && <InfoRow label={t('viewer.manufacturer')} value={fileInfo.cameraMake} />}
                  </View>
                )}

                {fileInfo.locationName && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>{t('viewer.sectionLocation')}</Text>
                    <InfoRow label={t('viewer.place')} value={fileInfo.locationName} />
                  </View>
                )}

                {fileInfo.labels && fileInfo.labels.length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>{t('viewer.sectionAiTags')}</Text>
                    <View style={styles.tagsRow}>
                      {fileInfo.labels.map((tag: string, i: number) => (
                        <View key={i} style={[styles.tag, { backgroundColor: tc.bgInput }]}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              <Text style={{ padding: 20, color: colors.textMuted, textAlign: 'center' }}>
                {t('viewer.detailsFailed')}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={styles.infoRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 8, paddingBottom: 8,
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileName: { flex: 1, color: '#fff', fontSize: 14, ...fonts.semibold, textAlign: 'center', marginHorizontal: 8 },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: width, height: height * 0.65 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  action: { alignItems: 'center', gap: 4, minWidth: 50 },
  actionText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, ...fonts.medium },
  // Info modal
  infoOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  infoSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: height * 0.65,
  },
  infoHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  infoTitle: { fontSize: 16, ...fonts.bold, color: colors.text },
  infoSection: { paddingTop: 12 },
  infoLabel: { fontSize: 10, ...fonts.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  infoRowLabel: { fontSize: 13, color: colors.textSecondary, ...fonts.medium },
  infoRowValue: { fontSize: 13, color: colors.text, ...fonts.semibold, textAlign: 'right', maxWidth: '60%' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  tag: {
    backgroundColor: '#f0f9ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#e0f2fe',
  },
  tagText: { fontSize: 11, color: colors.primary, ...fonts.medium },
});
