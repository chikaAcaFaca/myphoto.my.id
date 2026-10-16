import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSync } from '@/lib/sync-context';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { fonts } from '@/lib/theme';

type Step = 'permissions' | 'backup' | 'done';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('permissions');
  const [isLoading, setIsLoading] = useState(false);
  const { updateSettings, startSync } = useSync();
  const { t } = useT();
  const { colors: tc } = useTheme();

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status === 'granted') {
        setStep('backup');
      } else {
        Alert.alert(
          t('onboarding.permissionNeededTitle'),
          t('onboarding.permissionNeededMessage'),
          [
            { text: t('common.skip'), onPress: () => setStep('backup') },
            { text: t('common.retry'), onPress: handleRequestPermissions },
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBackup = async () => {
    setIsLoading(true);
    try {
      // Auto-select Camera folder by default + enable backup
      const defaultFolders = ['Camera', 'DCIM'];
      await updateSettings({
        autoBackup: true,
        syncMode: 'wifi_only',
        backupFolders: [], // empty = all folders (Camera included)
      });
      // Start first sync immediately in background
      startSync();
      setStep('done');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBackup = () => {
    setStep('done');
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('@myphoto/onboarding_complete', 'true');
    router.replace('/(tabs)/meme-wall-tab');
  };

  const dot = (active: boolean) => [
    styles.dot,
    { backgroundColor: active ? tc.primary : tc.border },
    active && styles.dotActive,
  ];
  const iconCircle = [styles.iconCircle, { backgroundColor: tc.primaryLight }];
  const primaryBtn = [styles.primaryButton, { backgroundColor: tc.primary }];

  return (
    <View style={[styles.container, { backgroundColor: tc.bg }]}>
      {/* Progress dots */}
      <View style={styles.progressContainer}>
        <View style={dot(step === 'permissions')} />
        <View style={dot(step === 'backup')} />
        <View style={dot(step === 'done')} />
      </View>

      {step === 'permissions' && (
        <View style={styles.stepContainer}>
          <View style={iconCircle}>
            <Ionicons name="images" size={44} color={tc.primary} />
          </View>
          <Text style={[styles.stepTitle, { color: tc.text }]}>{t('onboarding.permissionsTitle')}</Text>
          <Text style={[styles.stepDescription, { color: tc.textSecondary }]}>
            {t('onboarding.permissionsDescription')}
          </Text>
          <Text style={[styles.stepNote, { color: tc.textMuted }]}>
            {t('onboarding.permissionsNote')}
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={primaryBtn}
            onPress={handleRequestPermissions}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>{t('onboarding.allowAccess')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.skipButton} onPress={() => setStep('backup')}>
            <Text style={[styles.skipButtonText, { color: tc.textSecondary }]}>{t('onboarding.skipForNow')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'backup' && (
        <View style={styles.stepContainer}>
          <View style={iconCircle}>
            <Ionicons name="cloud-upload" size={44} color={tc.primary} />
          </View>
          <Text style={[styles.stepTitle, { color: tc.text }]}>{t('onboarding.backupTitle')}</Text>
          <Text style={[styles.stepDescription, { color: tc.textSecondary }]}>
            {t('onboarding.backupDescription')}
          </Text>

          {/* Bonus callout */}
          <View style={[styles.bonusCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
            <View style={[styles.bonusIcon, { backgroundColor: tc.primaryLight }]}>
              <Ionicons name="gift" size={20} color={tc.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.bonusTitle, { color: tc.text }]}>{t('onboarding.bonusTitle')}</Text>
              <Text style={[styles.bonusText, { color: tc.textSecondary }]}>
                {t('onboarding.bonusText')}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={primaryBtn}
            onPress={handleEnableBackup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-done" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>{t('onboarding.enableBackup')}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button" style={styles.skipButton} onPress={handleSkipBackup}>
            <Text style={[styles.skipButtonText, { color: tc.textSecondary }]}>{t('onboarding.later')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.stepContainer}>
          <View style={iconCircle}>
            <Ionicons name="checkmark-circle" size={56} color={tc.success} />
          </View>
          <Text style={[styles.stepTitle, { color: tc.text }]}>{t('onboarding.doneTitle')}</Text>
          <Text style={[styles.stepDescription, { color: tc.textSecondary }]}>
            {t('onboarding.doneDescription')}
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
            <SummaryRow icon="images" text={t('onboarding.summaryPhotos')} />
            <SummaryRow icon="folder" text={t('onboarding.summaryFiles')} />
            <SummaryRow icon="sync" text={t('onboarding.summarySync')} />
            <SummaryRow icon="globe" text={t('onboarding.summaryAccess')} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            style={primaryBtn}
            onPress={handleFinish}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.start')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon as any} size={18} color={tc.primary} />
      <Text style={[styles.summaryText, { color: tc.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingTop: 60, gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  stepContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  stepTitle: {
    fontSize: 30, letterSpacing: -0.6, lineHeight: 36, textAlign: 'center', marginBottom: 12,
    ...fonts.display,
  },
  stepDescription: {
    fontSize: 16, textAlign: 'center', lineHeight: 23, marginBottom: 8,
  },
  stepNote: {
    fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 32,
  },
  bonusCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 16, marginBottom: 24, width: '100%',
  },
  bonusIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bonusTitle: { fontSize: 15, fontWeight: '700' },
  bonusText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26, width: '100%', marginBottom: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipButton: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  skipButtonText: { fontSize: 14, fontWeight: '600' },
  summaryCard: {
    borderRadius: 20, borderWidth: 1, padding: 16,
    width: '100%', marginTop: 16, marginBottom: 24, gap: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryText: { fontSize: 14, marginLeft: 12, flex: 1 },
});
