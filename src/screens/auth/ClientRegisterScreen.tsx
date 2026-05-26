import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { registerClient, loginWithPhone } from '../../services/authService';

const ClientRegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) return Alert.alert('Erreur', 'Veuillez entrer votre nom.');
    if (!phone.trim()) return Alert.alert('Erreur', 'Veuillez entrer votre numéro de téléphone.');
    if (!storeCode.trim()) return Alert.alert('Erreur', 'Veuillez entrer le code de la boutique.');
    if (password.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
    if (password !== confirmPassword) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');

    setLoading(true);
    const result = await registerClient({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      storeId: storeCode.trim(),
      password,
    });
    setLoading(false);

    if (result.success) {
      // Auto-login after registration
      const loginResult = await loginWithPhone(phone.trim(), password);
      if (!loginResult.success) {
        Alert.alert('Compte créé', 'Votre compte a été créé. Connectez-vous avec votre numéro de téléphone.');
        navigation.navigate('Login');
      }
      // If login succeeded, onAuthStateChanged fires → AppNavigator routes to ClientNavigator
    } else {
      Alert.alert('Erreur d\'inscription', result.error || 'Une erreur est survenue');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="cart" size={44} color={colors.secondary} />
            </View>
          </View>
          <Text style={styles.title}>Créer un compte client</Text>
          <Text style={styles.subtitle}>
            Commandez et suivez vos commandes facilement
          </Text>

          {/* Store code info */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.info} />
            <Text style={styles.infoText}>
              Le code boutique vous est fourni par votre vendeur.
            </Text>
          </View>

          {/* Form */}
          <Field label="Nom complet *" icon="person-outline">
            <TextInput
              style={styles.input}
              placeholder="Ex: Fatou Diallo"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Téléphone *" icon="call-outline">
            <TextInput
              style={styles.input}
              placeholder="Ex: 77 123 45 67"
              placeholderTextColor={colors.textDisabled}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </Field>

          <Field label="Adresse de livraison" icon="location-outline">
            <TextInput
              style={styles.input}
              placeholder="Ex: Dakar, Plateau, Rue 12"
              placeholderTextColor={colors.textDisabled}
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </Field>

          <Field label="Code boutique *" icon="storefront-outline">
            <TextInput
              style={styles.input}
              placeholder="Code fourni par le vendeur"
              placeholderTextColor={colors.textDisabled}
              value={storeCode}
              onChangeText={setStoreCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field label="Mot de passe *" icon="lock-closed-outline">
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 caractères"
              placeholderTextColor={colors.textDisabled}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </Field>

          <Field label="Confirmer le mot de passe *" icon="lock-closed-outline">
            <TextInput
              style={styles.input}
              placeholder="Répéter le mot de passe"
              placeholderTextColor={colors.textDisabled}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
            {confirmPassword.length > 0 && (
              <Ionicons
                name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={password === confirmPassword ? colors.success : colors.error}
              />
            )}
          </Field>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Ionicons name="person-add" size={20} color={colors.textInverse} />
            <Text style={styles.submitBtnText}>
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>

          {/* Already have account */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ?{' '}
              <Text style={{ color: colors.secondary, fontWeight: '700' }}>Se connecter</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const Field = ({ label, icon, children }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ width: 22 }} />
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 12 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${colors.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.info}15`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  fieldContainer: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary },
  eyeBtn: { padding: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 14,
    padding: 18,
    marginTop: 10,
    gap: 10,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
  loginLink: { alignItems: 'center', paddingVertical: 16 },
  loginLinkText: { fontSize: 14, color: colors.textSecondary },
});

export default ClientRegisterScreen;
