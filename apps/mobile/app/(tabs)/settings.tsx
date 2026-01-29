import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import { formatBytes } from '@myphoto/shared';

export default function SettingsScreen() {
  const { user, appUser, signOut } = useAuth();
  const { settings, updateSettings } = useSync();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const storageUsed = appUser?.storageUsed || 0;
  const storageLimit = appUser?.storageLimit || 0;
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {appUser?.displayName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{appUser?.displayName || 'User'}</Text>
              <Text style={styles.profileEmail}>{appUser?.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </View>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.card}>
            <View style={styles.storageInfo}>
              <Text style={styles.storageUsed}>
                {formatBytes(storageUsed)} of {formatBytes(storageLimit)}
              </Text>
              <Text style={styles.storagePercent}>{storagePercent.toFixed(1)}% used</Text>
            </View>
            <View style={styles.storageBar}>
              <View
                style={[
                  styles.storageBarFill,
                  { width: `${Math.min(storagePercent, 100)}%` },
                  storagePercent > 90 && styles.storageBarDanger,
                ]}
              />
            </View>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Upgrade Storage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Sync</Text>
          <View style={styles.card}>
            <SettingRow
              icon="cloud-upload-outline"
              title="Auto Backup"
              subtitle="Automatically back up new photos"
              trailing={
                <Switch
                  value={settings.autoBackup}
                  onValueChange={(value) => updateSettings({ autoBackup: value })}
                  trackColor={{ true: '#0ea5e9' }}
                />
              }
            />
            <View style={styles.divider} />
            <SettingRow
              icon="wifi-outline"
              title="Sync Mode"
              subtitle={
                settings.syncMode === 'wifi_only'
                  ? 'WiFi only'
                  : settings.syncMode === 'wifi_and_mobile'
                  ? 'WiFi & Mobile data'
                  : 'Manual only'
              }
              onPress={() => {
                Alert.alert(
                  'Sync Mode',
                  'Choose when to sync your photos',
                  [
                    {
                      text: 'WiFi Only',
                      onPress: () => updateSettings({ syncMode: 'wifi_only' }),
                    },
                    {
                      text: 'WiFi & Mobile',
                      onPress: () => updateSettings({ syncMode: 'wifi_and_mobile' }),
                    },
                    {
                      text: 'Manual Only',
                      onPress: () => updateSettings({ syncMode: 'manual' }),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="image-outline"
              title="Upload Quality"
              subtitle={
                settings.uploadQuality === 'original'
                  ? 'Original'
                  : settings.uploadQuality === 'high'
                  ? 'High quality'
                  : 'Medium quality'
              }
              onPress={() => {
                Alert.alert(
                  'Upload Quality',
                  'Choose the quality for uploaded photos',
                  [
                    {
                      text: 'Original (uses more storage)',
                      onPress: () => updateSettings({ uploadQuality: 'original' }),
                    },
                    {
                      text: 'High Quality',
                      onPress: () => updateSettings({ uploadQuality: 'high' }),
                    },
                    {
                      text: 'Medium (saves storage)',
                      onPress: () => updateSettings({ uploadQuality: 'medium' }),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
            />
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <SettingRow icon="moon-outline" title="Dark Mode" subtitle="Coming soon" />
            <View style={styles.divider} />
            <SettingRow icon="notifications-outline" title="Notifications" subtitle="Manage notifications" />
            <View style={styles.divider} />
            <SettingRow icon="help-circle-outline" title="Help & Support" />
            <View style={styles.divider} />
            <SettingRow icon="document-text-outline" title="Privacy Policy" />
            <View style={styles.divider} />
            <SettingRow icon="information-circle-outline" title="About" subtitle="Version 1.0.0" />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !trailing}
    >
      <Ionicons name={icon as any} size={22} color="#6b7280" style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {trailing || (onPress && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  storageUsed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  storagePercent: {
    fontSize: 14,
    color: '#6b7280',
  },
  storageBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
    borderRadius: 4,
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: '#0ea5e9',
    borderRadius: 4,
  },
  storageBarDanger: {
    backgroundColor: '#ef4444',
  },
  upgradeButton: {
    margin: 16,
    marginTop: 12,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 54,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
