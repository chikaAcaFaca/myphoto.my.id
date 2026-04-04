import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
  ActivityIndicator, Share, Platform, Modal, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts, radius } from '@/lib/theme';
import { formatBytes } from '@myphoto/shared';
import type { FileMetadata } from '@myphoto/shared';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function PhotoViewerScreen() {
  const { id, name, type, isFavorite: favParam, isTrashed: trashedParam, isArchived: archivedParam } = useLocalSearchParams<{
    id: string; name: string; type: string; isFavorite?: string; isTrashed?: string; isArchived?: string;
  }>();
  const isTrashed = trashedParam === '1';
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(favParam === '1');
  const [isArchived, setIsArchived] = useState(archivedParam === '1');
  const [togglingFav, setTogglingFav] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileMetadata | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const imageUrl = `${API_URL}/api/stream/${id}`;

  const handleSaveToDevice = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status !== 'granted') {
        Alert.alert('Dozvola potrebna', 'Dozvolite pristup galeriji da sacuvate sliku.');
        return;
      }

      const token = await getToken();
      const ext = name?.split('.').pop() || 'jpg';
      const localUri = `${FileSystem.cacheDirectory}download_${id}.${ext}`;

      const download = await FileSystem.downloadAsync(
        `${API_URL}/api/files/${id}/download-url`,
        localUri,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      // The download-url endpoint returns JSON with the actual URL
      // We need to fetch the actual file
      const urlRes = await fetch(`${API_URL}/api/files/${id}/download-url`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!urlRes.ok) throw new Error('Failed to get download URL');
      const { downloadUrl } = await urlRes.json();

      const fileDownload = await FileSystem.downloadAsync(downloadUrl, localUri);

      await MediaLibrary.saveToLibraryAsync(fileDownload.uri);
      Alert.alert('Sacuvano', 'Fajl je sacuvan u galeriju.');
    } catch (e: any) {
      console.error('Save error:', e);
      Alert.alert('Greska', 'Nije moguce sacuvati fajl.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const token = await getToken();
      // Create share link via API
      const res = await fetch(`${API_URL}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fileId: id, permission: 'read' }),
      });

      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${API_URL}${data.shareUrl}`;
        await Share.share({ message: `${name}\n${shareUrl}`, url: shareUrl });
      } else {
        // Fallback: share direct link
        await Share.share({ message: `${name} - ${API_URL}/api/stream/${id}` });
      }
    } catch (e) {
      console.error('Share error:', e);
    }
  };

  const handleToggleFavorite = async () => {
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
        Alert.alert('Greska', 'Nije moguce azurirati omiljeno.');
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
        Alert.alert(newVal ? 'Arhivirano' : 'Vraceno', newVal ? 'Slika je arhivirana.' : 'Slika je vracena iz arhive.');
        router.back();
      } else {
        Alert.alert('Greska', 'Akcija nije uspela.');
      }
    } catch (e) {
      console.error('Archive error:', e);
    }
  };

  const handleRestore = async () => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/files/${id}/restore`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      Alert.alert('Vraceno', 'Fajl je vracen iz korpe.');
      router.back();
    } catch (e) {
      Alert.alert('Greska', 'Nije moguce vratiti fajl.');
    }
  };

  const handlePermanentDelete = () => {
    Alert.alert('Trajno obrisati?', 'Ova akcija je nepovratna.', [
      { text: 'Otkazi', style: 'cancel' },
      {
        text: 'Obrisi zauvek', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${API_URL}/api/files/${id}/permanent-delete`, {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            router.back();
          } catch (e) {
            Alert.alert('Greska', 'Brisanje nije uspelo.');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Obrisati?', `Da li zelite da obrisete ${name}?`, [
      { text: 'Otkazi', style: 'cancel' },
      {
        text: 'Obrisi', style: 'destructive', onPress: async () => {
          try {
            const token = await getToken();
            await fetch(`${API_URL}/api/files/delete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ fileIds: [id] }),
            });
            router.back();
          } catch (e) {
            Alert.alert('Greska', 'Brisanje nije uspelo.');
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
        <Text style={styles.fileName} numberOfLines={1}>{name || 'Photo'}</Text>
        <TouchableOpacity style={styles.topBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        {isTrashed ? (
          <>
            <TouchableOpacity style={styles.action} onPress={handleRestore}>
              <Ionicons name="arrow-undo-outline" size={22} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>Vrati</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={handleShowInfo}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={handlePermanentDelete}>
              <Ionicons name="skull-outline" size={22} color="#f87171" />
              <Text style={[styles.actionText, { color: '#f87171' }]}>Obrisi zauvek</Text>
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
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleShare}>
              <Ionicons name="share-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

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
              <Text style={[styles.actionText, isFavorite && { color: colors.accent }]}>Omiljeno</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleShowInfo}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
              <Text style={styles.actionText}>Info</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleToggleArchive}>
              <Ionicons name={isArchived ? 'arrow-undo-outline' : 'archive-outline'} size={22} color="#fff" />
              <Text style={styles.actionText}>{isArchived ? 'Vrati' : 'Arhiva'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#f87171" />
              <Text style={[styles.actionText, { color: '#f87171' }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Info Modal */}
      <Modal visible={showInfo} animationType="slide" transparent>
        <View style={styles.infoOverlay}>
          <View style={styles.infoSheet}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>Detalji</Text>
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
                  <Text style={styles.infoLabel}>FAJL</Text>
                  <InfoRow label="Ime" value={fileInfo.name} />
                  <InfoRow label="Velicina" value={formatBytes(fileInfo.size || 0)} />
                  {fileInfo.width && fileInfo.height && (
                    <InfoRow label="Dimenzije" value={`${fileInfo.width} x ${fileInfo.height}`} />
                  )}
                  <InfoRow label="Tip" value={fileInfo.mimeType || fileInfo.type || '-'} />
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>DATUM</Text>
                  <InfoRow label="Snimljeno" value={fileInfo.takenAt ? new Date(fileInfo.takenAt).toLocaleDateString('sr-Latn') : '-'} />
                  <InfoRow label="Uploadovano" value={fileInfo.createdAt ? new Date(fileInfo.createdAt).toLocaleDateString('sr-Latn') : '-'} />
                </View>

                {fileInfo.cameraModel && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>UREDJAJ</Text>
                    <InfoRow label="Kamera" value={fileInfo.cameraModel} />
                    {fileInfo.cameraMake && <InfoRow label="Proizvodjac" value={fileInfo.cameraMake} />}
                  </View>
                )}

                {fileInfo.locationName && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>LOKACIJA</Text>
                    <InfoRow label="Mesto" value={fileInfo.locationName} />
                  </View>
                )}

                {fileInfo.labels && fileInfo.labels.length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>AI TAGOVI</Text>
                    <View style={styles.tagsRow}>
                      {fileInfo.labels.map((tag: string, i: number) => (
                        <View key={i} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            ) : (
              <Text style={{ padding: 20, color: colors.textMuted, textAlign: 'center' }}>
                Nije moguce ucitati detalje
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
