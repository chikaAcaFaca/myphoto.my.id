import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, ActionSheetIOS, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useInbox } from '@/lib/inbox-context';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
const POLL_MS = 4000;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  meme: { id: string; imageUrl: string; caption: string; mediaType: string } | null;
  createdAt: string;
  pending?: boolean;
}

interface ConversationInfo {
  id: string;
  other: { id: string; name: string };
  status: 'active' | 'request_in' | 'request_out';
  blockedByMe: boolean;
  seenByOther: boolean;
}

const conversationIdFor = (a: string, b: string) => [a, b].sort().join('_');

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId?: string; userId?: string; name?: string }>();
  const { user, getToken } = useAuth();
  const { refresh: refreshInbox } = useInbox();
  const { colors: tc } = useTheme();
  const { t } = useT();

  const myId = user?.uid || '';
  const convId = params.conversationId || (params.userId && myId ? conversationIdFor(myId, params.userId) : '');

  const [info, setInfo] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastAt = useRef<string | null>(null);
  const exists = useRef(true);

  const otherName = info?.other.name || params.name || '';
  const otherId = info?.other.id || params.userId || '';

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  }, [getToken]);

  const load = useCallback(async (initial = false) => {
    if (!convId) return;
    try {
      const after = !initial && lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : '';
      const res = await api(`/api/messages/${convId}${after}`);
      if (res.status === 404) {
        // A new conversation: nothing on the server until the first message.
        exists.current = false;
        return;
      }
      if (!res.ok) return;
      exists.current = true;
      const data = await res.json();
      setInfo(data.conversation);
      const incoming: ChatMessage[] = data.messages || [];
      if (incoming.length) {
        lastAt.current = incoming[incoming.length - 1].createdAt;
        setMessages((prev) => {
          if (initial) return incoming;
          const known = new Set(prev.map((m) => m.id));
          return [...prev.filter((m) => !m.pending), ...incoming.filter((m) => !known.has(m.id))];
        });
        refreshInbox();
      }
    } catch {
      // Offline: keep what we have, the next poll retries.
    } finally {
      if (initial) setLoading(false);
    }
  }, [api, convId, refreshInbox]);

  useEffect(() => {
    lastAt.current = null;
    load(true);
  }, [load]);

  // Poll while this screen is focused and the app is in the foreground.
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') load(false);
      }, POLL_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  const showError = (code?: string) => {
    const known = ['BLOCKED', 'DAILY_LIMIT', 'REQUEST_PENDING', 'NOT_FOUND'];
    Alert.alert(t(code && known.includes(code) ? (`messages.errors.${code}` as any) : 'messages.errors.generic'));
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending || !otherId) return;
    setSending(true);
    const temp: ChatMessage = {
      id: `pending-${Date.now()}`, senderId: myId, text: body, meme: null,
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [...prev, temp]);
    setText('');
    try {
      const res = exists.current
        ? await api(`/api/messages/${convId}`, { method: 'POST', body: JSON.stringify({ text: body }) })
        : await api('/api/messages', { method: 'POST', body: JSON.stringify({ toUserId: otherId, text: body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== temp.id));
        setText(body);
        showError(data?.code);
        return;
      }
      exists.current = true;
      await load(!lastAt.current);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setText(body);
      showError();
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    const res = await api(`/api/messages/${convId}`, { method: 'POST', body: JSON.stringify({ action: 'accept' }) });
    if (res.ok) setInfo((i) => (i ? { ...i, status: 'active' } : i));
  };

  const decline = async () => {
    await api(`/api/messages/${convId}`, { method: 'DELETE' });
    refreshInbox();
    router.back();
  };

  const toggleBlock = () => {
    const blocking = !info?.blockedByMe;
    const run = async () => {
      const res = await api(`/api/users/${otherId}/block`, { method: 'POST', body: JSON.stringify({ blocked: blocking }) });
      if (!res.ok) return showError();
      setInfo((i) => (i ? { ...i, blockedByMe: blocking } : i));
      if (blocking) {
        refreshInbox();
        router.back();
      }
    };
    if (!blocking) return run();
    Alert.alert(t('messages.block'), t('messages.blockConfirm', { name: otherName }), [
      { text: t('messages.cancel'), style: 'cancel' },
      { text: t('messages.block'), style: 'destructive', onPress: run },
    ]);
  };

  const report = () => {
    const submit = async (reason: string) => {
      const res = await api('/api/messages/report', {
        method: 'POST',
        body: JSON.stringify({ conversationId: convId, reason }),
      });
      Alert.alert(res.ok ? t('messages.reportThanks') : t('messages.errors.generic'));
    };
    Alert.alert(t('messages.reportTitle'), undefined, [
      { text: t('messages.reportSpam'), onPress: () => submit('spam') },
      { text: t('messages.reportHarassment'), onPress: () => submit('harassment') },
      { text: t('messages.reportInappropriate'), onPress: () => submit('inappropriate') },
      { text: t('messages.reportOther'), onPress: () => submit('other') },
      { text: t('messages.cancel'), style: 'cancel' },
    ]);
  };

  const openMenu = () => {
    const blockLabel = info?.blockedByMe ? t('messages.unblock') : t('messages.block');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [blockLabel, t('messages.report'), t('messages.cancel')], destructiveButtonIndex: 0, cancelButtonIndex: 2 },
        (i) => (i === 0 ? toggleBlock() : i === 1 ? report() : undefined)
      );
      return;
    }
    Alert.alert(otherName, undefined, [
      { text: blockLabel, style: 'destructive', onPress: toggleBlock },
      { text: t('messages.report'), onPress: report },
      { text: t('messages.cancel'), style: 'cancel' },
    ]);
  };

  const openMeme = (memeId: string) => {
    router.push({ pathname: '/meme-wall', params: { startId: memeId } });
  };

  const lastMine = [...messages].reverse().find((m) => m.senderId === myId && !m.pending);

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === myId;
    return (
      <View style={[styles.msgRow, mine ? styles.right : styles.left]}>
        {item.meme ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => openMeme(item.meme!.id)}
            style={[styles.memeCard, { backgroundColor: '#111214' }]}
          >
            {item.meme.imageUrl ? (
              <Image source={{ uri: item.meme.imageUrl }} style={styles.memeImage} contentFit="cover" />
            ) : (
              <View style={[styles.memeImage, { backgroundColor: '#3A3F4A' }]} />
            )}
            <View style={styles.memeMeta}>
              <Ionicons name="flame" size={14} color="#FF7A3D" />
              <Text style={styles.memeCaption} numberOfLines={2}>{item.meme.caption || 'Meme Wall'}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        {item.text ? (
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: tc.primary, borderBottomRightRadius: 6 }
                : { backgroundColor: tc.bgCard, borderColor: tc.border, borderWidth: 1, borderBottomLeftRadius: 6 },
              item.pending && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.bubbleText, { color: mine ? '#FFFFFF' : tc.text }]}>{item.text}</Text>
          </View>
        ) : null}
        {mine && lastMine?.id === item.id && info?.seenByOther && info.status === 'active' ? (
          <Text style={[styles.seen, { color: tc.textSecondary }]}>{t('messages.seen')}</Text>
        ) : null}
      </View>
    );
  };

  const canWrite = !info?.blockedByMe && info?.status !== 'request_in';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tc.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: tc.bgCard, borderBottomColor: tc.border }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={tc.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerWho}
          onPress={() => otherId && router.push({ pathname: '/meme-profile', params: { userId: otherId, userName: otherName } })}
        >
          <View style={[styles.avatar, { backgroundColor: tc.primaryLight }]}>
            <Text style={[styles.avatarText, { color: tc.primary }]}>{(otherName || '?').slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={[styles.headerName, { color: tc.text }]} numberOfLines={1}>{otherName}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('messages.more')} onPress={openMenu} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={tc.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={tc.primary} /></View>
        ) : (
          <FlatList
            data={[...messages].reverse()}
            inverted
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 8 }}
          />
        )}

        {info?.status === 'request_in' && (
          <View style={[styles.requestBox, { backgroundColor: tc.bgCard, borderTopColor: tc.border }]}>
            <Text style={[styles.requestText, { color: tc.text }]}>{t('messages.requestIncoming', { name: otherName })}</Text>
            <View style={styles.requestActions}>
              <TouchableOpacity onPress={decline} style={[styles.requestBtn, { backgroundColor: tc.bgInput }]}>
                <Text style={{ color: tc.text, fontWeight: '700' }}>{t('messages.decline')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={accept} style={[styles.requestBtn, { backgroundColor: tc.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('messages.accept')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {info?.status === 'request_out' && (
          <Text style={[styles.note, { color: tc.textSecondary }]}>{t('messages.requestOutgoing', { name: otherName })}</Text>
        )}
        {info?.blockedByMe && (
          <Text style={[styles.note, { color: tc.textSecondary }]}>{t('messages.blocked')}</Text>
        )}

        {canWrite && (
          <View style={[styles.inputRow, { backgroundColor: tc.bgCard, borderTopColor: tc.border }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('messages.placeholder')}
              placeholderTextColor={tc.textMuted}
              accessibilityLabel={t('messages.placeholder')}
              multiline
              maxLength={2000}
              style={[styles.input, { backgroundColor: tc.bg, borderColor: tc.border, color: tc.text }]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('messages.send')}
              onPress={send}
              disabled={!text.trim() || sending}
              style={[styles.sendBtn, { backgroundColor: tc.primary, opacity: !text.trim() || sending ? 0.5 : 1 }]}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6, borderBottomWidth: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerWho: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 15 },
  headerName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  msgRow: { maxWidth: '80%', gap: 4 },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  seen: { fontSize: 12 },
  memeCard: { width: 220, borderRadius: 18, overflow: 'hidden' },
  memeImage: { width: 220, height: 220 },
  memeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
  memeCaption: { color: '#D5D7DC', fontSize: 12, flex: 1 },
  requestBox: { padding: 16, gap: 12, borderTopWidth: 1 },
  requestText: { fontSize: 14, lineHeight: 20 },
  requestActions: { flexDirection: 'row', gap: 10 },
  requestBtn: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingVertical: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
