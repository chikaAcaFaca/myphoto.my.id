/**
 * Storage Guard — proactive upsell before the cloud fills up.
 *
 * The whole funnel hinges on never letting a user hit a silent wall. We watch
 * the live quota (appUser.storageUsed / storageLimit, kept fresh by
 * refreshAppUser) and nudge *before* it's full:
 *
 *   - 85% → gentle heads-up ("prostor se puni") — once/day.
 *   - 94% → strong upsell ("ostalo ti je svega N") with the recommended next
 *           plan — once/day.
 *   - 100% → hard block dialog; backups can't continue without space.
 *
 * Each level fires at most once per day (per level) so we inform without
 * nagging. The CTA routes to /pricing. Mount <StorageGuardProvider> once near
 * the app root, inside AuthProvider.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_TIERS } from '@myphoto/shared';
import { useAuth } from './auth-context';
import { getUserTier } from './meme-limits';
import { colors, radius, fonts } from './theme';

type Level = 'ok' | 'warn' | 'critical' | 'full';

const WARN_AT = 0.85;
const CRITICAL_AT = 0.94;

function levelFor(used: number, limit: number): Level {
  if (limit <= 0) return 'ok';
  const r = used / limit;
  if (r >= 1) return 'full';
  if (r >= CRITICAL_AT) return 'critical';
  if (r >= WARN_AT) return 'warn';
  return 'ok';
}

// Smallest paid tier strictly larger than the user's current limit.
function nextTier(storageLimit: number) {
  const current = getUserTier(storageLimit);
  return (
    STORAGE_TIERS.find(
      (t) => t.storageBytes > storageLimit && t.tier > current.tier && t.priceYearly > 0,
    ) || null
  );
}

function fmtGB(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 10) return `${Math.round(gb)} GB`;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function todayKey(level: Level): string {
  const today = new Date().toISOString().slice(0, 10);
  return `@myphoto/storage_guard/${level}/${today}`;
}

const StorageGuardContext = createContext<undefined>(undefined);

export function StorageGuardProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const [shown, setShown] = useState<Level | null>(null);
  const lastHandledRef = useRef<Level | null>(null);

  const used = appUser?.storageUsed ?? 0;
  const limit = appUser?.storageLimit ?? 0;
  const level = levelFor(used, limit);

  useEffect(() => {
    if (!appUser || limit <= 0) return;
    if (level === 'ok') {
      lastHandledRef.current = 'ok';
      return;
    }
    // Avoid re-evaluating the same level repeatedly within a render burst.
    if (lastHandledRef.current === level) return;
    lastHandledRef.current = level;

    (async () => {
      // 'full' always shows (it's a hard block). warn/critical throttle to
      // once per day so we inform without nagging.
      if (level !== 'full') {
        const seen = await AsyncStorage.getItem(todayKey(level));
        if (seen) return;
        await AsyncStorage.setItem(todayKey(level), '1');
      }
      setShown(level);
    })();
  }, [level, appUser, limit]);

  const close = () => setShown(null);
  const goPlans = () => {
    close();
    router.push('/pricing');
  };

  const remaining = Math.max(0, limit - used);
  const suggestion = nextTier(limit);

  let title = '';
  let body = '';
  let cta = 'Pogledaj planove';
  if (shown === 'warn') {
    title = 'Prostor se puni';
    body =
      `Iskoristio si oko 85% prostora. Ostalo ti je još ${fmtGB(remaining)}. ` +
      (suggestion
        ? `Razmisli o planu ${suggestion.name} (${suggestion.storageDisplay}) da ti ne ponestane.`
        : 'Nadogradi plan da ti ne ponestane prostora.');
    cta = 'Pogledaj planove';
  } else if (shown === 'critical') {
    title = 'Skoro je puno!';
    body =
      `Ostalo ti je svega ${fmtGB(remaining)} prostora. Kad se napuni, nove slike, ` +
      `video i fajlovi neće moći da se sačuvaju u cloud.` +
      (suggestion
        ? ` Pređi na ${suggestion.name} (${suggestion.storageDisplay}) za ${suggestion.priceYearly.toFixed(2)} €/god.`
        : '');
    cta = suggestion ? `Nadogradi na ${suggestion.name}` : 'Nadogradi plan';
  } else if (shown === 'full') {
    title = 'Prostor je popunjen';
    body =
      'Tvoj cloud je pun — nove slike, video i fajlovi se trenutno ne mogu ' +
      'čuvati. Nadogradi plan da nastaviš sa bezbednim čuvanjem uspomena.' +
      (suggestion ? ` Predlog: ${suggestion.name} (${suggestion.storageDisplay}).` : '');
    cta = suggestion ? `Nadogradi na ${suggestion.name}` : 'Nadogradi plan';
  }

  return (
    <StorageGuardContext.Provider value={undefined}>
      {children}
      <Modal visible={shown !== null} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={[styles.badge, shown === 'full' && styles.badgeFull, shown === 'critical' && styles.badgeCritical]}>
              <Text style={styles.badgeText}>
                {limit > 0 ? `${Math.min(100, Math.round((used / limit) * 100))}%` : ''}
              </Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goPlans}>
              <Text style={styles.primaryText}>{cta}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
              <Text style={styles.secondaryText}>{shown === 'full' ? 'Kasnije' : 'Ne sada'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </StorageGuardContext.Provider>
  );
}

// Optional hook (currently no imperative API needed — kept for symmetry/future).
export function useStorageGuard() {
  return useContext(StorageGuardContext);
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
    maxWidth: 340,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badgeCritical: { backgroundColor: '#F59E0B' },
  badgeFull: { backgroundColor: '#EF4444' },
  badgeText: { color: '#fff', fontSize: 15, ...fonts.bold },
  title: { fontSize: 18, ...fonts.bold, color: colors.text, textAlign: 'center' },
  body: {
    fontSize: 14,
    ...fonts.medium,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, ...fonts.bold },
  secondaryBtn: { marginTop: 10, paddingVertical: 10 },
  secondaryText: { color: colors.textSecondary, fontSize: 14, ...fonts.medium },
});
