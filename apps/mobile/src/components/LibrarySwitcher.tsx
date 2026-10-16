import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

type Section = 'photos' | 'albums' | 'myspace';

const ROUTES: Record<Section, '/(tabs)' | '/(tabs)/albums' | '/(tabs)/myspace'> = {
  photos: '/(tabs)',
  albums: '/(tabs)/albums',
  myspace: '/(tabs)/myspace',
};

/** Slike | Albumi | MySpace — the three library screens live under one tab. */
export function LibrarySwitcher({ active }: { active: Section }) {
  const { colors: tc, isDark } = useTheme();
  const { t } = useT();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('nav.library.label')}
      style={[styles.wrap, { backgroundColor: tc.bgInput }]}
    >
      {(Object.keys(ROUTES) as Section[]).map((key) => {
        const selected = key === active;
        return (
          <TouchableOpacity
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => !selected && router.navigate(ROUTES[key])}
            style={[
              styles.seg,
              selected && { backgroundColor: isDark ? tc.bgCard : '#FFFFFF', ...styles.segSelected },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? tc.text : tc.textSecondary, fontWeight: selected ? '700' : '600' },
              ]}
            >
              {t(`nav.library.${key}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, borderRadius: 14 },
  seg: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segSelected: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontSize: 14 },
});
