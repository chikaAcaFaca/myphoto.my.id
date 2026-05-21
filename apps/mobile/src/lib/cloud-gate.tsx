/**
 * Cloud Gate
 *
 * Central rule: creative tools only process photos that are protected in the
 * user's cloud. When a photo isn't on the cloud yet, the reason is always one
 * of three, and we turn each into an opportunity:
 *
 *   1. Folder isn't synced / user never backed it up  ┐ same action: back this
 *   3. Upload still in progress                        ┘ photo up now, then run
 *   2. Storage is full (free or paid)  → the one hard block: a subtle nudge to
 *      upgrade (without space we literally can't protect the original).
 *
 * This keeps originals safe before we transform them, fills cloud storage, and
 * gently funnels users toward a larger plan. Mount <CloudGateProvider> once and
 * call useCloudGate().ensureOnCloud(...) from any tool before processing.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from './auth-context';
import { useSync } from './sync-context';
import { colors, radius, fonts } from './theme';

export interface CloudGateParams {
  /** MediaLibrary asset id of a device photo. Omit for images with no cloud
   *  identity (e.g. a freshly picked file) — those are allowed through. */
  assetId?: string;
  /** Whether the photo is already backed up to the cloud. */
  isUploaded?: boolean;
}

interface CloudGateContextType {
  /** Resolves true when the photo is protected in the cloud and the tool may
   *  proceed. Otherwise shows the appropriate dialog/overlay and resolves
   *  false (the caller should abort). */
  ensureOnCloud: (params: CloudGateParams) => Promise<boolean>;
}

const CloudGateContext = createContext<CloudGateContextType | undefined>(undefined);

export function CloudGateProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const { uploadSingleAsset } = useSync();
  const [uploading, setUploading] = useState(false);

  const ensureOnCloud = useCallback(
    async ({ assetId, isUploaded }: CloudGateParams): Promise<boolean> => {
      // Already protected in the cloud → process right away.
      if (isUploaded) return true;
      // No cloud identity to funnel (e.g. a freshly picked image) → allow.
      if (!assetId) return true;

      // Reason #2 — storage full → the one hard block. We can't protect the
      // original without space, so we subtly point to plans instead of saying
      // "you didn't pay".
      const storageFull =
        !!appUser && appUser.storageLimit > 0 && appUser.storageUsed >= appUser.storageLimit;
      if (storageFull) {
        return new Promise<boolean>((resolve) => {
          Alert.alert(
            'Prostor je popunjen',
            'Da bismo obradili sliku, prvo je bezbedno čuvamo u tvom cloud-u — ali ' +
              'tvoj prostor je pun. Nadogradi plan da zaštitiš i obrađuješ slike.',
            [
              { text: 'Ne sada', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Pogledaj planove',
                onPress: () => {
                  resolve(false);
                  router.push('/pricing');
                },
              },
            ],
          );
        });
      }

      // Reasons #1 / #3 — not on cloud but there's room. Ask, then back this
      // photo up now and proceed.
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Zaštitimo original',
          'Da bismo obradili sliku, prvo bezbedno čuvamo originalnu sliku u tvoj ' +
            'cloud — tako je original zaštićen pre obrade.',
          [
            { text: 'Otkaži', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Sačuvaj i obradi', onPress: () => resolve(true) },
          ],
        );
      });
      if (!confirmed) return false;

      setUploading(true);
      let ok = false;
      try {
        ok = await uploadSingleAsset(assetId);
      } finally {
        setUploading(false);
      }
      if (!ok) {
        Alert.alert(
          'Nije uspelo',
          'Slika nije mogla da se sačuva u cloud. Proveri internet i pokušaj ponovo.',
        );
        return false;
      }
      return true;
    },
    [appUser, uploadSingleAsset],
  );

  return (
    <CloudGateContext.Provider value={{ ensureOnCloud }}>
      {children}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Čuvamo tvoju sliku…</Text>
            <Text style={styles.subtitle}>
              Bezbedno je smeštamo u tvoj cloud pre obrade.
            </Text>
          </View>
        </View>
      </Modal>
    </CloudGateContext.Provider>
  );
}

export function useCloudGate(): CloudGateContextType {
  const ctx = useContext(CloudGateContext);
  if (!ctx) throw new Error('useCloudGate must be used within a CloudGateProvider');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  title: { fontSize: 16, ...fonts.bold, color: colors.text, marginTop: 16, textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    ...fonts.medium,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});
