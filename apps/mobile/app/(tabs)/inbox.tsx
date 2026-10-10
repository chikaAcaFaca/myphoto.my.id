import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/lib/auth-context';
import { useInbox } from '@/lib/inbox-context';
import { useTheme } from '@/lib/theme-context';
import { memeFlame } from '@/lib/theme';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

interface InboxItem {
  id: string;
  type: 'like' | 'comment' | 'referral_joined' | 'referral_bonus' | 'system';
  actorId: string | null;
  actorName: string | null;
  memeId: string | null;
  text: string | null;
  count: number;
  read: boolean;
  updatedAt: string;
}

function timeAgo(iso: string, lang: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return lang === 'sr' ? 'sada' : 'now';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return lang === 'sr' ? `${d} d` : `${d}d`;
}

export default function InboxScreen() {
  const { user, getToken } = useAuth();
  const { setUnread } = useInbox();
  const { colors: tc } = useTheme();
  const { t, language } = useT();
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/inbox`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setItems(data.items || []);
      // Seen now: clear the badge and the server's unread flags. Rows keep
      // their unread highlight until the next visit.
      if ((data.unread || 0) > 0) {
        setUnread(0);
        fetch(`${API_URL}/api/inbox/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: '{}',
        }).catch(() => {});
      }
    } catch {
      setFailed(true);
    }
  }, [getToken, setUnread]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const describe = (item: InboxItem): string => {
    const name = item.actorName || t('inbox.someone');
    switch (item.type) {
      case 'like':
        return item.count > 1
          ? t('inbox.likeMany', { name, others: item.count - 1 })
          : t('inbox.like', { name });
      case 'comment':
        return item.count > 1
          ? t('inbox.commentMany', { count: item.count })
          : t('inbox.comment', { name, text: item.text || '' });
      case 'referral_joined':
        return t('inbox.referralJoined', { name });
      case 'referral_bonus':
        return t('inbox.referralBonus');
      default:
        return item.text || '';
    }
  };

  const open = (item: InboxItem) => {
    if (item.memeId && user) {
      // My memes, starting at the one that got the like/comment.
      router.push({
        pathname: '/meme-wall',
        params: { profileUserId: user.uid, profileName: t('nav.tabs.me'), startId: item.memeId },
      });
    } else if (item.type === 'referral_joined' || item.type === 'referral_bonus') {
      router.navigate('/(tabs)/settings');
    }
  };

  const iconFor = (item: InboxItem) => {
    switch (item.type) {
      case 'like':
        return { name: 'heart' as const, bg: '#FFEDE4', fg: memeFlame };
      case 'comment':
        return { name: 'chatbubble-ellipses' as const, bg: tc.primaryLight, fg: tc.primary };
      default:
        return { name: 'gift' as const, bg: tc.text, fg: tc.bg };
    }
  };

  const renderItem = ({ item }: { item: InboxItem }) => {
    const icon = iconFor(item);
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => open(item)}
        style={[styles.row, !item.read && { backgroundColor: tc.primaryLight }]}
      >
        <View style={[styles.icon, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={22} color={icon.fg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.text, { color: tc.text, fontWeight: item.read ? '500' : '700' }]} numberOfLines={3}>
            {describe(item)}
          </Text>
          <Text style={[styles.time, { color: tc.textSecondary }]}>{timeAgo(item.updatedAt, language)}</Text>
        </View>
        {!item.read && <View style={[styles.dot, { backgroundColor: tc.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScreenHeader title={t('inbox.title')} showInbox={false} />

      {items === null && !failed ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : failed && !items?.length ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('inbox.loadFailed')}</Text>
          <TouchableOpacity onPress={load} style={[styles.retry, { backgroundColor: tc.primary }]}>
            <Text style={styles.retryText}>{t('inbox.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items || []}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
          ListHeaderComponent={
            items && items.length > 0 ? (
              <Text style={[styles.section, { color: tc.text }]}>{t('inbox.activity')}</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: tc.bgInput }]}>
                <Ionicons name="chatbubble-outline" size={30} color={tc.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('inbox.empty')}</Text>
              <Text style={[styles.emptyHint, { color: tc.textSecondary }]}>{t('inbox.emptyHint')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  section: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { height: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
