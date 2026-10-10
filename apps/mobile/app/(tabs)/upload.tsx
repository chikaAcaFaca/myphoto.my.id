import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSync } from '@/lib/sync-context';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export default function UploadScreen() {
  const { colors: tc } = useTheme();
  const { t, tp } = useT();
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
        Alert.alert(t('common.error'), t('upload.notSignedIn'));
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
        t('upload.doneTitle'),
        t('upload.doneMessage', { success, total: picked.length })
      );
    } catch (e) {
      console.log('Pick error:', e);
      Alert.alert(t('common.error'), t('upload.pickFailed'));
    } finally {
      setUploading(false);
    }
  }, [getToken, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <ScreenHeader title={t('upload.title')}>
          <Text style={[styles.headerSubtitle, { color: tc.textSecondary }]}>{t('upload.subtitle')}</Text>
        </ScreenHeader>

        {/* Manual upload buttons */}
        <View style={styles.pickSection}>
          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#3b82f6' }]}
            onPress={() => pickAndUpload('photos')}
            disabled={uploading}
          >
            <Ionicons name="images-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>{t('upload.photos')}</Text>
            <Text style={styles.pickBtnSub}>{t('upload.photosSub')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={() => pickAndUpload('videos')}
            disabled={uploading}
          >
            <Ionicons name="videocam-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>{t('upload.videos')}</Text>
            <Text style={styles.pickBtnSub}>{t('upload.videosSub')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pickBtn, { backgroundColor: '#f97316' }]}
            onPress={() => pickAndUpload('files')}
            disabled={uploading}
          >
            <Ionicons name="document-outline" size={28} color="#fff" />
            <Text style={styles.pickBtnTitle}>{t('upload.files')}</Text>
            <Text style={styles.pickBtnSub}>{t('upload.filesSub')}</Text>
          </TouchableOpacity>
        </View>

        {/* Upload progress */}
        {uploading && (
          <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
            <View style={styles.progressItem}>
              <ActivityIndicator size="small" color={tc.primary} />
              <Text style={[styles.pendingTitle, { marginLeft: 10, color: tc.text }]}>
                {t('upload.progress', { done: uploadCount, total: uploadTotal })}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${uploadTotal > 0 ? (uploadCount / uploadTotal) * 100 : 0}%` }]} />
            </View>
          </View>
        )}

        {/* Auto-backup section */}
        <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('upload.autoBackupSection')}</Text>

        <TouchableOpacity
          style={[styles.syncBtn, { borderColor: tc.primary }]}
          activeOpacity={0.8}
          onPress={() => { if (isSyncing) stopSync(); else startSync(); }}
        >
          <Ionicons name={isSyncing ? 'pause' : 'sync'} size={20} color={tc.primary} />
          <Text style={[styles.syncBtnText, { color: tc.primary }]}>
            {isSyncing ? t('upload.pauseSync') : pendingCount > 0 ? tp('upload.syncFiles', pendingCount) : t('upload.allSynced')}
          </Text>
        </TouchableOpacity>

        {/* Sync progress */}
        {isSyncing && (
          <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${syncProgress}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: tc.textMuted }]}>{t('upload.syncingPercent', { percent: Math.round(syncProgress) })}</Text>
          </View>
        )}

        {/* MySpace Folder Sync */}
        {folderSyncSettings.enabled && folderSyncSettings.folders.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: tc.textSecondary }]}>{t('upload.folderSyncSection')}</Text>

            <TouchableOpacity
              style={[styles.syncBtn, { borderColor: '#8b5cf6' }]}
              activeOpacity={0.8}
              onPress={() => { if (!isFolderSyncing) startFolderSync(); }}
              disabled={isFolderSyncing}
            >
              <Ionicons name={isFolderSyncing ? 'hourglass' : 'folder-open'} size={20} color="#8b5cf6" />
              <Text style={[styles.syncBtnText, { color: '#8b5cf6' }]}>
                {isFolderSyncing
                  ? t('upload.syncInProgress')
                  : folderSyncPending > 0
                    ? tp('upload.syncFilesToMySpace', folderSyncPending)
                    : t('upload.foldersUpToDate')}
              </Text>
            </TouchableOpacity>

            {isFolderSyncing && (
              <View style={[styles.card, { backgroundColor: tc.bgCard }]}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${folderSyncProgress}%`, backgroundColor: '#8b5cf6' }]} />
                </View>
                <Text style={[styles.progressText, { color: tc.textMuted }]}>{t('upload.folderSyncPercent', { percent: Math.round(folderSyncProgress) })}</Text>
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
                  {pendingCount > 0 ? tp('upload.pendingSync', pendingCount) : t('upload.allSynced')}
                </Text>
                <Text style={[styles.pendingSubtitle, { color: tc.textMuted }]}>
                  {pendingCount > 0 ? t('upload.startSyncHint') : t('upload.upToDateHint')}
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
  headerSubtitle: { fontSize: 14, marginTop: -4 },
  pickSection: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 8,
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
