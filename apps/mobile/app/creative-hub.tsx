import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radius, fonts } from '@/lib/theme';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');
const CARD_W = (width - 36) / 2;

const TOOLS = [
  {
    id: 'meme',
    title: 'Meme Kreator',
    desc: 'Dodaj smesni tekst na sliku',
    icon: 'happy-outline' as const,
    color: '#f97316',
    route: '/meme-creator',
  },
  {
    id: 'comic',
    title: 'Strip Kreator',
    desc: 'Napravi strip od slika sa oblacicima',
    icon: 'chatbubbles-outline' as const,
    color: '#8b5cf6',
    route: '/comic-creator',
  },
  {
    id: 'sticker',
    title: 'Stiker Kreator',
    desc: 'Napravi stikere za Viber i socijalne mreze',
    icon: 'star-outline' as const,
    color: '#ec4899',
    route: '/sticker-maker',
  },
  {
    id: 'caption',
    title: 'AI Komentari',
    desc: 'AI generise smesne komentare za sliku',
    icon: 'sparkles-outline' as const,
    color: '#06b6d4',
    route: '/ai-caption',
  },
];

export default function CreativeHubScreen() {
  const { colors: tc } = useTheme();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <View style={[styles.headerBg, { backgroundColor: tc.primary }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kreativni Alati</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <View style={styles.subtitle}>
        <Ionicons name="color-wand-outline" size={18} color={tc.primary} />
        <Text style={[styles.subtitleText, { color: tc.textSecondary }]}>
          Napravi nesto smesno i podeli sa prijateljima!
        </Text>
      </View>

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.toolCard, { backgroundColor: tc.bgCard }]}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: tool.route as any,
              params: id ? { id, name } : {},
            })}
          >
            <View style={[styles.iconCircle, { backgroundColor: tool.color + '15' }]}>
              <Ionicons name={tool.icon} size={28} color={tool.color} />
            </View>
            <Text style={[styles.toolTitle, { color: tc.text }]}>{tool.title}</Text>
            <Text style={[styles.toolDesc, { color: tc.textMuted }]}>{tool.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: tc.textMuted }]}>
          Svi kreirani sadrzaji ukljucuju "Made with MyPhoto" watermark
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBg: { paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, ...fonts.extrabold, color: '#fff' },
  subtitle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  subtitleText: { fontSize: 13, ...fonts.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  toolCard: {
    width: CARD_W, borderRadius: radius.lg, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
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
