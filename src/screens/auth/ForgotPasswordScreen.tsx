import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { resetPassword } from '../../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setEmailError('L\'email est requis');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Adresse email invalide');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setSent(true);
      } else {
        Alert.alert('Erreur', result.error);
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
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {!sent ? (
            <>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={64} color={colors.primary} />
              </View>

              <Text style={styles.title}>Mot de passe oublié ?</Text>
              <Text style={styles.subtitle}>
                Entrez votre adresse email et nous vous enverrons un lien pour
                réinitialiser votre mot de passe.
              </Text>

              <Input
                label="Adresse email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                }}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={emailError}
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                }
              />

              <Button
                title="Envoyer le lien"
                onPress={handleReset}
                loading={loading}
                style={styles.button}
              />

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={styles.backLinkText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Success state
            <View style={styles.successContainer}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Email envoyé !</Text>
              <Text style={styles.successMessage}>
                Un lien de réinitialisation a été envoyé à{' '}
                <Text style={styles.emailHighlight}>{email}</Text>
                {'\n\n'}
                Vérifiez votre boîte de réception et suivez les instructions.
              </Text>
              <Button
                title="Retour à la connexion"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
                style={styles.backButton2}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  button: {
    marginTop: 8,
    marginBottom: 24,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  backButton2: {
    paddingHorizontal: 32,
  },
});

export default ForgotPasswordScreen;
