/**
 * Bottom-sheet comments for a meme. Reads/writes the existing
 * /api/meme-wall/[id]/comments endpoint. Reusable across the card feed and the
 * upcoming full-screen TikTok-style feed.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { fonts, radius, memeFlame } from '@/lib/theme';
import { useT } from '@/lib/i18n';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';
/** Ink on the flame orange: white fails 4.5:1 for small text, this passes. */
const ON_FLAME = '#111214';

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export function MemeComments({
  memeId,
  visible,
  onClose,
  onPosted,
}: {
  memeId: string | null;
  visible: boolean;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const { colors: tc } = useTheme();
  const { t } = useT();
  const { user, getToken } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!memeId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/meme-wall/${memeId}/comments?limit=100`);
      if (res.ok) {
        const d = await res.json();
        setComments(d.comments || []);
      }
    } catch (e) {
      console.log('Comments load error:', e);
    } finally {
      setLoading(false);
    }
  }, [memeId]);

  useEffect(() => {
    if (visible && memeId) {
      setText('');
      load();
    }
  }, [visible, memeId, load]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || !memeId) return;
    if (!user) {
      Alert.alert(t('meme.comments.signInTitle'), t('meme.comments.signInToComment'));
      return;
    }
    setPosting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${memeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: body }),
      });
      if (res.ok) {
        setText('');
        await load();
        onPosted?.();
      } else {
        Alert.alert(t('common.error'), t('meme.comments.postFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('meme.comments.postFailed'));
    } finally {
      setPosting(false);
    }
  }, [text, memeId, user, getToken, load, onPosted, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
            <View style={[styles.handle, { backgroundColor: tc.border }]} />
            <Text style={[styles.title, { color: tc.text }]}>{t('meme.comments.title')}</Text>
            {loading ? (
              <ActivityIndicator color={memeFlame} style={{ marginVertical: 24 }} />
            ) : comments.length === 0 ? (
              <Text style={[styles.empty, { color: tc.textSecondary }]}>{t('meme.comments.empty')}</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 340 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={styles.comment}>
                    <View style={[styles.avatar, { backgroundColor: memeFlame }]}>
                      <Text style={styles.avatarText}>{(item.authorName || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.author, { color: tc.textSecondary }]}>@{item.authorName}</Text>
                      <Text style={[styles.text, { color: tc.text }]}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
                placeholder={user ? t('meme.comments.placeholder') : t('meme.comments.placeholderSignedOut')}
                placeholderTextColor={tc.textMuted}
                value={text}
                onChangeText={setText}
                editable={!!user}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: memeFlame, opacity: posting || !text.trim() ? 0.5 : 1 }]}
                onPress={submit}
                disabled={posting || !text.trim()}
                accessibilityRole="button"
                accessibilityLabel={t('messages.send')}
              >
                {posting ? <ActivityIndicator size="small" color={ON_FLAME} /> : <Ionicons name="send" size={18} color={ON_FLAME} />}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 16, paddingBottom: 28,
    borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 20, letterSpacing: -0.3, ...fonts.display, marginBottom: 14 },
  empty: { fontSize: 14, ...fonts.medium, textAlign: 'center', marginVertical: 24 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: ON_FLAME, fontSize: 14, ...fonts.bold },
  author: { fontSize: 13, ...fonts.semibold, marginBottom: 2 },
  text: { fontSize: 15, ...fonts.regular, lineHeight: 21 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
    minHeight: 44, fontSize: 15, maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
