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
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { registerLivreur } from '../../../services/authService';

const AddLivreurScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Erreur', 'Veuillez entrer le nom du livreur.');
    if (!phone.trim()) return Alert.alert('Erreur', 'Veuillez entrer le numéro de téléphone.');
    if (password.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
    if (password !== confirmPassword) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');

    const storeId = userProfile?.storeId;
    if (!storeId) return Alert.alert('Erreur', 'Boutique introuvable.');

    setLoading(true);
    const result = await registerLivreur({
      name: name.trim(),
      phone: phone.trim(),
      password,
      storeId,
    });
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Livreur créé !',
        `Le compte de ${name.trim()} a été créé avec succès.\n\nIl peut maintenant se connecter avec son numéro de téléphone et le mot de passe que vous avez défini.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      Alert.alert('Erreur', result.error || 'Une erreur est survenue');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajouter un livreur</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Le livreur pourra se connecter à l'application avec son numéro de téléphone et le mot de passe que vous définissez ici.
          </Text>
        </View>

        {/* Livreur icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="bicycle" size={48} color={colors.accent} />
          </View>
        </View>

        {/* Form */}
        <Text style={styles.label}>Nom complet *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Ex: Moussa Diallo"
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Numéro de téléphone *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Ex: 77 123 45 67"
            placeholderTextColor={colors.textDisabled}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>Mot de passe *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 caractères"
            placeholderTextColor={colors.textDisabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmer le mot de passe *</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
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
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="person-add" size={20} color={colors.textInverse} />
          <Text style={styles.submitBtnText}>
            {loading ? 'Création du compte...' : 'Créer le compte livreur'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  content: { padding: 20 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}15`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 24,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  iconContainer: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 18,
    marginTop: 10,
    gap: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
});

export default AddLivreurScreen;
