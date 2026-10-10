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

interface Conversation {
  id: string;
  other: { id: string; name: string };
  status: 'active' | 'request_in' | 'request_out';
  unread: number;
  lastMessage: { text: string; isMeme: boolean; fromMe: boolean; at: string } | null;
  updatedAt: string;
}

type Tab = 'messages' | 'activity';

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
  const { clearActivity, unreadActivity, unreadMessages, refresh: refreshBadge } = useInbox();
  const { colors: tc } = useTheme();
  const { t, language } = useT();
  const [tab, setTab] = useState<Tab>('messages');
  const [showRequests, setShowRequests] = useState(false);
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const authed = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  }, [getToken]);

  const loadActivity = useCallback(async () => {
    const res = await authed('/api/inbox');
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    setItems(data.items || []);
    // Seen now: clear the badge and the server's unread flags. Rows keep
    // their highlight until the next visit.
    if ((data.unread || 0) > 0) {
      clearActivity();
      authed('/api/inbox/read', { method: 'POST', body: '{}' }).catch(() => {});
    }
  }, [authed, clearActivity]);

  const loadMessages = useCallback(async () => {
    const res = await authed('/api/messages');
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    setConversations(data.conversations || []);
  }, [authed]);

  const load = useCallback(async (which: Tab) => {
    setFailed(false);
    try {
      await (which === 'messages' ? loadMessages() : loadActivity());
    } catch {
      setFailed(true);
    }
  }, [loadMessages, loadActivity]);

  useFocusEffect(
    useCallback(() => {
      load(tab);
      refreshBadge();
    }, [load, tab, refreshBadge])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(tab);
    refreshBadge();
    setRefreshing(false);
  }, [load, tab, refreshBadge]);

  // ── Activity ────────────────────────────────────────────────────────────
  const describe = (item: InboxItem): string => {
    const name = item.actorName || t('inbox.someone');
    switch (item.type) {
      case 'like':
        return item.count > 1 ? t('inbox.likeMany', { name, others: item.count - 1 }) : t('inbox.like', { name });
      case 'comment':
        return item.count > 1 ? t('inbox.commentMany', { count: item.count }) : t('inbox.comment', { name, text: item.text || '' });
      case 'referral_joined':
        return t('inbox.referralJoined', { name });
      case 'referral_bonus':
        return t('inbox.referralBonus');
      default:
        return item.text || '';
    }
  };

  const openActivity = (item: InboxItem) => {
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

  const renderActivity = ({ item }: { item: InboxItem }) => {
    const icon = iconFor(item);
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => openActivity(item)}
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

  // ── Messages ────────────────────────────────────────────────────────────
  const requests = (conversations || []).filter((c) => c.status === 'request_in');
  const visibleConversations = (conversations || []).filter((c) =>
    showRequests ? c.status === 'request_in' : c.status !== 'request_in'
  );

  const preview = (c: Conversation) => {
    if (!c.lastMessage) return '';
    const body = c.lastMessage.text || (c.lastMessage.isMeme ? t('messages.sentMeme') : '');
    return (c.lastMessage.fromMe ? t('messages.you') : '') + body;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const unread = item.unread > 0;
    return (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/chat', params: { conversationId: item.id, name: item.other.name } })}
        style={styles.row}
      >
        <View style={[styles.avatar, { backgroundColor: tc.primaryLight }]}>
          <Text style={[styles.avatarText, { color: tc.primary }]}>{(item.other.name || '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.convTop}>
            <Text style={[styles.name, { color: tc.text, fontWeight: unread ? '800' : '600' }]} numberOfLines={1}>
              {item.other.name || t('inbox.someone')}
            </Text>
            <Text style={[styles.time, { color: tc.textSecondary }]}>{timeAgo(item.updatedAt, language)}</Text>
          </View>
          <View style={styles.convTop}>
            <Text
              style={[styles.preview, { color: unread ? tc.text : tc.textSecondary, fontWeight: unread ? '700' : '400' }]}
              numberOfLines={1}
            >
              {preview(item)}
            </Text>
            {unread && <View style={[styles.dot, { backgroundColor: tc.primary }]} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const segment = (key: Tab, label: string, count: number) => {
    const selected = tab === key;
    return (
      <TouchableOpacity
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => { setTab(key); setShowRequests(false); }}
        style={[styles.seg, selected && { backgroundColor: tc.bgCard, ...styles.segSelected }]}
      >
        <Text style={[styles.segLabel, { color: selected ? tc.text : tc.textSecondary, fontWeight: selected ? '700' : '600' }]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.segBadge, { backgroundColor: tc.error }]}>
            <Text style={styles.segBadgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const loadingNow = tab === 'messages' ? conversations === null : items === null;

  const emptyState = (title: string, hint: string, icon: 'chatbubble-outline' | 'notifications-outline') => (
    <View style={styles.center}>
      <View style={[styles.emptyIcon, { backgroundColor: tc.bgInput }]}>
        <Ionicons name={icon} size={30} color={tc.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: tc.text }]}>{title}</Text>
      <Text style={[styles.emptyHint, { color: tc.textSecondary }]}>{hint}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top']}>
      <ScreenHeader title={t('inbox.title')} showInbox={false}>
        <View accessibilityRole="tablist" style={[styles.segWrap, { backgroundColor: tc.bgInput }]}>
          {segment('messages', t('messages.tabMessages'), unreadMessages)}
          {segment('activity', t('messages.tabActivity'), unreadActivity)}
        </View>
      </ScreenHeader>

      {loadingNow && !failed ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={tc.primary} />
        </View>
      ) : failed && loadingNow ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: tc.text }]}>{t('inbox.loadFailed')}</Text>
          <TouchableOpacity onPress={() => load(tab)} style={[styles.retry, { backgroundColor: tc.primary }]}>
            <Text style={styles.retryText}>{t('inbox.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : tab === 'messages' ? (
        <FlatList
          data={visibleConversations}
          keyExtractor={(c) => c.id}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
          ListHeaderComponent={
            showRequests ? (
              <TouchableOpacity onPress={() => setShowRequests(false)} style={styles.requestsRow}>
                <Ionicons name="chevron-back" size={20} color={tc.text} />
                <Text style={[styles.section, { color: tc.text, paddingHorizontal: 0 }]}>{t('messages.requestsTitle')}</Text>
              </TouchableOpacity>
            ) : requests.length > 0 ? (
              <TouchableOpacity onPress={() => setShowRequests(true)} style={styles.requestsRow}>
                <Text style={[styles.requestsLink, { color: tc.primary }]}>{t('messages.requests', { count: requests.length })}</Text>
                <Ionicons name="chevron-forward" size={18} color={tc.primary} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={emptyState(t('messages.noMessages'), t('messages.noMessagesHint'), 'chatbubble-outline')}
        />
      ) : (
        <FlatList
          data={items || []}
          keyExtractor={(i) => i.id}
          renderItem={renderActivity}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.primary} />}
          ListEmptyComponent={emptyState(t('inbox.empty'), t('inbox.emptyHint'), 'notifications-outline')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  segWrap: { flexDirection: 'row', padding: 4, borderRadius: 14 },
  seg: { flex: 1, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segSelected: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segLabel: { fontSize: 14 },
  segBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  segBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  section: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  requestsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingVertical: 10 },
  requestsLink: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 12 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  convTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 15, flex: 1 },
  preview: { fontSize: 14, flex: 1 },
  text: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyHint: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { height: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
