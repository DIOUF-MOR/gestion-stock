import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { loginUser } from '../../services/authService';

const AdminLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email invalide';
    if (!password) newErrors.password = 'Le mot de passe est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      if (!result.success) {
        Alert.alert('Erreur', result.error);
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
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>

          <Text style={styles.title}>Accès Administrateur</Text>
          <Text style={styles.subtitle}>Réservé à l'équipe d'administration</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors(p => ({ ...p, email: '' })); }}
            placeholder="admin@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
          />

          <Input
            label="Mot de passe"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors(p => ({ ...p, password: '' })); }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
          />

          <Button
            title="Se connecter"
            onPress={handleLogin}
            loading={loading}
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 16 },
  backBtn: { marginBottom: 24 },
  iconContainer: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: colors.primaryLight || '#E8F4FD',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26, fontWeight: '800',
    color: colors.textPrimary, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: colors.textSecondary, marginBottom: 32,
  },
  btn: { marginTop: 8 },
});

export default AdminLoginScreen;
