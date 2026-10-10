import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useTheme } from '@/lib/theme-context';
import { fonts } from '@/lib/theme';
import { useInbox } from '@/lib/inbox-context';
import { useT } from '@/lib/i18n';

/** Large-title header shared by the main tabs: title on the left, round
 *  action buttons on the right (Inbox always last), optional row below. */
export function ScreenHeader({
  title,
  actions,
  showInbox = true,
  children,
}: {
  title: string;
  actions?: ReactNode;
  showInbox?: boolean;
  children?: ReactNode;
}) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: tc.bg }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: tc.text }]} numberOfLines={1}>{title}</Text>
        <View style={styles.actions}>
          {actions}
          {showInbox && <InboxHeaderButton />}
        </View>
      </View>
      {children}
    </View>
  );
}

export function HeaderIconButton({
  icon,
  label,
  onPress,
  disabled,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { colors: tc } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={[styles.iconBtn, { backgroundColor: tc.bgInput, opacity: disabled ? 0.5 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={tc.text} />
      {children}
    </TouchableOpacity>
  );
}

function InboxHeaderButton() {
  const { colors: tc } = useTheme();
  const { unread } = useInbox();
  const { t } = useT();
  return (
    <HeaderIconButton
      icon="chatbubble-outline"
      label={unread > 0 ? t('nav.inboxButtonUnread', { count: unread }) : t('nav.inboxButton')}
      onPress={() => router.navigate('/(tabs)/inbox' as Href)}
    >
      {unread > 0 && <View style={[styles.dot, { backgroundColor: tc.error, borderColor: tc.bgInput }]} />}
    </HeaderIconButton>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, fontSize: 32, letterSpacing: -0.6, ...fonts.display },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 8, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
