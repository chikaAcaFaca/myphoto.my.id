import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { STORAGE_TIERS, BILLING_PERIODS } from '@myphoto/shared';
import { useAuth } from '@/lib/auth-context';
import { getUserTier } from '@/lib/meme-limits';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

type BillingPeriod = 'monthly' | 'yearly';

export default function PricingScreen() {
  const { colors: tc } = useTheme();
  const { appUser } = useAuth();
  const [billing, setBilling] = useState<BillingPeriod>('yearly');
  const currentTier = getUserTier(appUser?.storageLimit || 0);

  const getPrice = (tier: typeof STORAGE_TIERS[0]) => {
    if (tier.priceMonthly === 0) return 'Besplatno';
    if (billing === 'yearly') {
      return `€${(tier.priceYearly / 12).toFixed(2)}/mes`;
    }
    return `€${tier.priceMonthly.toFixed(2)}/mes`;
  };

  const getYearlyTotal = (tier: typeof STORAGE_TIERS[0]) => {
    if (billing !== 'yearly' || tier.priceMonthly === 0) return null;
    return `€${tier.priceYearly.toFixed(2)}/god`;
  };

  const getSavings = (tier: typeof STORAGE_TIERS[0]) => {
    if (billing !== 'yearly' || tier.priceMonthly === 0) return null;
    const monthlyTotal = tier.priceMonthly * 12;
    const savings = Math.round((1 - tier.priceYearly / monthlyTotal) * 100);
    return savings > 0 ? `-${savings}%` : null;
  };

  const handleSelectPlan = useCallback((tier: typeof STORAGE_TIERS[0]) => {
    if (tier.tier === 0) return; // Already free
    Linking.openURL(`${API_URL}/checkout?tier=${tier.tier}&period=${billing}`);
  }, [billing]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tc.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Izaberite plan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Billing toggle */}
        <View style={styles.billingRow}>
          <TouchableOpacity
            style={[styles.billingBtn, billing === 'monthly' && { backgroundColor: tc.primary }]}
            onPress={() => setBilling('monthly')}
          >
            <Text style={[styles.billingText, billing === 'monthly' && { color: '#fff' }]}>Mesecno</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingBtn, billing === 'yearly' && { backgroundColor: tc.primary }]}
            onPress={() => setBilling('yearly')}
          >
            <Text style={[styles.billingText, billing === 'yearly' && { color: '#fff' }]}>
              Godisnje
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>2 mes. free</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={[styles.trustBadge, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
            <Text style={[styles.trustText, { color: '#16a34a' }]}>Ne koristimo slike za AI</Text>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="server" size={12} color="#2563eb" />
            <Text style={[styles.trustText, { color: '#2563eb' }]}>EU Serveri</Text>
          </View>
        </View>

        {/* Tier cards */}
        {STORAGE_TIERS.map((tier) => {
          const isCurrent = tier.tier === currentTier.tier;
          const isPopular = tier.isPopular;
          const savings = getSavings(tier);
          const yearlyTotal = getYearlyTotal(tier);
          const isFree = tier.priceMonthly === 0;

          return (
            <View
              key={tier.tier}
              style={[
                styles.tierCard,
                { backgroundColor: tc.bgCard, borderColor: tc.border },
                isPopular && { borderColor: tc.primary, borderWidth: 2 },
                isCurrent && { borderColor: '#22c55e', borderWidth: 2 },
              ]}
            >
              {/* Badges */}
              {isPopular && !isCurrent && (
                <View style={[styles.badge, { backgroundColor: '#fbbf24' }]}>
                  <Text style={styles.badgeText}>NAJPOPULARNIJI</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
                  <Text style={styles.badgeText}>VAS PLAN</Text>
                </View>
              )}

              <View style={styles.tierRow}>
                {/* Left: name + storage */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierName, { color: tc.text }]}>{tier.name}</Text>
                  <Text style={[styles.tierStorage, { color: tc.textSecondary }]}>{tier.storageDisplay}</Text>
                  <View style={styles.memeInfo}>
                    <Ionicons name="sparkles" size={11} color="#8b5cf6" />
                    <Text style={styles.memeInfoText}>
                      {tier.memesPerDay > 0
                        ? `${tier.memesPerDay} AI/dan · ${isFree ? '0 rucno' : 'neogr. rucno'}`
                        : `${tier.memesPerDay} AI · 0 rucno`}
                    </Text>
                  </View>
                </View>

                {/* Right: price + button */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.tierPrice, { color: tc.text }]}>{getPrice(tier)}</Text>
                  {yearlyTotal && (
                    <Text style={[styles.tierYearly, { color: tc.textMuted }]}>{yearlyTotal}</Text>
                  )}
                  {savings && (
                    <View style={[styles.savingsPill, { backgroundColor: '#dcfce7' }]}>
                      <Text style={styles.savingsPillText}>{savings}</Text>
                    </View>
                  )}
                  {!isCurrent && !isFree && (
                    <TouchableOpacity
                      style={[styles.selectBtn, isPopular && { backgroundColor: tc.primary }]}
                      onPress={() => handleSelectPlan(tier)}
                    >
                      <Text style={[styles.selectBtnText, isPopular && { color: '#fff' }]}>Izaberi</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: tc.bgCard }]}>
          <Text style={[styles.featuresTitle, { color: tc.text }]}>Svi planovi ukljucuju</Text>
          {[
            'Auto-backup slika i videa',
            'AI pretraga i auto-tagging',
            'Original kvalitet, bez kompresije',
            'Deljenje albuma i foldera',
            'EU serveri, GDPR zastita',
            'Otkažite bilo kada',
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={[styles.featureText, { color: tc.textSecondary }]}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12, paddingTop: Platform.OS === 'ios' ? 8 : 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, ...fonts.extrabold, color: '#fff' },
  billingRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: '#f1f5f9', borderRadius: radius.md, padding: 4,
  },
  billingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: radius.sm,
  },
  billingText: { fontSize: 13, ...fonts.bold, color: colors.textSecondary },
  savingsBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  savingsText: { fontSize: 9, ...fonts.bold, color: '#16a34a' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  trustText: { fontSize: 10, ...fonts.semibold },
  tierCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: radius.lg, borderWidth: 1,
    padding: 16, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -10, left: 16, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 9, ...fonts.bold, color: '#fff' },
  tierRow: { flexDirection: 'row', alignItems: 'center' },
  tierName: { fontSize: 16, ...fonts.bold },
  tierStorage: { fontSize: 22, ...fonts.extrabold, marginTop: 2 },
  memeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  memeInfoText: { fontSize: 10, ...fonts.medium, color: '#8b5cf6' },
  tierPrice: { fontSize: 18, ...fonts.bold },
  tierYearly: { fontSize: 11, marginTop: 2 },
  savingsPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  savingsPillText: { fontSize: 10, ...fonts.bold, color: '#16a34a' },
  selectBtn: {
    marginTop: 8, borderRadius: radius.sm, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.primary,
  },
  selectBtnText: { fontSize: 12, ...fonts.bold, color: colors.primary },
  featuresCard: {
    marginHorizontal: 16, marginTop: 8, borderRadius: radius.lg, padding: 16,
  },
  featuresTitle: { fontSize: 14, ...fonts.bold, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 12, ...fonts.medium },
});
