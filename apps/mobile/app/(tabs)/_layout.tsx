import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-context';
import { memeFlame } from '@/lib/theme';
import { useInbox } from '@/lib/inbox-context';
import { useT } from '@/lib/i18n';

// MemeWall is the app's home screen — open the tabs on it by default.
export const unstable_settings = {
  initialRouteName: 'meme-wall-tab',
};

// Tabs: Mimovi · Slike · [+] · Inbox · Ja. Albums and MySpace live under
// Slike (LibrarySwitcher), so they stay routable but hidden from the bar.
export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { unread } = useInbox();
  const { t } = useT();

  const barBg = isDark ? colors.bgCard : '#FFFFFF';

  return (
    <Tabs
      initialRouteName="meme-wall-tab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: barBg,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="meme-wall-tab"
        options={{
          title: t('nav.tabs.memeWall'),
          // The flame stays orange on every screen — Meme Wall's own color.
          tabBarActiveTintColor: memeFlame,
          tabBarInactiveTintColor: memeFlame,
          // Meme Wall is a dark, full-bleed feed: the bar goes dark with it.
          tabBarStyle: {
            backgroundColor: '#111214',
            borderTopColor: '#111214',
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name={focused ? 'flame' : 'flame-outline'} size={size} color={memeFlame} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.tabs.photos'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'images' : 'images-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('nav.tabs.upload'),
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: t('nav.tabs.upload'),
          tabBarIcon: () => (
            <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t('nav.tabs.inbox'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.error, color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.tabs.me'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
      {/* Routable, but not in the bar */}
      <Tabs.Screen name="albums" options={{ href: null }} />
      <Tabs.Screen name="myspace" options={{ href: null }} />
      <Tabs.Screen name="videos" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 54,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
