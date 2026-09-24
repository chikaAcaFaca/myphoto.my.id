import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { formatBytes } from '@myphoto/shared';
import { processUnindexedPhotos, getAiStatus, type AiProcessingStatus } from '@/lib/background-ai-processor';
import { useT, type LanguagePreference } from '@/lib/i18n';

// Native language names stay untranslated so users can always find their own.
const LANGUAGE_OPTIONS: LanguagePreference[] = ['en', 'sr', 'auto'];

export default function SettingsScreen() {
  const { user, appUser, signOut } = useAuth();
  const { isDark, mode, setMode } = useTheme();
  const { t, tp, preference, setPreference } = useT();
  const {
    settings, updateSettings, deviceAlbums, isLoadingAlbums, refreshDeviceAlbums,
    folderSyncSettings, folderSyncPending, addSyncFolder, removeSyncFolder, toggleFolderSync,
  } = useSync();
  const [isFolderSectionOpen, setIsFolderSectionOpen] = useState(false);
  const [isSyncFolderSectionOpen, setIsSyncFolderSectionOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiProcessingStatus | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);

  useEffect(() => {
    getAiStatus().then(setAiStatus).catch(() => {});
  }, []);

  const handleRunAi = useCallback(async () => {
    setAiProcessing(true);
    try {
      const count = await processUnindexedPhotos((done, total) => {
        setAiStatus(prev => prev ? { ...prev, indexed: (prev.indexed || 0) + 1, processing: true } : prev);
      });
      const updated = await getAiStatus();
      setAiStatus(updated);
      Alert.alert(t('settings.aiIndexingTitle'), tp('settings.aiIndexingDone', count));
    } catch (e) {
      Alert.alert(t('common.error'), t('settings.aiIndexingFailed'));
    } finally {
      setAiProcessing(false);
    }
  }, [t, tp]);

  const storageUsed = appUser?.storageUsed || 0;
  const storageLimit = appUser?.storageLimit || 0;
  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  const handleSignOut = () => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const themeColors = useTheme().colors;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: themeColors.primary }]}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(appUser?.displayName || user?.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>{appUser?.displayName || t('common.user')}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Storage */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.storage')}</Text>
          <View style={styles.storageRow}>
            <Text style={[styles.storageUsed, { color: themeColors.text }]}>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</Text>
            <Text style={[styles.storagePercent, storagePercent > 80 && { color: colors.error }]}>{storagePercent}%</Text>
          </View>
          <View style={styles.storageBar}>
            <View style={[styles.storageFill, { width: `${Math.min(storagePercent, 100)}%` }]} />
          </View>
          <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.8} onPress={() => router.push('/pricing')}>
            <Ionicons name="arrow-up-circle" size={16} color="#fff" />
            <Text style={styles.upgradeBtnText}>{t('settings.upgradeStorage')}</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Sync */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.backupSync')}</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.autoBackup')}</Text>
            <Switch
              value={settings.autoBackup}
              onValueChange={(v) => updateSettings({ autoBackup: v })}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.wifiOnly')}</Text>
            <Switch
              value={settings.syncMode === 'wifi_only'}
              onValueChange={(v) => updateSettings({ syncMode: v ? 'wifi_only' : 'wifi_and_mobile' })}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.uploadQuality')}</Text>
            <Text style={styles.settingValue}>{settings.uploadQuality === 'original' ? t('settings.qualityOriginal') : settings.uploadQuality === 'high' ? t('settings.qualityHigh') : t('settings.qualityMedium')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => { setIsFolderSectionOpen(!isFolderSectionOpen); refreshDeviceAlbums(); }}
          >
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.backupFolders')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.settingValue}>
                {(settings.backupFolders || []).length === 0 ? t('settings.allFolders') : `${settings.backupFolders.length}`}
              </Text>
              <Ionicons name={isFolderSectionOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {isFolderSectionOpen && (
            <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
              {isLoadingAlbums ? (
                <Text style={styles.folderLoading}>{t('common.loading')}</Text>
              ) : deviceAlbums.map(album => {
                const isSelected = (settings.backupFolders || []).includes(album.title);
                return (
                  <TouchableOpacity
                    key={album.id}
                    style={styles.folderRow}
                    onPress={() => {
                      const current = settings.backupFolders || [];
                      const updated = isSelected
                        ? current.filter(f => f !== album.title)
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

        {/* MySpace Folder Sync */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.folderSync')}</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.syncFoldersToCloud')}</Text>
            <Switch
              value={folderSyncSettings.enabled}
              onValueChange={(v) => toggleFolderSync(v)}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: folderSyncSettings.folders.length > 0 ? 1 : 0 }]}
            onPress={() => setIsSyncFolderSectionOpen(!isSyncFolderSectionOpen)}
          >
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.syncFolders')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.settingValue}>
                {folderSyncSettings.folders.length === 0 ? t('settings.noFolders') : `${folderSyncSettings.folders.length}`}
              </Text>
              <Ionicons name={isSyncFolderSectionOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {isSyncFolderSectionOpen && (
            <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
              {folderSyncSettings.folders.map(folder => (
                <View key={folder.uri} style={styles.folderRow}>
                  <Ionicons name="folder" size={18} color={colors.primary} />
                  <Text style={[styles.folderName, { color: themeColors.text }]} numberOfLines={1}>{folder.name}</Text>
                  <TouchableOpacity onPress={() => removeSyncFolder(folder.uri)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.folderRow, { justifyContent: 'center', gap: 6, paddingVertical: 12 }]}
                onPress={() => addSyncFolder()}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.settingValue, { fontSize: 13 }]}>{t('settings.addFolder')}</Text>
              </TouchableOpacity>
              {folderSyncPending > 0 && (
                <Text style={{ fontSize: 11, color: themeColors.textMuted, paddingHorizontal: 4, paddingBottom: 4 }}>
                  {tp('settings.filesPending', folderSyncPending)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Creative */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.creativeTools')}</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/creative-hub')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="color-wand-outline" size={18} color="#f97316" />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.creativeToolsRow')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/meme-wall')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="flame-outline" size={18} color="#ef4444" />
              <Text style={[styles.settingText, { color: themeColors.text }]}>MemeWall</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: themeColors.textMuted }}>{t('settings.publicMemes')}</Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Library */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.library')}</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/trash')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="trash-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.trash')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/archive')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="archive-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.archive')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/memories')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="sparkles-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.memories')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/people')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="people-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.people')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/duplicates')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="copy-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.duplicates')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* AI */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.onDeviceAi')}</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.indexedPhotos')}</Text>
              <Text style={{ fontSize: 11, color: themeColors.textMuted }}>
                {aiStatus ? t('settings.indexedOnDevice', { indexed: aiStatus.indexed, total: aiStatus.totalOnDevice }) : t('common.loading')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { paddingVertical: 7, paddingHorizontal: 14, marginTop: 0 }]}
              onPress={handleRunAi}
              disabled={aiProcessing}
            >
              {aiProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={14} color="#fff" />
                  <Text style={styles.upgradeBtnText}>{t('settings.runAi')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Devices & Family */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.devicesFamily')}</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/devices')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="phone-portrait-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.myDevices')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/family')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="people-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.family')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: themeColors.textMuted }}>
                {appUser?.familyId ? t('settings.familyActive') : t('settings.familyNotCreated')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* App */}
        <View style={[styles.card, { backgroundColor: themeColors.bgCard }]}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.app')}</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{ false: '#cbd5e1', true: colors.success }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.language')}</Text>
            <View style={styles.langRow}>
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = preference === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setPreference(opt)}
                    style={[
                      styles.langChip,
                      { borderColor: active ? colors.primary : themeColors.border },
                      active && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.langChipText, { color: active ? '#fff' : themeColors.text }]}>
                      {opt === 'en' ? 'English' : opt === 'sr' ? 'Srpski' : t('settings.languageAuto')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/notifications-settings')}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.notifications')}</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.about')}</Text>
            <Text style={styles.settingValueMuted}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>

        {/* Account deletion (Google Play requirement) */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => router.push('/delete-account' as never /* typed routes regenerate on next expo start */)}>
          <Text style={styles.deleteAccountText}>{t('settings.deleteAccount')}</Text>
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
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 5 },
  langChipText: { fontSize: 11, ...fonts.semibold },
  deleteAccountBtn: { marginHorizontal: 12, marginTop: 8, marginBottom: 24, paddingVertical: 12, alignItems: 'center' },
  deleteAccountText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
