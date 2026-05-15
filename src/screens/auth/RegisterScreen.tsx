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
import { registerVendor } from '../../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.email.trim()) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Email invalide';
    if (!form.phone.trim()) newErrors.phone = 'Le téléphone est requis';
    if (!form.password) newErrors.password = 'Le mot de passe est requis';
    else if (form.password.length < 6) newErrors.password = 'Minimum 6 caractères';
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    if (!form.storeName.trim()) newErrors.storeName = 'Le nom de la boutique est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await registerVendor(form);
      if (!result.success) {
        Alert.alert('Erreur d\'inscription', result.error);
      }
    } catch (error) {
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textInverse} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="cube" size={40} color={colors.textInverse} />
            </View>
            <Text style={styles.headerTitle}>Créer un compte</Text>
            <Text style={styles.headerSubtitle}>
              Commencez votre essai gratuit de 30 jours
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Section: Informations personnelles */}
            <Text style={styles.sectionTitle}>Informations personnelles</Text>

            <Input
              label="Nom complet *"
              value={form.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Jean Dupont"
              autoCapitalize="words"
              error={errors.name}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Adresse email *"
              value={form.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="jean@exemple.com"
              keyboardType="email-address"
              error={errors.email}
              leftIcon={
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Téléphone *"
              value={form.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              error={errors.phone}
              leftIcon={
                <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Mot de passe *"
              value={form.password}
              onChangeText={(text) => updateField('password', text)}
              placeholder="Minimum 6 caractères"
              secureTextEntry
              error={errors.password}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Confirmer le mot de passe *"
              value={form.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              placeholder="Répétez votre mot de passe"
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              }
            />

            {/* Section: Informations boutique */}
            <Text style={styles.sectionTitle}>Votre boutique</Text>

            <Input
              label="Nom de la boutique *"
              value={form.storeName}
              onChangeText={(text) => updateField('storeName', text)}
              placeholder="Ma Super Boutique"
              autoCapitalize="words"
              error={errors.storeName}
              leftIcon={
                <Ionicons name="storefront-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Adresse (optionnel)"
              value={form.storeAddress}
              onChangeText={(text) => updateField('storeAddress', text)}
              placeholder="Rue, Ville, Pays"
              autoCapitalize="sentences"
              leftIcon={
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              }
            />

            {/* Free trial info */}
            <View style={styles.trialBanner}>
              <Ionicons name="gift-outline" size={20} color={colors.success} />
              <Text style={styles.trialText}>
                30 jours d'essai gratuit inclus !
              </Text>
            </View>

            <Button
              title="Créer mon compte"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="📱  S'inscrire par téléphone"
              onPress={() => navigation.navigate('PhoneAuth', { mode: 'register' })}
              variant="outline"
              style={styles.phoneButton}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Déjà un compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSection: {
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  trialText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 10,
  },
  registerButton: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  phoneButton: {
    marginBottom: 20,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default RegisterScreen;
