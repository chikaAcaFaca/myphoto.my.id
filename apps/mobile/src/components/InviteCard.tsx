import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  maxReferrals: number;
  bonusFormatted: string;
  referralLink: string;
}

// Each app opens its own contact picker with the message prefilled; if the
// app isn't installed we fall back to the system share sheet.
const APPS = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', icon: 'logo-whatsapp', url: (m: string) => `whatsapp://send?text=${encodeURIComponent(m)}` },
  { key: 'viber', label: 'Viber', color: '#7360F2', icon: 'call', url: (m: string) => `viber://forward?text=${encodeURIComponent(m)}` },
  { key: 'telegram', label: 'Telegram', color: '#2AABEE', icon: 'paper-plane', url: (m: string) => `tg://msg?text=${encodeURIComponent(m)}` },
] as const;

export function InviteCard() {
  const { user, getToken } = useAuth();
  const { colors: tc } = useTheme();
  const { t } = useT();
  const [stats, setStats] = useState<ReferralStats | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/referral/stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) setStats(await res.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [user, getToken]);

  const message = stats ? t('settings.invite.message', { link: stats.referralLink }) : '';

  const shareVia = useCallback(async (url?: string) => {
    if (!message) return;
    if (url) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // App not installed: fall through to the share sheet.
      }
    }
    Share.share({ message }).catch(() => {});
  }, [message]);

  const copy = useCallback(async () => {
    if (!stats) return;
    await Clipboard.setStringAsync(stats.referralLink);
    Alert.alert(t('settings.invite.copied'));
  }, [stats, t]);

  if (!stats) return null;

  const pct = stats.maxReferrals > 0 ? Math.min(100, (stats.referralCount / stats.maxReferrals) * 100) : 0;

  return (
    <View style={[styles.card, { backgroundColor: tc.primaryLight }]}>
      <View style={styles.head}>
        <View style={[styles.giftIcon, { backgroundColor: tc.primary }]}>
          <Ionicons name="gift-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: tc.text }]}>{t('settings.invite.title')}</Text>
          <Text style={[styles.body, { color: tc.textSecondary }]}>{t('settings.invite.body')}</Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <View style={[styles.track, { backgroundColor: tc.border }]}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: tc.primary }]} />
        </View>
        <Text style={[styles.progress, { color: tc.textSecondary }]}>
          {t('settings.invite.progress', { count: stats.referralCount, max: stats.maxReferrals, bonus: stats.bonusFormatted })}
        </Text>
      </View>

      <View style={[styles.linkRow, { backgroundColor: tc.bgCard }]}>
        <Text style={[styles.link, { color: tc.textSecondary }]} numberOfLines={1}>
          {stats.referralLink.replace(/^https?:\/\//, '')}
        </Text>
        <TouchableOpacity accessibilityRole="button" onPress={copy} style={[styles.copyBtn, { backgroundColor: tc.text }]}>
          <Text style={[styles.copyText, { color: tc.bg }]}>{t('settings.invite.copy')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.apps}>
        {APPS.map((app) => (
          <TouchableOpacity
            key={app.key}
            accessibilityRole="button"
            accessibilityLabel={app.label}
            onPress={() => shareVia(app.url(message))}
            style={[styles.appBtn, { backgroundColor: tc.bgCard }]}
          >
            <View style={[styles.appDot, { backgroundColor: app.color }]}>
              <Ionicons name={app.icon} size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.appLabel, { color: tc.text }]}>{app.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => shareVia()}
          style={[styles.appBtn, { backgroundColor: tc.bgCard }]}
        >
          <View style={[styles.appDot, { backgroundColor: tc.textMuted }]}>
            <Ionicons name="share-social" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.appLabel, { color: tc.text }]}>{t('settings.invite.more')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 8, padding: 18, borderRadius: 24, gap: 14 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  giftIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%' },
  progress: { fontSize: 12 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingLeft: 14, borderRadius: 14 },
  link: { flex: 1, fontSize: 14 },
  copyBtn: { height: 36, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copyText: { fontSize: 13, fontWeight: '600' },
  apps: { flexDirection: 'row', gap: 8 },
  appBtn: { flex: 1, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 },
  appDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  appLabel: { fontSize: 12, fontWeight: '600' },
});
