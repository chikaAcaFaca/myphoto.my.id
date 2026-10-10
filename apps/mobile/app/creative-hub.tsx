import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { radius, fonts, memeFlame } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { StackHeader } from '@/components/StackHeader';

const { width } = Dimensions.get('window');
const CARD_W = (width - 36) / 2;

const TOOLS = [
  {
    id: 'meme',
    title: 'creative.memeTitle',
    desc: 'creative.memeDesc',
    icon: 'happy-outline' as const,
    color: memeFlame as string | null,
    route: '/meme-creator',
  },
  {
    id: 'comic',
    title: 'creative.comicTitle',
    desc: 'creative.comicDesc',
    icon: 'chatbubbles-outline' as const,
    color: null,
    route: '/comic-creator',
  },
  {
    id: 'sticker',
    title: 'creative.stickerTitle',
    desc: 'creative.stickerDesc',
    icon: 'star-outline' as const,
    color: null,
    route: '/sticker-maker',
  },
] as const;

export default function CreativeHubScreen() {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <StackHeader title={t('creative.title')} />

      <View style={styles.subtitle}>
        <Ionicons name="color-wand-outline" size={18} color={tc.primary} />
        <Text style={[styles.subtitleText, { color: tc.textSecondary }]}>
          {t('creative.subtitle')}
        </Text>
      </View>

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.toolCard, { backgroundColor: tc.bgCard, borderColor: tc.border }]}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: tool.route as any,
              params: id ? { id, name } : {},
            })}
          >
            <View style={[styles.iconCircle, { backgroundColor: tool.color ? tool.color + '1A' : tc.primaryLight }]}>
              <Ionicons name={tool.icon} size={28} color={tool.color ?? tc.primary} />
            </View>
            <Text style={[styles.toolTitle, { color: tc.text }]}>{t(tool.title)}</Text>
            <Text style={[styles.toolDesc, { color: tc.textSecondary }]}>{t(tool.desc)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: tc.textSecondary }]}>
          {t('creative.watermarkNote')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  subtitle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4,
  },
  subtitleText: { fontSize: 13, ...fonts.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  toolCard: {
    width: CARD_W, borderRadius: radius.xl, padding: 16, borderWidth: 1,
  },
  iconCircle: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  toolTitle: { fontSize: 14, ...fonts.bold, marginBottom: 4 },
  toolDesc: { fontSize: 11, lineHeight: 15 },
  footer: { paddingHorizontal: 16, paddingTop: 20, alignItems: 'center' },
  footerText: { fontSize: 11, textAlign: 'center' },
});
