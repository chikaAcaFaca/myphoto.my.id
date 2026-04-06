import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSync } from '@/lib/sync-context';
import { useAuth } from '@/lib/auth-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

export default function UploadScreen() {
  const { colors: tc } = useTheme();
  const { isSyncing, syncProgress, pendingCount, startSync, stopSync } = useSync();
  const { getToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const pickAndUpload = useCallback(async (type: 'photos' | 'videos' | 'files') => {
    try {
      let assets: { uri: string; name?: string; mimeType?: string }[] = [];

      if (type === 'files') {
        const result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          type: '*/*',
        });
        if (!result.canceled && result.assets) {
          assets = result.assets.map(a => ({ uri: a.uri, name: a.name, mimeType: a.mimeType || undefined }));
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: type === 'videos' ? ['videos'] : ['images'],
          allowsMultipleSelection: true,
          quality: 1,
          selectionLimit: 50,
        });
        if (!result.canceled && result.assets) {
          assets = result.assets.map(a => ({
            uri: a.uri,
            name: a.fileName || `${type}_${Date.now()}.${a.uri.split('.').pop()}`,
            mimeType: a.mimeType || undefined,
          }));
        }
      }

      if (assets.length === 0) return;

      setUploading(true);
      setUploadCount(0);
      const token = await getToken();
      let success = 0;

      for (const asset of assets) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            name: asset.name || `file_${Date.now()}`,
            type: asset.mimeType || 'application/octet-stream',
          } as any);

          const res = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });

          if (res.ok) {
            success++;
            setUploadCount(success);
          }
        } catch (e) {
          console.log('Upload error for file:', asset.name, e);
        }
      }

      Alert.alert(
        'Upload zavrsen',
        `${success}/${assets.length} fajlova uspesno uploadovano.`
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
              <Text style={[styles.pendingTitle, { marginLeft: 10 }]}>
                Uploadovano {uploadCount} fajlova...
              </Text>
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
  progressBar: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#22c55e' },
  progressText: { fontSize: 10, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 13, ...fonts.semibold },
  pendingSubtitle: { fontSize: 11, marginTop: 1 },
});
