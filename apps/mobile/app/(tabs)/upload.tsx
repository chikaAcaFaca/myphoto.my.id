import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '@/lib/sync-context';
import { colors, radius, fonts } from '@/lib/theme';

interface TransferItem {
  id: string;
  name: string;
  time: string;
  color: 'blue' | 'orange';
}

export default function UploadScreen() {
  const { isSyncing, syncProgress, pendingCount, startSync, stopSync } = useSync();

  // Mock recent transfers for now - will be populated from sync history
  const [recentTransfers] = useState<TransferItem[]>([]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={styles.headerBg}>
          <View style={styles.headerCenter}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <Text style={styles.headerTitle}>Upload</Text>
          </View>
          <Text style={styles.headerSubtitle}>Sync your files to cloud</Text>
        </View>

        {/* Upload button */}
        <TouchableOpacity
          style={styles.uploadBtn}
          activeOpacity={0.8}
          onPress={() => { if (isSyncing) stopSync(); else startSync(); }}
        >
          <Ionicons name={isSyncing ? 'pause' : 'rocket'} size={20} color="#fff" />
          <Text style={styles.uploadBtnText}>
            {isSyncing ? 'Pause Upload' : pendingCount > 0 ? `Upload ${pendingCount} Files` : 'Upload New Files'}
          </Text>
        </TouchableOpacity>

        {/* Active uploads */}
        {isSyncing && (
          <View style={styles.card}>
            <View style={styles.progressItem}>
              <View style={styles.progressRow}>
                <Text style={styles.progressName}>Syncing photos...</Text>
                <TouchableOpacity style={styles.cancelBtn} onPress={stopSync}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, styles.progressGreen, { width: `${syncProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(syncProgress)}% - Uploading...</Text>
            </View>
          </View>
        )}

        {/* Pending count */}
        {!isSyncing && pendingCount > 0 && (
          <View style={styles.card}>
            <View style={styles.pendingRow}>
              <View style={styles.pendingIcon}>
                <Ionicons name="time" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>{pendingCount} fajlova ceka upload</Text>
                <Text style={styles.pendingSubtitle}>Pritisnite Upload da pocnete</Text>
              </View>
            </View>
          </View>
        )}

        {/* Status when nothing to do */}
        {!isSyncing && pendingCount === 0 && (
          <View style={styles.card}>
            <View style={styles.pendingRow}>
              <View style={[styles.pendingIcon, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingTitle}>Sve je sinhronizovano</Text>
                <Text style={styles.pendingSubtitle}>Vasi fajlovi su azurni u cloudu</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Transfers */}
        <Text style={styles.sectionTitle}>Recent Transfers</Text>

        {recentTransfers.length === 0 ? (
          <View style={styles.card}>
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Ionicons name="swap-vertical-outline" size={36} color={colors.textMuted} />
              <Text style={[styles.pendingSubtitle, { marginTop: 8 }]}>Istorija transfera ce se pojaviti ovde</Text>
            </View>
          </View>
        ) : (
          <View style={styles.transferGrid}>
            {recentTransfers.map(t => (
              <View key={t.id} style={[styles.transferCard, t.color === 'blue' ? styles.transferBlue : styles.transferOrange]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ position: 'absolute', top: 8, right: 8 }} />
                <Text style={styles.transferName}>{t.name}</Text>
                <Text style={styles.transferMeta}>{t.time}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8, paddingBottom: 24, alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, ...fonts.extrabold, color: '#fff' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, marginHorizontal: 12, marginTop: -12,
    borderRadius: radius.lg, paddingVertical: 16,
    shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, ...fonts.bold },
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg, marginHorizontal: 12, marginTop: 12,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  progressItem: { paddingVertical: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressName: { fontSize: 12, ...fonts.semibold, color: colors.text },
  progressBar: { height: 6, backgroundColor: colors.bgInput, borderRadius: 3, marginVertical: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressGreen: { backgroundColor: colors.success },
  progressText: { fontSize: 10, color: colors.textMuted },
  cancelBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center',
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  pendingTitle: { fontSize: 13, ...fonts.semibold, color: colors.text },
  pendingSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  sectionTitle: { fontSize: 12, ...fonts.bold, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  transferGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 4 },
  transferCard: { width: '48%', borderRadius: radius.md, padding: 12 },
  transferBlue: { backgroundColor: '#e0f2fe' },
  transferOrange: { backgroundColor: '#ffedd5' },
  transferName: { fontSize: 11, ...fonts.bold, color: colors.text },
  transferMeta: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
});
