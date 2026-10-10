import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { fonts } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const { t } = useT();
  const { colors: tc } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.login.fillAllFields'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signIn(email, password);
      // Navigation handled by RootNavigator auth gate
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.login.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      // Navigation handled by RootNavigator auth gate
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.googleLoginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputBox = [styles.inputContainer, { backgroundColor: tc.bgCard, borderColor: tc.border }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: tc.bg }]}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoMark, { backgroundColor: tc.primaryLight }]}>
            <Ionicons name="cloud" size={30} color={tc.primary} />
          </View>
          <Text style={[styles.logoText, { color: tc.text }]}>MyPhoto</Text>
        </View>

        <Text style={[styles.title, { color: tc.text }]}>{t('auth.login.title')}</Text>
        <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{t('auth.login.subtitle')}</Text>

        {/* Error message */}
        {error ? (
          <View style={[styles.errorContainer, { borderColor: tc.error, backgroundColor: tc.bgCard }]}>
            <Text style={[styles.errorText, { color: tc.error }]}>{error}</Text>
          </View>
        ) : null}

        {/* Email input */}
        <View style={inputBox}>
          <Ionicons name="mail-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: tc.text }]}
            placeholder={t('auth.email')}
            placeholderTextColor={tc.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password input */}
        <View style={inputBox}>
          <Ionicons name="lock-closed-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: tc.text }]}
            placeholder={t('auth.password')}
            placeholderTextColor={tc.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            accessibilityState={{ checked: showPassword }}
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={tc.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Forgot password link */}
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={[styles.forgotPasswordText, { color: tc.primary }]}>{t('auth.login.forgotPassword')}</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: tc.primary }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
          <Text style={[styles.dividerText, { color: tc.textMuted }]}>{t('auth.login.or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
        </View>

        {/* Google login button */}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.secondaryButton, { backgroundColor: tc.bgCard, borderColor: tc.border }]}
          onPress={handleGoogleLogin}
          disabled={isLoading}
        >
          <Ionicons name="logo-google" size={20} color={tc.text} style={{ marginRight: 8 }} />
          <Text style={[styles.secondaryButtonText, { color: tc.text }]}>{t('auth.continueWithGoogle')}</Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: tc.textSecondary }]}>{t('auth.login.noAccount')}</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.linkHit}>
              <Text style={[styles.registerLink, { color: tc.primary }]}>{t('auth.login.signUpFree')}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 28, gap: 10 },
  logoMark: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 40, letterSpacing: -1, ...fonts.displayHeavy },
  title: { fontSize: 24, textAlign: 'center', letterSpacing: -0.3, ...fonts.display },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 6, marginBottom: 28 },
  errorContainer: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 14, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingLeft: 16, paddingRight: 4, marginBottom: 12, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  forgotPassword: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginBottom: 12 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26,
  },
  secondaryButton: { borderWidth: 1 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  registerText: { fontSize: 14 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  registerLink: { fontSize: 14, fontWeight: '700' },
});
