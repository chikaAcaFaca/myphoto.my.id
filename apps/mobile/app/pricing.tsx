import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { STORAGE_TIERS } from '@myphoto/shared';
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

  const handleSelectPlan = useCallback((tier: typeof STORAGE_TIERS[0]) => {
    if (tier.tier === 0) return;
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

      {/* STICKY billing toggle — stays above scroll */}
      <View style={[styles.stickyBar, { backgroundColor: tc.bg, borderBottomColor: tc.border }]}>
        <View style={[styles.billingRow, { backgroundColor: tc.bgInput }]}>
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
            <Text style={[styles.billingText, billing === 'yearly' && { color: '#fff' }]}>Godisnje</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeText}>2 mes. free</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={[styles.trustBadge, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
            <Text style={[styles.trustText, { color: '#16a34a' }]}>Bez AI treninga</Text>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="server" size={12} color="#2563eb" />
            <Text style={[styles.trustText, { color: '#2563eb' }]}>EU Serveri</Text>
          </View>
          <View style={[styles.trustBadge, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="lock-closed" size={12} color="#7c3aed" />
            <Text style={[styles.trustText, { color: '#7c3aed' }]}>GDPR</Text>
          </View>
        </View>

        {/* Tier cards — each shows BOTH prices */}
        {STORAGE_TIERS.map((tier) => {
          const isCurrent = tier.tier === currentTier.tier;
          const isPopular = tier.isPopular;
          const isFree = tier.priceMonthly === 0;
          const monthlyPrice = tier.priceMonthly;
          const yearlyMonthly = tier.priceYearly / 12;
          const savings = isFree ? 0 : Math.round((1 - yearlyMonthly / monthlyPrice) * 100);

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
              {isPopular && !isCurrent && (
                <View style={[styles.badge, { backgroundColor: '#fbbf24' }]}>
                  <Text style={[styles.badgeText, { color: '#92400e' }]}>NAJPOPULARNIJI</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
                  <Text style={styles.badgeText}>VAS PLAN</Text>
                </View>
              )}

              {/* Tier info */}
              <View style={styles.tierTop}>
                <Text style={[styles.tierName, { color: tc.text }]}>{tier.name}</Text>
                <Text style={[styles.tierStorage, { color: tc.text }]}>{tier.storageDisplay}</Text>
              </View>

              {/* Meme limits */}
              <View style={styles.memeRow}>
                <Ionicons name="sparkles" size={12} color="#8b5cf6" />
                <Text style={styles.memeText}>
                  {tier.memesPerDay > 0 ? `${tier.memesPerDay} AI/dan` : '0 AI'} · {isFree ? '0 rucno' : 'neogr. rucno'} · {tier.memesPerMonth}/mes
                </Text>
              </View>

              {/* BOTH prices side by side */}
              {isFree ? (
                <View style={styles.priceSection}>
                  <Text style={[styles.priceMain, { color: tc.text }]}>Besplatno</Text>
                </View>
              ) : (
                <View style={styles.priceSection}>
                  {/* Monthly price */}
                  <View style={[styles.priceBox, billing === 'monthly' && styles.priceBoxActive]}>
                    <Text style={[styles.priceLabel, { color: tc.textMuted }]}>Mesecno</Text>
                    <Text style={[styles.priceAmount, { color: billing === 'monthly' ? tc.primary : tc.text }]}>
                      €{monthlyPrice.toFixed(2)}
                    </Text>
                    <Text style={[styles.priceSub, { color: tc.textMuted }]}>/mes</Text>
                  </View>

                  {/* Yearly price */}
                  <View style={[styles.priceBox, billing === 'yearly' && styles.priceBoxActive]}>
                    <Text style={[styles.priceLabel, { color: tc.textMuted }]}>Godisnje</Text>
                    <Text style={[styles.priceAmount, { color: billing === 'yearly' ? '#16a34a' : tc.text }]}>
                      €{yearlyMonthly.toFixed(2)}
                    </Text>
                    <Text style={[styles.priceSub, { color: tc.textMuted }]}>/mes</Text>
                    {savings > 0 && (
                      <View style={styles.savingsPill}>
                        <Text style={styles.savingsPillText}>-{savings}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Select button */}
              {!isCurrent && !isFree && (
                <TouchableOpacity
                  style={[styles.selectBtn, isPopular && { backgroundColor: tc.primary, borderColor: tc.primary }]}
                  onPress={() => handleSelectPlan(tier)}
                >
                  <Text style={[styles.selectBtnText, isPopular && { color: '#fff' }]}>
                    Izaberi {tier.name}
                  </Text>
                </TouchableOpacity>
              )}
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
            'Meme Kreator i MemeWall',
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
  stickyBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  billingRow: {
    flexDirection: 'row', borderRadius: radius.md, padding: 4,
  },
  billingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: radius.sm,
  },
  billingText: { fontSize: 13, ...fonts.bold, color: colors.textSecondary },
  freeBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  freeText: { fontSize: 9, ...fonts.bold, color: '#16a34a' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 16 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  trustText: { fontSize: 9, ...fonts.semibold },
  tierCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: radius.lg, borderWidth: 1,
    padding: 16, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -10, left: 16, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, zIndex: 1,
  },
  badgeText: { fontSize: 9, ...fonts.bold, color: '#fff' },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tierName: { fontSize: 16, ...fonts.bold },
  tierStorage: { fontSize: 20, ...fonts.extrabold },
  memeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 10 },
  memeText: { fontSize: 10, ...fonts.medium, color: '#8b5cf6' },
  priceSection: { flexDirection: 'row', gap: 10 },
  priceMain: { fontSize: 22, ...fonts.extrabold },
  priceBox: {
    flex: 1, alignItems: 'center', borderRadius: radius.md, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  priceBoxActive: { borderColor: '#3b82f6', borderWidth: 2, backgroundColor: '#eff6ff' },
  priceLabel: { fontSize: 9, ...fonts.bold, letterSpacing: 0.5, marginBottom: 2 },
  priceAmount: { fontSize: 20, ...fonts.extrabold },
  priceSub: { fontSize: 10, ...fonts.medium },
  savingsPill: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  savingsPillText: { fontSize: 9, ...fonts.bold, color: '#16a34a' },
  selectBtn: {
    marginTop: 12, borderRadius: radius.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center',
  },
  selectBtnText: { fontSize: 13, ...fonts.bold, color: colors.primary },
  featuresCard: {
    marginHorizontal: 16, marginTop: 8, borderRadius: radius.lg, padding: 16,
  },
  featuresTitle: { fontSize: 14, ...fonts.bold, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 12, ...fonts.medium },
});
