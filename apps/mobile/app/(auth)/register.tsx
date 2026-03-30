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
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';

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

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError('Unesite vaše ime');
      return;
    }
    if (!email || !password) {
      setError('Popunite sva polja');
      return;
    }
    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera');
      return;
    }
    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signUp(email, password);
      // After signup, go to onboarding
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registracija nije uspela');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google prijava nije uspela');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Ionicons name="cloud" size={48} color="#0ea5e9" />
            <Text style={styles.logoText}>MyPhoto</Text>
          </View>

          <Text style={styles.title}>Kreirajte nalog</Text>
          <Text style={styles.subtitle}>1 GB besplatno, odmah</Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Google register */}
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={handleGoogleRegister}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color="#374151" style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>Nastavi sa Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ili email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Name */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Vaše ime"
              placeholderTextColor="#9ca3af"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Lozinka (min 6 karaktera)"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Potvrdite lozinku"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Referral code (optional) */}
          <View style={styles.inputContainer}>
            <Ionicons name="gift-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Referral kod (opciono, +512 MB)"
              placeholderTextColor="#9ca3af"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
            />
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Kreiraj nalog</Text>
            )}
          </TouchableOpacity>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <BenefitRow icon="cloud-outline" text="1 GB besplatno odmah" />
            <BenefitRow icon="phone-portrait-outline" text="+1 GB kad uključite auto-backup" />
            <BenefitRow icon="people-outline" text="+512 MB za svakog prijatelja (do 15)" />
            <BenefitRow icon="shield-checkmark-outline" text="EU serveri, GDPR zaštita" />
          </View>

          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Već imate nalog? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Prijavite se</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BenefitRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Ionicons name={icon as any} size={16} color="#0ea5e9" />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoText: { fontSize: 24, fontWeight: 'bold', marginTop: 4, color: '#111827' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#6b7280', marginTop: 4, marginBottom: 24 },
  errorContainer: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 16, marginBottom: 12, height: 52,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 12, marginBottom: 12,
  },
  primaryButton: { backgroundColor: '#0ea5e9' },
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 16, color: '#9ca3af', fontSize: 14 },
  benefitsContainer: {
    backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, marginTop: 16, marginBottom: 16,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  benefitText: { fontSize: 13, color: '#374151', marginLeft: 10 },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginText: { color: '#6b7280', fontSize: 14 },
  loginLink: { color: '#0ea5e9', fontSize: 14, fontWeight: '600' },
});
