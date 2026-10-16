import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useT } from '@/lib/i18n';
import { radius, fonts } from '@/lib/theme';
import { StackHeader } from '@/components/StackHeader';

/**
 * In-app account deletion (required by Google Play for apps with accounts).
 * Type DELETE → re-confirm identity (password, or the Google prompt) →
 * server wipes storage, records and the login.
 */
export default function DeleteAccountScreen() {
  const { user, usesPassword, deleteAccount } = useAuth();
  const themeColors = useTheme().colors;
  const { t } = useT();
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmText.trim().toUpperCase() === 'DELETE' && (!usesPassword || password.length > 0);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(usesPassword ? password : undefined);
      Alert.alert(t('account.deletedTitle'), t('account.deletedMessage'));
      router.replace('/');
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('account.wrongPassword'));
      } else {
        setError(e?.message || t('account.deleteFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.bg }]}>
      <StackHeader title={t('account.title')} onBack={() => { if (!busy) router.back(); }} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.warning, { backgroundColor: themeColors.error + '14', borderColor: themeColors.error + '40' }]}>
          <Ionicons name="warning" size={22} color={themeColors.error} />
          <Text style={[styles.warningText, { color: themeColors.text }]}>
            {t('account.warning', { email: user?.email ? ` (${user.email})` : '' })}
          </Text>
        </View>

        <Text style={[styles.label, { color: themeColors.text }]}>{t('account.typeToConfirm')}</Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.bgInput }]}
          placeholder="DELETE"
          placeholderTextColor={themeColors.textMuted}
        />

        {usesPassword && (
          <>
            <Text style={[styles.label, { color: themeColors.text }]}>{t('account.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.bgInput }]}
            />
          </>
        )}
        {!usesPassword && (
          <Text style={[styles.hint, { color: themeColors.textSecondary }]}>{t('account.googleHint')}</Text>
        )}

        {error && <Text style={[styles.error, { color: themeColors.error }]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: themeColors.error }, (!canSubmit || busy) && { opacity: 0.5 }]}
          onPress={handleDelete}
          disabled={!canSubmit || busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteText}>{t('account.deleteForever')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 8 },
  warning: {
    flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.lg,
    borderWidth: 1, marginBottom: 12,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 13, ...fonts.medium, marginTop: 8 },
  input: { borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  hint: { fontSize: 12, marginTop: 4 },
  error: { fontSize: 13, marginTop: 8 },
  deleteBtn: {
    marginTop: 20, borderRadius: 24, minHeight: 48,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: 15, ...fonts.bold },
});
