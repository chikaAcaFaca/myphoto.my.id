import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { InviteCard } from '@/components/InviteCard';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { fonts, memeFlame } from '@/lib/theme';
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
  const tc = themeColors;
  const rowBorder = { borderBottomColor: tc.border };
  const card = [styles.card, { backgroundColor: tc.bgCard, borderColor: tc.border }];
  const switchTrack = { false: tc.border, true: tc.primary };
  const valueStyle = [styles.settingValue, { color: tc.primary }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }]} edges={['top']}>
      <ScreenHeader title={t('nav.tabs.me')} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile */}
        <View style={card}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: tc.primary }]}>
              <Text style={styles.avatarText}>
                {(appUser?.displayName || user?.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>{appUser?.displayName || t('common.user')}</Text>
              <Text style={[styles.profileEmail, { color: tc.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <InviteCard />

        {/* Storage */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.storage')}</Text>
          <View style={styles.storageRow}>
            <Text style={[styles.storageUsed, { color: themeColors.text }]}>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</Text>
            <Text style={[styles.storagePercent, { color: storagePercent > 80 ? tc.error : tc.primary }]}>{storagePercent}%</Text>
          </View>
          <View style={[styles.storageBar, { backgroundColor: tc.bgInput }]}>
            <View style={[styles.storageFill, { backgroundColor: storagePercent > 80 ? tc.error : tc.primary, width: `${Math.min(storagePercent, 100)}%` }]} />
          </View>
          <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: tc.primary }]} activeOpacity={0.8} onPress={() => router.push('/pricing')}>
            <Ionicons name="arrow-up-circle" size={16} color="#fff" />
            <Text style={styles.upgradeBtnText}>{t('settings.upgradeStorage')}</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Sync */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.backupSync')}</Text>
          <View style={[styles.settingRow, rowBorder]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.autoBackup')}</Text>
            <Switch
              value={settings.autoBackup}
              onValueChange={(v) => updateSettings({ autoBackup: v })}
              trackColor={switchTrack}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.settingRow, rowBorder]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.wifiOnly')}</Text>
            <Switch
              value={settings.syncMode === 'wifi_only'}
              onValueChange={(v) => updateSettings({ syncMode: v ? 'wifi_only' : 'wifi_and_mobile' })}
              trackColor={switchTrack}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity style={[styles.settingRow, rowBorder]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.uploadQuality')}</Text>
            <Text style={valueStyle}>{settings.uploadQuality === 'original' ? t('settings.qualityOriginal') : settings.uploadQuality === 'high' ? t('settings.qualityHigh') : t('settings.qualityMedium')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => { setIsFolderSectionOpen(!isFolderSectionOpen); refreshDeviceAlbums(); }}
          >
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.backupFolders')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={valueStyle}>
                {(settings.backupFolders || []).length === 0 ? t('settings.allFolders') : `${settings.backupFolders.length}`}
              </Text>
              <Ionicons name={isFolderSectionOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={tc.primary} />
            </View>
          </TouchableOpacity>

          {isFolderSectionOpen && (
            <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
              {isLoadingAlbums ? (
                <Text style={[styles.folderLoading, { color: tc.textMuted }]}>{t('common.loading')}</Text>
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
                      color={isSelected ? tc.primary : tc.textMuted}
                    />
                    <Text style={[styles.folderName, { color: tc.text }]}>{album.title}</Text>
                    <Text style={[styles.folderCount, { color: tc.textSecondary }]}>{album.assetCount}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* MySpace Folder Sync */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.folderSync')}</Text>
          <View style={[styles.settingRow, rowBorder]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.syncFoldersToCloud')}</Text>
            <Switch
              value={folderSyncSettings.enabled}
              onValueChange={(v) => toggleFolderSync(v)}
              trackColor={switchTrack}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity
            style={[styles.settingRow, rowBorder, { borderBottomWidth: folderSyncSettings.folders.length > 0 ? 1 : 0 }]}
            onPress={() => setIsSyncFolderSectionOpen(!isSyncFolderSectionOpen)}
          >
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.syncFolders')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={valueStyle}>
                {folderSyncSettings.folders.length === 0 ? t('settings.noFolders') : `${folderSyncSettings.folders.length}`}
              </Text>
              <Ionicons name={isSyncFolderSectionOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={tc.primary} />
            </View>
          </TouchableOpacity>

          {isSyncFolderSectionOpen && (
            <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
              {folderSyncSettings.folders.map(folder => (
                <View key={folder.uri} style={styles.folderRow}>
                  <Ionicons name="folder" size={18} color={tc.primary} />
                  <Text style={[styles.folderName, { color: themeColors.text }]} numberOfLines={1}>{folder.name}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.remove')} style={styles.removeBtn} onPress={() => removeSyncFolder(folder.uri)}>
                    <Ionicons name="close-circle" size={20} color={tc.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.folderRow, { justifyContent: 'center', gap: 6, paddingVertical: 12 }]}
                onPress={() => addSyncFolder()}
              >
                <Ionicons name="add-circle-outline" size={20} color={tc.primary} />
                <Text style={[valueStyle, { fontSize: 14 }]}>{t('settings.addFolder')}</Text>
              </TouchableOpacity>
              {folderSyncPending > 0 && (
                <Text style={{ fontSize: 12, color: themeColors.textSecondary, paddingHorizontal: 4, paddingBottom: 4 }}>
                  {tp('settings.filesPending', folderSyncPending)}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Creative */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.creativeTools')}</Text>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/creative-hub')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="color-wand-outline" size={18} color={tc.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.creativeToolsRow')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/meme-wall')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="flame-outline" size={18} color={memeFlame} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>MemeWall</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>{t('settings.publicMemes')}</Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Library */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.library')}</Text>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/trash')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="trash-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.trash')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/archive')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="archive-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.archive')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/memories')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="sparkles-outline" size={18} color={themeColors.text} />
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.memories')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/people')}>
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
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.onDeviceAi')}</Text>
          <View style={[styles.settingRow, rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.indexedPhotos')}</Text>
              <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>
                {aiStatus ? t('settings.indexedOnDevice', { indexed: aiStatus.indexed, total: aiStatus.totalOnDevice }) : t('common.loading')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: tc.primary, height: 44, paddingHorizontal: 16, marginTop: 0 }]}
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
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.devicesFamily')}</Text>
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/devices')}>
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
              <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>
                {appUser?.familyId ? t('settings.familyActive') : t('settings.familyNotCreated')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* App */}
        <View style={card}>
          <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>{t('settings.app')}</Text>
          <View style={[styles.settingRow, rowBorder]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.darkMode')}</Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={switchTrack}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.settingRow, rowBorder]}>
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
                      { borderColor: active ? tc.primary : tc.border },
                      active && { backgroundColor: tc.primary },
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
          <TouchableOpacity style={[styles.settingRow, rowBorder]} onPress={() => router.push('/notifications-settings')}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.notifications')}</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>{t('settings.about')}</Text>
            <Text style={[styles.settingValueMuted, { color: tc.textMuted }]}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: tc.bgCard, borderColor: tc.border }]} onPress={handleSignOut}>
          <Text style={[styles.signOutText, { color: tc.error }]}>{t('settings.signOut')}</Text>
        </TouchableOpacity>

        {/* Account deletion (Google Play requirement) */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => router.push('/delete-account' as never /* typed routes regenerate on next expo start */)}>
          <Text style={[styles.deleteAccountText, { color: tc.textSecondary }]}>{t('settings.deleteAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: {
    borderRadius: 20, borderWidth: 1, marginHorizontal: 16, marginTop: 12, padding: 16,
  },
  sectionLabel: { fontSize: 11, ...fonts.bold, letterSpacing: 1, marginBottom: 6 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, ...fonts.display },
  profileName: { fontSize: 18, ...fonts.display },
  profileEmail: { fontSize: 13, marginTop: 1 },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  storageUsed: { fontSize: 14, ...fonts.bold },
  storagePercent: { fontSize: 14, ...fonts.bold },
  storageBar: { height: 8, borderRadius: 4, marginVertical: 10, overflow: 'hidden' },
  storageFill: { height: '100%', borderRadius: 4 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 24, height: 48, marginTop: 4,
  },
  upgradeBtnText: { color: '#fff', fontSize: 14, ...fonts.bold },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 52, paddingVertical: 8, borderBottomWidth: 1,
  },
  settingText: { fontSize: 15, ...fonts.medium },
  settingValue: { fontSize: 14, ...fonts.semibold },
  settingValueMuted: { fontSize: 13 },
  folderLoading: { fontSize: 13, padding: 8 },
  folderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 44, paddingHorizontal: 4,
  },
  folderName: { flex: 1, fontSize: 14, ...fonts.medium },
  folderCount: { fontSize: 12 },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: {
    marginHorizontal: 16, marginTop: 20, borderWidth: 1, borderRadius: 26,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { fontSize: 15, ...fonts.bold },
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  langChipText: { fontSize: 13, ...fonts.semibold },
  deleteAccountBtn: { marginHorizontal: 16, marginTop: 8, marginBottom: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteAccountText: { fontSize: 13, textDecorationLine: 'underline' },
});
