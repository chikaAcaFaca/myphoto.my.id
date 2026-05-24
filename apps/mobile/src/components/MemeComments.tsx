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
import { fonts, radius } from '@/lib/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://myphotomy.space';

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
    const t = text.trim();
    if (!t || !memeId) return;
    if (!user) {
      Alert.alert('Prijava', 'Prijavi se da bi komentarisao.');
      return;
    }
    setPosting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meme-wall/${memeId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text: t }),
      });
      if (res.ok) {
        setText('');
        await load();
        onPosted?.();
      } else {
        Alert.alert('Greška', 'Komentar nije poslat. Pokušaj ponovo.');
      }
    } catch {
      Alert.alert('Greška', 'Komentar nije poslat. Pokušaj ponovo.');
    } finally {
      setPosting(false);
    }
  }, [text, memeId, user, getToken, load, onPosted]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { backgroundColor: tc.bgCard }]}>
            <View style={[styles.handle, { backgroundColor: tc.border }]} />
            <Text style={[styles.title, { color: tc.text }]}>Komentari</Text>
            {loading ? (
              <ActivityIndicator color={tc.primary} style={{ marginVertical: 24 }} />
            ) : comments.length === 0 ? (
              <Text style={[styles.empty, { color: tc.textMuted }]}>Budi prvi koji komentariše!</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 340 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <View style={styles.comment}>
                    <View style={[styles.avatar, { backgroundColor: tc.primary }]}>
                      <Text style={styles.avatarText}>{(item.authorName || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.author, { color: tc.text }]}>@{item.authorName}</Text>
                      <Text style={[styles.text, { color: tc.text }]}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: tc.bgInput, color: tc.text, borderColor: tc.border }]}
                placeholder={user ? 'Napiši komentar…' : 'Prijavi se da komentarišeš'}
                placeholderTextColor={tc.textMuted}
                value={text}
                onChangeText={setText}
                editable={!!user}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: tc.primary, opacity: posting || !text.trim() ? 0.5 : 1 }]}
                onPress={submit}
                disabled={posting || !text.trim()}
              >
                {posting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
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
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 16, ...fonts.bold, marginBottom: 12 },
  empty: { fontSize: 13, ...fonts.medium, textAlign: 'center', marginVertical: 24 },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  avatar: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 13, ...fonts.bold },
  author: { fontSize: 12, ...fonts.bold, marginBottom: 2 },
  text: { fontSize: 13, ...fonts.medium, lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  input: {
    flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
