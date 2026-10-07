import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

// MemeWall is the app's home screen — open the tabs on it by default.
export const unstable_settings = {
  initialRouteName: 'meme-wall-tab',
};

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useT();

  return (
    <Tabs
      initialRouteName="meme-wall-tab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: isDark ? colors.bgCard : '#fff',
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* MemeWall is the home screen: first tab + initial route. */}
      <Tabs.Screen
        name="meme-wall-tab"
        options={{
          title: t('nav.tabs.memeWall'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.tabs.photos'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="myspace"
        options={{
          title: t('nav.tabs.myspace'),
          tabBarIcon: ({ color, size }) => (
            // Outlined cloud differentiates the personal-cloud namespace
            // from Upload's filled cloud-upload action icon.
            <Ionicons name="cloud-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('nav.tabs.upload'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-upload" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: t('nav.tabs.albums'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hide screens from tab bar */}
      <Tabs.Screen name="videos" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
