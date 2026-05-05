import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useSync } from '@/lib/sync-context';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export default function UploadScreen() {
  const { colors: tc } = useTheme();
  const {
    isSyncing, syncProgress, pendingCount, startSync, stopSync,
    folderSyncSettings, folderSyncPending, isFolderSyncing, folderSyncProgress, startFolderSync,
  } = useSync();
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);

  const uploadFile = async (file: PickedFile, token: string): Promise<boolean> => {
    try {
      // 1. Get presigned URL via disk-files
      const urlRes = await fetch(`${API_URL}/api/disk-files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.mimeType,
          size: file.size,
          folderId: 'root',
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        console.log('Presigned URL error:', err.error || urlRes.status);
        return false;
      }

      const { uploadUrl, fileId, s3Key } = await urlRes.json();

      // 2. Upload to S3
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, file.uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': file.mimeType },
      });

      if (uploadResult.status !== 200) {
        console.log('S3 upload failed:', uploadResult.status);
        return false;
      }

      // 3. Confirm upload
      const confirmRes = await fetch(`${API_URL}/api/disk-files`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          s3Key,
          filename: file.name,
          mimeType: file.mimeType,
          size: file.size,
          folderId: 'root',
        }),
      });

      return confirmRes.ok;
    } catch (e) {
      console.log('Upload error for file:', file.name, e);
      return false;
    }
  };

  const pickAndUpload = useCallback(async (type: 'photos' | 'videos' | 'files') => {
    try {
      const picked: PickedFile[] = [];

      if (type === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          type: '*/*',
        });
        if (!result.canceled && result.assets) {
          for (const a of result.assets) {
            const info = await FileSystem.getInfoAsync(a.uri);
            picked.push({
              uri: a.uri,
              name: a.name,
              mimeType: a.mimeType || 'application/octet-stream',
              size: (info as any).size || 0,
            });
          }
        }
      } else if (type === 'videos') {
        // Use DocumentPicker for videos — more reliable on Android
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          type: 'video/*',
        });
        if (!result.canceled && result.assets) {
          for (const a of result.assets) {
            const info = await FileSystem.getInfoAsync(a.uri);
            picked.push({
              uri: a.uri,
              name: a.name,
              mimeType: a.mimeType || 'video/mp4',
              size: (info as any).size || 0,
            });
          }
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 1,
          selectionLimit: 50,
        });
        if (!result.canceled && result.assets) {
          for (const a of result.assets) {
            const info = await FileSystem.getInfoAsync(a.uri);
            picked.push({
              uri: a.uri,
              name: a.fileName || `${type}_${Date.now()}.${a.uri.split('.').pop()}`,
              mimeType: a.mimeType || (type === 'videos' ? 'video/mp4' : 'image/jpeg'),
              size: (info as any).size || 0,
            });
          }
        }
      }

      if (picked.length === 0) return;

      setUploading(true);
      setUploadCount(0);
      setUploadTotal(picked.length);
      const token = await getToken();
      if (!token) {
        Alert.alert('Greska', 'Niste ulogovani.');
        setUploading(false);
        return;
      }

      let success = 0;

      for (const file of picked) {
        const ok = await uploadFile(file, token);
        if (ok) {
          success++;
          setUploadCount(success);
        }
      }

      Alert.alert(
        'Upload zavrsen',
        `${success}/${picked.length} fajlova uspesno uploadovano.`
      );
    } catch (e) {
      console.log('Pick error:', e);
      Alert.alert('Greska', 'Nije moguce izabrati fajlove.');
    } finally {
      setUploading(false);
    }
  }, [getToken]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
          <View style={styles.headerCenter}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <Text style={styles.headerTitle}>Upload</Text>
          </View>
          <Text style={styles.headerSubtitle}>Uploadujte fajlove u cloud</Text>
        </View>

        {/* Manual upload buttons */}
        <View style={styles.pickSection}>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#3b82f6' }]}
            onPress={() => pickAndUpload('photos')}
            disabled={uploading}
          >
            <Ionicons name="images-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>Slike</Text>
            <Text style={styles.pickBtnSub}>Izaberi iz galerije</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={() => pickAndUpload('videos')}
            disabled={uploading}
          >
            <Ionicons name="videocam-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>Video</Text>
            <Text style={styles.pickBtnSub}>Izaberi snimke</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#f97316' }]}
            onPress={() => pickAndUpload('files')}
            disabled={uploading}
          >
            <Ionicons name="document-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>Fajlovi</Text>
            <Text style={styles.pickBtnSub}>PDF, dokument...</Text>
          </TouchableOpacity>
        </View>

        {/* Upload progress */}
        {uploading && (
          <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
            <View style={styles.progressItem}>
              <ActivityIndicator size="small" color={tc.primary} />
              <Text style={[styles.pendingTitle, { marginLeft: 10, color: tc.text }]}>
                Uploadovano {uploadCount}/{uploadTotal} fajlova...
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadTotal > 0 ? (uploadCount / uploadTotal) * 100 : 0}%` }]} />
            </View>
          </View>
        )}

        {/* Auto-backup section */}
        <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>AUTO-BACKUP</Text>

        <TouchableOpacity
          style={[styles.syncBtn, { borderColor: tc.primary }]}
          activeOpacity={0.8}
          onPress={() => { if (isSyncing) stopSync(); else startSync(); }}
        >
          <Ionicons name={isSyncing ? 'pause' : 'sync'} size={20} color={tc.primary} />
          <Text style={[styles.syncBtnText, { color: tc.primary }]}>
            {isSyncing ? 'Pauziraj Sync' : pendingCount > 0 ? `Sync ${pendingCount} fajlova` : 'Sve je sinhronizovano'}
          </Text>
        </TouchableOpacity>

        {/* Sync progress */}
        {isSyncing && (
          <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: tc.textMuted }]}>{Math.round(syncProgress)}% syncing...</Text>
          </View>
        )}

        {/* MySpace Folder Sync */}
        {folderSyncSettings.enabled && folderSyncSettings.folders.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>MYSPACE FOLDER SYNC</Text>

            <TouchableOpacity
              style={[styles.syncBtn, { borderColor: '#8b5cf6' }]}
              activeOpacity={0.8}
              onPress={() => { if (!isFolderSyncing) startFolderSync(); }}
              disabled={isFolderSyncing}
            >
              <Ionicons name={isFolderSyncing ? 'hourglass' : 'folder-open'} size={20} color="#8b5cf6" />
              <Text style={[styles.syncBtnText, { color: '#8b5cf6' }]}>
                {isFolderSyncing
                  ? 'Sync u toku...'
                  : folderSyncPending > 0
                    ? `Sync ${folderSyncPending} fajlova u MySpace`
                    : 'MySpace folderi azurni'}
              </Text>
            </TouchableOpacity>

            {isFolderSyncing && (
              <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${folderSyncProgress}%`, backgroundColor: '#8b5cf6' }]} />
                </View>
                <Text style={[styles.progressText, { color: tc.textMuted }]}>{Math.round(folderSyncProgress)}% MySpace sync...</Text>
              </View>
            )}
          </>
        )}

        {/* Status */}
        {!isSyncing && !uploading && (
          <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: pendingCount > 0 ? '#fff7ed' : '#dcfce7' }]}>
                <Ionicons
                  name={pendingCount > 0 ? 'time' : 'checkmark-circle'}
                  size={20}
                  color={pendingCount > 0 ? colors.accent : colors.success}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pendingTitle, { color: tc.text }]}>
                  {pendingCount > 0 ? `${pendingCount} fajlova ceka sync` : 'Sve je sinhronizovano'}
                </Text>
                <Text style={[styles.pendingSubtitle, { color: tc.textMuted }]}>
                  {pendingCount > 0 ? 'Pokrenite sync za upload' : 'Vasi fajlovi su azurni u cloudu'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBg: { paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8, paddingBottom: 24, alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, ...fonts.extrabold, color: '#fff' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  pickSection: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginTop: -12,
  },
  pickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: radius.lg, paddingVertical: 20,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  pickBtnTitle: { color: '#fff', fontSize: 14, ...fonts.bold },
  pickBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 9, ...fonts.medium },
  sectionTitle: { fontSize: 11, ...fonts.bold, letterSpacing: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 12, borderWidth: 1.5, borderRadius: radius.lg, paddingVertical: 14,
  },
  syncBtnText: { fontSize: 14, ...fonts.bold },
  card: {
    borderRadius: radius.lg, marginHorizontal: 12, marginTop: 12,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  progressBar: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#22c55e' },
  progressText: { fontSize: 10, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 13, ...fonts.semibold },
  pendingSubtitle: { fontSize: 11, marginTop: 1 },
});
