import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { loginUser, loginWithPhone } from '../../services/authService';

type LoginMode = 'email' | 'phone';

const LoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState<LoginMode>('phone');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (mode === 'email') {
      if (!email.trim()) newErrors.email = "L'email est requis";
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email invalide';
    } else {
      if (!phone.trim() || phone.replace(/\D/g, '').length < 8)
        newErrors.phone = 'Numéro de téléphone invalide';
    }
    if (!password) newErrors.password = 'Le mot de passe est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result =
        mode === 'email'
          ? await loginUser(email.trim(), password)
          : await loginWithPhone(phone.trim(), password);

      if (!result.success) {
        Alert.alert('Erreur de connexion', result.error);
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="cube" size={48} color={colors.textInverse} />
            </View>
            <Text style={styles.appName}>StockManager</Text>
            <Text style={styles.tagline}>Gérez votre stock simplement</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeTitle}>Bon retour !</Text>
            <Text style={styles.welcomeSubtitle}>Connectez-vous à votre compte</Text>

            {/* Toggle Email / Téléphone */}
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'email' && styles.toggleBtnActive]}
                onPress={() => switchMode('email')}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={mode === 'email' ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[styles.toggleText, mode === 'email' && styles.toggleTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, mode === 'phone' && styles.toggleBtnActive]}
                onPress={() => switchMode('phone')}
              >
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={mode === 'phone' ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[styles.toggleText, mode === 'phone' && styles.toggleTextActive]}>
                  Téléphone
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'email' ? (
              <Input
                label="Adresse email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                }
              />
            ) : (
              <Input
                label="Numéro de téléphone"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                }}
                placeholder="77 000 00 00"
                keyboardType="phone-pad"
                error={errors.phone}
                leftIcon={
                  <View style={styles.prefixContainer}>
                    <Text style={styles.prefix}>🇸🇳 +221</Text>
                  </View>
                }
              />
            )}

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }}
              placeholder="Votre mot de passe"
              secureTextEntry
              error={errors.password}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              }
            />

            {mode === 'email' && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            )}

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Créer un compte vendeur"
              onPress={() => navigation.navigate('Register')}
              variant="outline"
            />

            <TouchableOpacity
              style={styles.clientLink}
              onPress={() => navigation.navigate('ClientRegister')}
            >
              <Ionicons name="cart-outline" size={14} color={colors.secondary} />
              <Text style={styles.clientLinkText}>Créer un compte client</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800', color: colors.textInverse, marginBottom: 8 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  formContainer: {
    flex: 1, backgroundColor: colors.background,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32,
  },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  welcomeSubtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 24 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.textInverse },
  prefixContainer: { paddingRight: 8 },
  prefix: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 8, marginTop: -8 },
  forgotPasswordText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  loginButton: { marginTop: 8, marginBottom: 24 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { marginHorizontal: 16, fontSize: 14, color: colors.textSecondary },
  clientLink: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 8,
  },
  clientLinkText: { fontSize: 13, color: colors.secondary, fontWeight: '600' },
});

export default LoginScreen;
