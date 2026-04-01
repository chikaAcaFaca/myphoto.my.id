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

type Step = 'permissions' | 'backup' | 'done';

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>('permissions');
  const [isLoading, setIsLoading] = useState(false);
  const { updateSettings, startSync } = useSync();

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (status === 'granted') {
        setStep('backup');
      } else {
        Alert.alert(
          'Potrebna dozvola',
          'Bez pristupa slikama ne možemo da napravimo backup. Možete ovo uključiti kasnije u podešavanjima.',
          [
            { text: 'Preskoči', onPress: () => setStep('backup') },
            { text: 'Pokušaj ponovo', onPress: handleRequestPermissions },
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
      await updateSettings({ autoBackup: true, syncMode: 'wifi_only' });
      // Start first sync immediately
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
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressContainer}>
        <View style={[styles.dot, step === 'permissions' && styles.dotActive]} />
        <View style={[styles.dot, step === 'backup' && styles.dotActive]} />
        <View style={[styles.dot, step === 'done' && styles.dotActive]} />
      </View>

      {step === 'permissions' && (
        <View style={styles.stepContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="images" size={48} color="#0ea5e9" />
          </View>
          <Text style={styles.stepTitle}>Pristup slikama</Text>
          <Text style={styles.stepDescription}>
            Dozvolite pristup vašim slikama i video snimcima da bismo mogli da ih sačuvamo u cloudu.
          </Text>
          <Text style={styles.stepNote}>
            Vaše slike ostaju privatne. Ne koristimo ih za AI trening niti ih delimo sa trećim stranama.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRequestPermissions}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Dozvoli pristup</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={() => setStep('backup')}>
            <Text style={styles.skipButtonText}>Preskoči za sada</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'backup' && (
        <View style={styles.stepContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-upload" size={48} color="#10b981" />
          </View>
          <Text style={styles.stepTitle}>Auto-backup</Text>
          <Text style={styles.stepDescription}>
            Uključite automatski backup i vaše slike će se čuvati u cloudu čim se povežete na WiFi.
          </Text>

          {/* Bonus callout */}
          <View style={styles.bonusCard}>
            <Ionicons name="gift" size={24} color="#f59e0b" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bonusTitle}>+1 GB besplatno!</Text>
              <Text style={styles.bonusText}>
                Dobijate dodatnih 1 GB prostora kada uključite auto-backup.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEnableBackup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-done" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Uključi backup (+1 GB)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkipBackup}>
            <Text style={styles.skipButtonText}>Kasnije</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.stepContainer}>
          <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.stepTitle}>Sve je spremno!</Text>
          <Text style={styles.stepDescription}>
            Vaš nalog je aktivan. Slike se automatski čuvaju u MyPhoto, a svi vaši fajlovi su dostupni u MySpace.
          </Text>

          <View style={styles.summaryCard}>
            <SummaryRow icon="images" text="Slike → MyPhoto (galerija, AI pretraga, albumi)" />
            <SummaryRow icon="folder" text="Fajlovi → MySpace (folderi kao na računaru)" />
            <SummaryRow icon="sync" text="Sve se sinhronizuje automatski" />
            <SummaryRow icon="globe" text="Pristup sa web-a, telefona i računara" />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#10b981' }]}
            onPress={handleFinish}
          >
            <Text style={styles.primaryButtonText}>Kreni!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon as any} size={18} color="#0ea5e9" />
      <Text style={styles.summaryText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progressContainer: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingTop: 60, gap: 8,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb',
  },
  dotActive: { backgroundColor: '#0ea5e9', width: 24 },
  stepContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f9ff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12,
  },
  stepDescription: {
    fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 8,
  },
  stepNote: {
    fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18, marginBottom: 32,
  },
  bonusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb',
    borderRadius: 12, padding: 16, marginBottom: 24, width: '100%',
    borderWidth: 1, borderColor: '#fde68a',
  },
  bonusTitle: { fontSize: 15, fontWeight: '700', color: '#92400e' },
  bonusText: { fontSize: 13, color: '#a16207', marginTop: 2 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0ea5e9', height: 52, borderRadius: 12, width: '100%', marginBottom: 12,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipButton: { padding: 12 },
  skipButtonText: { color: '#9ca3af', fontSize: 14 },
  summaryCard: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 16,
    width: '100%', marginBottom: 24, gap: 12,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryText: { fontSize: 13, color: '#374151', marginLeft: 12, flex: 1 },
});
