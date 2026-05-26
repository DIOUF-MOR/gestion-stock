import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Button from '../../components/common/Button';
import { resendVerificationEmail } from '../../services/authService';
import { logoutUser } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const EmailVerificationScreen = () => {
  const { user, reloadUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      await reloadUser();
      // AppNavigator reacts to user.emailVerified automatically
    } catch {
      Alert.alert('Erreur', 'Impossible de vérifier le statut. Réessayez.');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        Alert.alert('Email envoyé', `Un nouveau lien a été envoyé à ${user?.email}`);
      } else {
        Alert.alert('Erreur', result.error);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Vérifiez votre email</Text>
        <Text style={styles.subtitle}>
          Un lien de vérification a été envoyé à
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.instructions}>
          Ouvrez votre boîte mail, cliquez sur le lien, puis revenez ici.
        </Text>

        <Button
          title="J'ai vérifié mon email"
          onPress={handleCheckVerification}
          loading={checking}
          style={styles.primaryBtn}
        />

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resending}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.primary} />
          <Text style={styles.resendText}>
            {resending ? 'Envoi en cours...' : 'Renvoyer l\'email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => await logoutUser()}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  instructions: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: 16,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default EmailVerificationScreen;
