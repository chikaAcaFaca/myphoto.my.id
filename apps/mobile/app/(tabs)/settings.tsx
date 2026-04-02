import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { colors, radius, fonts } from '@/lib/theme';
import { formatBytes } from '@myphoto/shared';

export default function SettingsScreen() {
  const { user, appUser, signOut } = useAuth();
  const { settings, updateSettings, deviceAlbums, isLoadingAlbums, refreshDeviceAlbums } = useSync();
  const [isFolderSectionOpen, setIsFolderSectionOpen] = useState(false);

  const storageUsed = appUser?.storageUsed || 0;
  const storageLimit = appUser?.storageLimit || 0;
  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Da li ste sigurni?', [
      { text: 'Otkazi', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBg}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(appUser?.displayName || user?.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{appUser?.displayName || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Storage */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>STORAGE</Text>
          <View style={styles.storageRow}>
            <Text style={styles.storageUsed}>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</Text>
            <Text style={[styles.storagePercent, storagePercent > 80 && { color: colors.error }]}>{storagePercent}%</Text>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageFill, { width: `${Math.min(storagePercent, 100)}%` }]} />
          </View>
          <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-up-circle" size={16} color="#fff" />
            <Text style={styles.upgradeBtnText}>Upgrade Storage</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Sync */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>BACKUP & SYNC</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Auto Backup</Text>
            <Switch
              value={settings.autoBackup}
              onValueChange={(v) => updateSettings({ autoBackup: v })}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>WiFi Only</Text>
            <Switch
              value={settings.syncMode === 'wifi_only'}
              onValueChange={(v) => updateSettings({ syncMode: v ? 'wifi_only' : 'wifi_and_mobile' })}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>Upload Quality</Text>
            <Text style={styles.settingValue}>{settings.uploadQuality === 'original' ? 'Original' : settings.uploadQuality === 'high' ? 'High' : 'Medium'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => { setIsFolderSectionOpen(!isFolderSectionOpen); refreshDeviceAlbums(); }}
          >
            <Text style={styles.settingText}>Backup Folders</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.settingValue}>
                {(settings.backupFolders || []).length === 0 ? 'All' : `${settings.backupFolders.length}`}
              </Text>
              <Ionicons name={isFolderSectionOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {isFolderSectionOpen && (
            <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
              {isLoadingAlbums ? (
                <Text style={styles.folderLoading}>Loading...</Text>
              ) : deviceAlbums.map(album => {
                const isSelected = (settings.backupFolders || []).includes(album.title);
                return (
                  <TouchableOpacity
                    key={album.id}
                    style={styles.folderRow}
                    onPress={() => {
                      const current = settings.backupFolders || [];
                      const updated = isSelected
                        ? current.filter(t => t !== album.title)
                        : [...current, album.title];
                      updateSettings({ backupFolders: updated });
                    }}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                    <Text style={styles.folderName}>{album.title}</Text>
                    <Text style={styles.folderCount}>{album.assetCount}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* App */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Dark Mode</Text>
            <Switch
              value={false}
              disabled
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.settingText}>About</Text>
            <Text style={styles.settingValueMuted}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBg: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  card: {
    backgroundColor: '#fff', borderRadius: radius.lg, marginHorizontal: 12, marginTop: 12,
    padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  sectionLabel: { fontSize: 10, ...fonts.bold, color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  avatarText: { color: '#fff', fontSize: 20, ...fonts.extrabold },
  profileName: { fontSize: 15, ...fonts.bold, color: colors.text },
  profileEmail: { fontSize: 11, color: colors.textMuted },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  storageUsed: { fontSize: 11, ...fonts.bold, color: colors.text },
  storagePercent: { fontSize: 11, ...fonts.bold, color: colors.accent },
  storageBar: { height: 10, backgroundColor: colors.bgInput, borderRadius: 5, marginVertical: 8, overflow: 'hidden' },
  storageFill: { height: '100%', borderRadius: 5, backgroundColor: colors.primary },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 10, marginTop: 4,
    shadowColor: colors.accent, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  upgradeBtnText: { color: '#fff', fontSize: 12, ...fonts.bold },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  settingText: { fontSize: 13, color: colors.text, ...fonts.medium },
  settingValue: { fontSize: 12, color: colors.primary, ...fonts.semibold },
  settingValueMuted: { fontSize: 12, color: colors.textMuted },
  folderLoading: { fontSize: 12, color: colors.textMuted, padding: 8 },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  folderName: { flex: 1, fontSize: 12, color: colors.text, ...fonts.medium },
  folderCount: { fontSize: 11, color: colors.textMuted },
  signOutBtn: {
    marginHorizontal: 12, marginTop: 16,
    backgroundColor: '#fef2f2', borderRadius: radius.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { color: colors.error, fontSize: 14, ...fonts.bold },
});
