import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// Phone SMS auth requires a native build (expo-dev-client or production build).
// It is not supported in Expo Go.
import { doc, getDoc } from 'firebase/firestore';
import { colors } from '../../theme/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { db } from '../../../firebase.config';

const getPhoneErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Numéro de téléphone invalide';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard';
    case 'auth/invalid-verification-code':
      return 'Code incorrect. Vérifiez et réessayez';
    case 'auth/code-expired':
      return 'Code expiré. Demandez un nouveau code';
    case 'auth/quota-exceeded':
      return 'Quota SMS dépassé. Réessayez plus tard';
    default:
      return 'Une erreur est survenue. Réessayez';
  }
};

const PhoneAuthScreen = ({ navigation }) => {
  const confirmRef = useRef<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('221')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+221${cleaned.slice(1)}`;
    return `+221${cleaned}`;
  };

  const sendOTP = async () => {
    setError('La connexion par SMS n\'est pas disponible dans Expo Go.\nUtilisez un build natif (expo-dev-client).');
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    if (!confirmRef.current) {
      setError('Session expirée. Demandez un nouveau code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await confirmRef.current.confirm(otp);
      const uid = result?.user?.uid;
      if (uid) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (!userDoc.exists()) {
          navigation.navigate('CompleteProfile', { user: result.user });
        }
        // Sinon AuthContext détecte la connexion automatiquement
      }
    } catch (err: any) {
      setError(getPhoneErrorMessage(err.code));
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
        <ScrollView
          contentContainerStyle={styles.scroll}
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
            {step === 'phone' ? (
              <>
                <Text style={styles.title}>Connexion / Inscription</Text>
                <Text style={styles.subtitle}>
                  Entrez votre numéro de téléphone pour recevoir un code SMS
                </Text>

                <Input
                  label="Numéro de téléphone"
                  value={phoneNumber}
                  onChangeText={(t) => { setPhoneNumber(t); setError(''); }}
                  placeholder="77 000 00 00"
                  keyboardType="phone-pad"
                  error={error}
                  leftIcon={
                    <View style={styles.prefixContainer}>
                      <Text style={styles.prefix}>🇸🇳 +221</Text>
                    </View>
                  }
                />

                <Button
                  title="Recevoir le code SMS"
                  onPress={sendOTP}
                  loading={loading}
                  style={styles.btn}
                />

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.infoText}>
                    Si c'est votre première connexion, un compte sera créé automatiquement avec 30 jours d'essai gratuit.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('phone'); setOtp(''); setError(''); confirmRef.current = null; }}>
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                  <Text style={styles.backText}>Changer le numéro</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Code de vérification</Text>
                <Text style={styles.subtitle}>
                  Code envoyé au{'\n'}
                  <Text style={styles.phoneDisplay}>+221 {phoneNumber}</Text>
                </Text>

                <Input
                  label="Code à 6 chiffres"
                  value={otp}
                  onChangeText={(t) => { setOtp(t); setError(''); }}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  error={error}
                />

                <Button
                  title="Vérifier et se connecter"
                  onPress={verifyOTP}
                  loading={loading}
                  style={styles.btn}
                />

                <TouchableOpacity style={styles.resendBtn} onPress={sendOTP}>
                  <Text style={styles.resendText}>Renvoyer le code</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primary },
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  headerSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32, fontWeight: '800',
    color: colors.textInverse, marginBottom: 8,
  },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  formContainer: {
    flex: 1, backgroundColor: colors.background,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32,
  },
  title: {
    fontSize: 24, fontWeight: '800',
    color: colors.textPrimary, marginBottom: 8,
  },
  subtitle: {
    fontSize: 15, color: colors.textSecondary,
    marginBottom: 28, lineHeight: 22,
  },
  phoneDisplay: { fontWeight: '700', color: colors.textPrimary },
  prefixContainer: { paddingRight: 8 },
  prefix: { fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  btn: { marginTop: 8, marginBottom: 20 },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.primaryLight || '#E8F4FD',
    borderRadius: 12, padding: 14, gap: 10,
  },
  infoText: {
    flex: 1, fontSize: 13,
    color: colors.textSecondary, lineHeight: 20,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginBottom: 24,
  },
  backText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});

export default PhoneAuthScreen;
