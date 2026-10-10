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
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { useT } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { fonts } from '@/lib/theme';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const { t } = useT();
  const { colors: tc } = useTheme();

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError(t('auth.register.enterName'));
      return;
    }
    if (!email || !password) {
      setError(t('auth.register.fillAllFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.register.passwordsDontMatch'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp(email, password, displayName, referralCode);
      // Navigation handled by RootNavigator auth gate → onboarding
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.register.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      // Navigation handled by RootNavigator auth gate → onboarding
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.googleLoginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputBox = [styles.inputContainer, { backgroundColor: tc.bgCard, borderColor: tc.border }];
  const inputText = [styles.input, { color: tc.text }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: tc.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={[styles.logoMark, { backgroundColor: tc.primaryLight }]}>
              <Ionicons name="cloud" size={26} color={tc.primary} />
            </View>
            <Text style={[styles.logoText, { color: tc.text }]}>MyPhoto</Text>
          </View>

          <Text style={[styles.title, { color: tc.text }]}>{t('auth.register.title')}</Text>
          <Text style={[styles.subtitle, { color: tc.textSecondary }]}>{t('auth.register.subtitle')}</Text>

          {/* Error */}
          {error ? (
            <View style={[styles.errorContainer, { borderColor: tc.error, backgroundColor: tc.bgCard }]}>
              <Text style={[styles.errorText, { color: tc.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* Google register */}
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, styles.googleButton, { backgroundColor: tc.bgCard, borderColor: tc.border }]}
            onPress={handleGoogleRegister}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color={tc.text} style={{ marginRight: 8 }} />
            <Text style={[styles.googleButtonText, { color: tc.text }]}>{t('auth.continueWithGoogle')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
            <Text style={[styles.dividerText, { color: tc.textMuted }]}>{t('auth.orEmail')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: tc.border }]} />
          </View>

          {/* Name */}
          <View style={inputBox}>
            <Ionicons name="person-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={inputText}
              placeholder={t('auth.register.namePlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={inputBox}>
            <Ionicons name="mail-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={inputText}
              placeholder={t('auth.email')}
              placeholderTextColor={tc.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={inputText}
              placeholder={t('auth.register.passwordPlaceholder')}
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
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={tc.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <View style={inputBox}>
            <Ionicons name="lock-closed-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={inputText}
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Referral code (optional) */}
          <View style={inputBox}>
            <Ionicons name="gift-outline" size={20} color={tc.textMuted} style={styles.inputIcon} />
            <TextInput
              style={inputText}
              placeholder={t('auth.register.referralPlaceholder')}
              placeholderTextColor={tc.textMuted}
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
          </View>

          {/* Register button */}
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, styles.primaryButton, { backgroundColor: tc.primary }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register.createAccount')}</Text>
            )}
          </TouchableOpacity>

          {/* Benefits */}
          <View style={[styles.benefitsContainer, { backgroundColor: tc.bgCard, borderColor: tc.border }]}>
            <BenefitRow icon="cloud-outline" text={t('auth.register.benefitFree')} />
            <BenefitRow icon="phone-portrait-outline" text={t('auth.register.benefitBackup')} />
            <BenefitRow icon="people-outline" text={t('auth.register.benefitReferral')} />
            <BenefitRow icon="shield-checkmark-outline" text={t('auth.register.benefitEu')} />
          </View>

          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: tc.textSecondary }]}>{t('auth.register.haveAccount')}</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.linkHit}>
                <Text style={[styles.loginLink, { color: tc.primary }]}>{t('auth.register.signIn')}</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BenefitRow({ icon, text }: { icon: string; text: string }) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon as any} size={18} color={tc.primary} />
      <Text style={[styles.benefitText, { color: tc.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 20, gap: 8 },
  logoMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 34, letterSpacing: -0.8, ...fonts.displayHeavy },
  title: { fontSize: 24, textAlign: 'center', letterSpacing: -0.3, ...fonts.display },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 21, marginTop: 6, marginBottom: 24 },
  errorContainer: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 14, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingLeft: 16, paddingRight: 4, marginBottom: 12, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  eyeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26,
  },
  primaryButton: { marginTop: 8 },
  googleButton: { borderWidth: 1 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleButtonText: { fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 13 },
  benefitsContainer: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 20, marginBottom: 12, gap: 10,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  benefitText: { fontSize: 14, marginLeft: 12, flex: 1, lineHeight: 19 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  loginText: { fontSize: 14 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});
