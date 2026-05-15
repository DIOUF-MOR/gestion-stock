import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// NOTE: expo-firebase-recaptcha requiert un development build (pas Expo Go)
// Pour activer, lancer : npx expo run:android ou npx expo run:ios
// import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
// import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
// import { auth, firebaseConfig } from '../../../firebase.config';

const PhoneAuthScreen = ({ navigation }) => {
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
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 8) {
      setError('Veuillez entrer un numéro valide');
      return;
    }
    setError('');

    // ── En production (development build), décommenter ce bloc ──────────────
    // setLoading(true);
    // try {
    //   const formattedPhone = formatPhone(phoneNumber.trim());
    //   const provider = new PhoneAuthProvider(auth);
    //   const id = await provider.verifyPhoneNumber(formattedPhone, recaptchaVerifier.current);
    //   setVerificationId(id);
    //   setStep('otp');
    // } catch (err: any) {
    //   setError(getPhoneErrorMessage(err.code));
    // } finally {
    //   setLoading(false);
    // }
    // ─────────────────────────────────────────────────────────────────────────

    Alert.alert(
      'Development Build requis',
      "L'authentification par téléphone (SMS OTP) nécessite un build natif.\n\nLance dans le terminal :\nnpx expo run:android",
      [{ text: 'OK' }]
    );
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }
    setError('');

    // ── En production (development build), décommenter ce bloc ──────────────
    // setLoading(true);
    // try {
    //   const credential = PhoneAuthProvider.credential(verificationId, otp);
    //   const result = await signInWithCredential(auth, credential);
    //   // Vérifier si profil existe déjà
    //   const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    //   if (!userDoc.exists()) {
    //     navigation.navigate('CompleteProfile', { user: result.user });
    //   }
    //   // Sinon AuthContext détecte la connexion automatiquement
    // } catch (err: any) {
    //   setError(getPhoneErrorMessage(err.code));
    // } finally {
    //   setLoading(false);
    // }
    // ─────────────────────────────────────────────────────────────────────────
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
                <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('phone'); setOtp(''); setError(''); }}>
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

            {/* Lien admin */}
            <TouchableOpacity
              style={styles.adminLink}
              onPress={() => navigation.navigate('AdminLogin')}
            >
              <Ionicons name="shield-outline" size={14} color={colors.textDisabled} />
              <Text style={styles.adminLinkText}>Accès administrateur</Text>
            </TouchableOpacity>
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
  adminLink: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    marginTop: 32, paddingVertical: 8,
  },
  adminLinkText: { fontSize: 12, color: colors.textDisabled },
});

export default PhoneAuthScreen;
