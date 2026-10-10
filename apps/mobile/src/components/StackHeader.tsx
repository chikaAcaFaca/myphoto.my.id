import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { fonts } from '@/lib/theme';
import { useT } from '@/lib/i18n';

/** Header for pushed (non-tab) screens: back chevron, title in the display
 *  font, optional subtitle and round actions on the right. Same calm ground
 *  as the tabs' ScreenHeader. */
export function StackHeader({
  title,
  subtitle,
  actions,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onBack?: () => void;
  children?: ReactNode;
}) {
  const { colors: tc } = useTheme();
  const { t } = useT();
  return (
    <View style={[styles.wrap, { backgroundColor: tc.bg }]}>
      <View style={styles.row}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onBack ?? (() => router.back())}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={tc.text} />
        </TouchableOpacity>
        <View style={styles.titles}>
          <Text style={[styles.title, { color: tc.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: tc.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, gap: 1 },
  title: { fontSize: 24, letterSpacing: -0.4, ...fonts.display },
  subtitle: { fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
});
