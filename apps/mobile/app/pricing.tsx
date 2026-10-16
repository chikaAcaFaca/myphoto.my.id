import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  STORAGE_TIERS,
  resolveTierPeriod,
  getTierPrice,
  getTierMonthlyEquivalent,
  getTierSavingsPercent,
  type BillingPeriod as TierPeriod,
} from '@myphoto/shared';
import { useAuth } from '@/lib/auth-context';
import { getUserTier } from '@/lib/meme-limits';
import { fonts, memeFlame } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { CAN_SELL_IN_APP } from '@/lib/distribution';
import { formatBytes } from '@myphoto/shared';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

// 'short' = the shortest period each plan is sold in (monthly for large
// plans, 3 or 6 months for small ones — see getTierPeriods in shared).
type BillingPeriod = 'short' | 'yearly';

export default function PricingScreen() {
  return CAN_SELL_IN_APP ? <StorePricingScreen /> : <PlanInfoScreen />;
}

/**
 * Google Play build: shows the user's plan and usage only. No prices, no
 * buttons, no links toward a purchase — see src/lib/distribution.ts.
 */
function PlanInfoScreen() {
  const { colors: tc } = useTheme();
  const { appUser } = useAuth();
  const { t } = useT();
  const currentTier = getUserTier(appUser?.storageLimit || 0);
  const used = appUser?.storageUsed || 0;
  const limit = appUser?.storageLimit || 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('pricing.yourPlan')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={[styles.tierCard, { backgroundColor: tc.bgCard, borderColor: tc.primary, borderWidth: 2, marginHorizontal: 0 }]}>
          <View style={styles.tierTop}>
            <Text style={[styles.tierName, { color: tc.text }]}>{currentTier.name}</Text>
            <Text style={[styles.tierStorage, { color: tc.text }]}>{currentTier.storageDisplay}</Text>
          </View>
          <Text style={{ color: tc.textSecondary, marginTop: 8 }}>
            {t('pricing.usedOf', { used: formatBytes(used), limit: formatBytes(limit) })}
          </Text>
        </View>
        <Text style={{ color: tc.textSecondary, fontSize: 13, lineHeight: 19 }}>
          {t('pricing.manageOnWeb')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StorePricingScreen() {
  const { colors: tc, isDark } = useTheme();
  const { appUser } = useAuth();
  const [billing, setBilling] = useState<BillingPeriod>('yearly');
  const { t } = useT();
  const currentTier = getUserTier(appUser?.storageLimit || 0);
  const periodLabel = (p: TierPeriod) =>
    p === 'monthly'
      ? t('pricing.monthly')
      : p === 'quarterly'
        ? t('pricing.periodQuarterly')
        : p === 'semiannual'
          ? t('pricing.periodSemiannual')
          : t('pricing.yearly');

  const handleSelectPlan = useCallback((tier: typeof STORAGE_TIERS[0]) => {
    if (tier.tier === 0) return;
    const period = billing === 'yearly' ? 'yearly' : resolveTierPeriod(tier, 'monthly');
    Linking.openURL(`${API_URL}/checkout?tier=${tier.tier}&period=${period}`);
  }, [billing]);

  const segSelected = { backgroundColor: isDark ? tc.bgCard : '#FFFFFF', ...styles.segSelected };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('pricing.choosePlan')} />

      {/* STICKY billing toggle — stays above scroll */}
      <View style={[styles.stickyBar, { backgroundColor: tc.bg }]}>
        <View accessibilityRole="tablist" style={[styles.billingRow, { backgroundColor: tc.bgInput }]}>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: billing === 'short' }}
            style={[styles.billingBtn, billing === 'short' && segSelected]}
            onPress={() => setBilling('short')}
          >
            <Text
              style={[
                styles.billingText,
                { color: billing === 'short' ? tc.text : tc.textSecondary, fontWeight: billing === 'short' ? '700' : '600' },
              ]}
            >
              {t('pricing.shorter')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: billing === 'yearly' }}
            style={[styles.billingBtn, billing === 'yearly' && segSelected]}
            onPress={() => setBilling('yearly')}
          >
            <Text
              style={[
                styles.billingText,
                { color: billing === 'yearly' ? tc.text : tc.textSecondary, fontWeight: billing === 'yearly' ? '700' : '600' },
              ]}
            >
              {t('pricing.yearly')}
            </Text>
            <View style={[styles.freeBadge, { backgroundColor: tc.primaryLight }]}>
              <Text style={[styles.freeText, { color: tc.primary }]}>{t('pricing.twoMonthsFree')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
        {/* Trust badges */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield-checkmark' as const, label: t('pricing.noAiTraining') },
            { icon: 'server' as const, label: t('pricing.euServers') },
            { icon: 'lock-closed' as const, label: 'GDPR' },
          ].map((b) => (
            <View key={b.label} style={[styles.trustBadge, { backgroundColor: tc.bgInput }]}>
              <Ionicons name={b.icon} size={12} color={tc.textSecondary} />
              <Text style={[styles.trustText, { color: tc.textSecondary }]}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Tier cards — each shows BOTH prices */}
        {STORAGE_TIERS.map((tier) => {
          const isCurrent = tier.tier === currentTier.tier;
          const isPopular = tier.isPopular;
          const isFree = tier.tier === 0;
          const shortPeriod = resolveTierPeriod(tier, 'monthly');
          const hasShort = !isFree && shortPeriod !== 'yearly';
          const shortTotal = getTierPrice(tier, shortPeriod);
          const yearlyMonthly = getTierMonthlyEquivalent(tier, 'yearly');
          const savings = isFree ? 0 : getTierSavingsPercent(tier, 'yearly');

          return (
            <View
              key={tier.tier}
              style={[
                styles.tierCard,
                { backgroundColor: tc.bgCard, borderColor: tc.border },
                isPopular && { borderColor: tc.primary, borderWidth: 2 },
                isCurrent && { borderColor: tc.success, borderWidth: 2 },
              ]}
            >
              {isPopular && !isCurrent && (
                <View style={[styles.badge, { backgroundColor: tc.primary }]}>
                  <Text style={styles.badgeText}>{t('pricing.mostPopular')}</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.badge, { backgroundColor: tc.success }]}>
                  <Text style={styles.badgeText}>{t('pricing.yourPlanBadge')}</Text>
                </View>
              )}

              {/* Tier info */}
              <View style={styles.tierTop}>
                <Text style={[styles.tierName, { color: tc.text }]}>{tier.name}</Text>
                <Text style={[styles.tierStorage, { color: tc.text }]}>{tier.storageDisplay}</Text>
              </View>

              {/* Meme limits */}
              <View style={styles.memeRow}>
                <Ionicons name="sparkles" size={12} color={memeFlame} />
                <Text style={[styles.memeText, { color: tc.textSecondary }]}>
                  {tier.memesPerDay > 0 ? t('pricing.aiPerDay', { count: tier.memesPerDay }) : t('pricing.noAi')} · {isFree ? t('pricing.manualNone') : t('pricing.manualUnlimited')} · {t('pricing.perMonthShort', { count: tier.memesPerMonth })}
                </Text>
              </View>

              {/* BOTH prices side by side */}
              {isFree ? (
                <View style={styles.priceSection}>
                  <Text style={[styles.priceMain, { color: tc.text }]}>{t('pricing.free')}</Text>
                </View>
              ) : (
                <View style={styles.priceSection}>
                  {/* Shortest period this plan is sold in */}
                  {hasShort && (
                    <View
                      style={[
                        styles.priceBox,
                        { borderColor: tc.border },
                        billing === 'short' && { borderColor: tc.primary, borderWidth: 2, backgroundColor: tc.primaryLight },
                      ]}
                    >
                      <Text style={[styles.priceLabel, { color: tc.textSecondary }]}>{periodLabel(shortPeriod)}</Text>
                      <Text style={[styles.priceAmount, { color: billing === 'short' ? tc.primary : tc.text }]}>
                        €{getTierMonthlyEquivalent(tier, shortPeriod).toFixed(2)}
                      </Text>
                      <Text style={[styles.priceSub, { color: tc.textSecondary }]}>
                        {shortPeriod === 'monthly'
                          ? t('pricing.perMonth')
                          : t('pricing.perPeriod', { price: shortTotal.toFixed(2), period: periodLabel(shortPeriod) })}
                      </Text>
                    </View>
                  )}

                  {/* Yearly price */}
                  <View
                    style={[
                      styles.priceBox,
                      { borderColor: tc.border },
                      billing === 'yearly' && { borderColor: tc.primary, borderWidth: 2, backgroundColor: tc.primaryLight },
                    ]}
                  >
                    <Text style={[styles.priceLabel, { color: tc.textSecondary }]}>{t('pricing.yearly')}</Text>
                    <Text style={[styles.priceAmount, { color: billing === 'yearly' ? tc.primary : tc.text }]}>
                      €{yearlyMonthly.toFixed(2)}
                    </Text>
                    <Text style={[styles.priceSub, { color: tc.textSecondary }]}>{t('pricing.perMonth')}</Text>
                    {savings > 0 && (
                      <View style={[styles.savingsPill, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
                        <Text style={[styles.savingsPillText, { color: tc.success }]}>-{savings}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Select button */}
              {!isCurrent && !isFree && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.selectBtn,
                    { borderColor: tc.border, backgroundColor: tc.bgCard },
                    isPopular && { backgroundColor: tc.primary, borderColor: tc.primary },
                  ]}
                  onPress={() => handleSelectPlan(tier)}
                >
                  <Text style={[styles.selectBtnText, { color: isPopular ? '#fff' : tc.primary }]}>
                    {t('pricing.select', { name: tier.name })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
          <Text style={[styles.featuresTitle, { color: tc.text }]}>{t('pricing.allPlansInclude')}</Text>
          {[
            t('pricing.featureBackup'),
            t('pricing.featureAiSearch'),
            t('pricing.featureOriginal'),
            t('pricing.featureSharing'),
            t('pricing.featureMemes'),
            t('pricing.featureEu'),
            t('pricing.featureCancel'),
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={tc.success} />
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
  stickyBar: { paddingHorizontal: 16, paddingBottom: 10 },
  billingRow: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  billingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 40, borderRadius: 10,
  },
  segSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  billingText: { fontSize: 14 },
  freeBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  freeText: { fontSize: 10, ...fonts.bold },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 16 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  trustText: { fontSize: 11, ...fonts.semibold },
  tierCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 20, borderWidth: 1,
    padding: 18, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -11, left: 18, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, zIndex: 1,
  },
  badgeText: { fontSize: 11, ...fonts.bold, color: '#fff' },
  tierTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tierName: { fontSize: 18, ...fonts.display },
  tierStorage: { fontSize: 22, ...fonts.display },
  memeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, marginBottom: 12 },
  memeText: { fontSize: 12, ...fonts.medium, flexShrink: 1 },
  priceSection: { flexDirection: 'row', gap: 10 },
  priceMain: { fontSize: 22, ...fonts.display },
  priceBox: {
    flex: 1, alignItems: 'center', borderRadius: 14, paddingVertical: 12, borderWidth: 1,
  },
  priceLabel: { fontSize: 11, ...fonts.semibold, letterSpacing: 0.3, marginBottom: 2 },
  priceAmount: { fontSize: 22, ...fonts.extrabold },
  priceSub: { fontSize: 11, ...fonts.medium },
  savingsPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  savingsPillText: { fontSize: 11, ...fonts.bold },
  selectBtn: {
    marginTop: 14, borderRadius: 26, height: 48, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  selectBtnText: { fontSize: 15, ...fonts.bold },
  featuresCard: {
    marginHorizontal: 16, marginTop: 6, borderRadius: 20, borderWidth: 1, padding: 18,
  },
  featuresTitle: { fontSize: 17, ...fonts.display, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 13, ...fonts.medium, flexShrink: 1 },
});
