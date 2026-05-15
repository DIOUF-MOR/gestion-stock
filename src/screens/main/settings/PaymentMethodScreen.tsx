import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { PLANS } from '../../../../firebase.config';
import {
  PAYMENT_PROVIDERS,
  ADMIN_PAYMENT_PHONE,
  generatePaymentReference,
  savePaymentRecord,
  initiateMobileMoneyPayment,
  listenToPayment,
} from '../../../services/paymentService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';

moment.locale('fr');

const STEPS = {
  SELECT_PROVIDER: 'select_provider',
  ENTER_PHONE: 'enter_phone',
  INSTRUCTIONS: 'instructions',
  PENDING: 'pending',
};

const PaymentMethodScreen = ({ navigation, route }) => {
  const { user, userProfile } = useAuth();
  const selectedPlan = route.params?.planId || 'basic';
  const plan = PLANS[selectedPlan];

  const [step, setStep] = useState(STEPS.SELECT_PROVIDER);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reference, setReference] = useState('');
  const [paymentId, setPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Listen to payment status in real time
  useEffect(() => {
    if (!paymentId) return;
    const unsub = listenToPayment(paymentId, (payment) => {
      setPaymentStatus(payment.status);
      if (payment.status === 'confirmed') {
        Alert.alert(
          '✅ Paiement confirmé!',
          `Votre abonnement ${plan?.name} est maintenant actif! Profitez de toutes les fonctionnalités.`,
          [{ text: 'Super!', onPress: () => navigation.replace('SettingsMain') }]
        );
      }
    });
    return () => unsub();
  }, [paymentId]);

  const providersList = Object.values(PAYMENT_PROVIDERS);
  const requiresPhone = ['orange_money', 'wave', 'airtel_money', 'mtn_momo'].includes(selectedProvider?.id);

  const handleSelectProvider = (provider) => {
    setSelectedProvider(provider);
    setReference(generatePaymentReference());
    if (provider.id === 'bank_transfer' || provider.id === 'cash') {
      setStep(STEPS.INSTRUCTIONS);
    } else {
      setStep(STEPS.ENTER_PHONE);
    }
  };

  const handleContinueToInstructions = () => {
    if (!phoneNumber.trim() || phoneNumber.trim().length < 8) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide');
      return;
    }
    setStep(STEPS.INSTRUCTIONS);
  };

  const handleOpenPaymentApp = async () => {
    if (!selectedProvider) return;
    await initiateMobileMoneyPayment(
      selectedProvider.id,
      plan?.price || 0,
      phoneNumber || ADMIN_PAYMENT_PHONE,
      reference
    );
  };

  const handlePaymentDone = async () => {
    setLoading(true);
    try {
      const result = await savePaymentRecord(
        user.uid,
        plan?.price || 0,
        selectedPlan,
        selectedProvider?.name || 'Autre',
        reference,
        userProfile?.name || userProfile?.storeName || ''
      );

      if (!result.success) throw new Error(result.error);

      setPaymentId(result.id);
      setStep(STEPS.PENDING);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible d\'enregistrer le paiement');
    } finally {
      setLoading(false);
    }
  };

  const formatInstructions = (instructions) => {
    return instructions.map(line =>
      line
        .replace('{phone}', ADMIN_PAYMENT_PHONE)
        .replace('{amount}', plan?.price || '?')
        .replace('{reference}', reference)
    );
  };

  const renderSelectProvider = () => (
    <>
      {/* Plan summary */}
      <Card style={styles.planSummaryCard}>
        <View style={styles.planSummaryRow}>
          <View>
            <Text style={styles.planSummaryLabel}>Plan sélectionné</Text>
            <Text style={styles.planSummaryName}>{plan?.name}</Text>
            <Text style={styles.planSummaryDuration}>{plan?.duration} jours</Text>
          </View>
          <View style={styles.planSummaryPrice}>
            <Text style={styles.planSummaryAmount}>{plan?.price === 0 ? 'Gratuit' : `${plan?.price} FCFA`}</Text>
          </View>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Choisir le mode de paiement</Text>
      {providersList.map(provider => (
        <TouchableOpacity
          key={provider.id}
          style={[styles.providerCard, { borderLeftColor: provider.color }]}
          onPress={() => handleSelectProvider(provider)}
        >
          <Text style={styles.providerEmoji}>{provider.emoji}</Text>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
            {provider.ussd && (
              <Text style={styles.providerUssd}>USSD: {provider.ussd}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </>
  );

  const renderEnterPhone = () => (
    <>
      <Card style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={[styles.providerBadge, { backgroundColor: `${selectedProvider?.color}20` }]}>
            <Text style={styles.providerEmojiLarge}>{selectedProvider?.emoji}</Text>
          </View>
          <View style={styles.stepHeaderInfo}>
            <Text style={styles.stepTitle}>{selectedProvider?.name}</Text>
            <Text style={styles.stepSubtitle}>Montant: {plan?.price} FCFA</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Votre numéro de téléphone {selectedProvider?.name}</Text>
        <TextInput
          style={styles.textInput}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Ex: +225 07 00 00 00 00"
          keyboardType="phone-pad"
          autoFocus
        />
        <Text style={styles.fieldHint}>
          Ce numéro sera utilisé pour vérifier votre paiement.
        </Text>

        <View style={styles.referenceBox}>
          <Text style={styles.referenceLabel}>Référence de paiement</Text>
          <Text style={styles.referenceValue}>{reference}</Text>
        </View>

        <Button
          title="Continuer"
          onPress={handleContinueToInstructions}
          style={styles.actionBtn}
        />
        <Button
          title="Retour"
          variant="ghost"
          onPress={() => setStep(STEPS.SELECT_PROVIDER)}
          style={styles.backBtn}
        />
      </Card>
    </>
  );

  const renderInstructions = () => {
    const instructions = formatInstructions(selectedProvider?.instructions || []);
    return (
      <>
        <Card style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.providerBadge, { backgroundColor: `${selectedProvider?.color}20` }]}>
              <Text style={styles.providerEmojiLarge}>{selectedProvider?.emoji}</Text>
            </View>
            <View style={styles.stepHeaderInfo}>
              <Text style={styles.stepTitle}>{selectedProvider?.name}</Text>
              <Text style={styles.stepSubtitle}>Montant: {plan?.price} FCFA</Text>
            </View>
          </View>

          <View style={styles.referenceBox}>
            <Text style={styles.referenceLabel}>Référence de paiement (à conserver)</Text>
            <Text style={styles.referenceValue}>{reference}</Text>
          </View>

          <Text style={styles.instructionsTitle}>Instructions de paiement:</Text>
          {instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </Card>

        {requiresPhone && (
          <Button
            title={`Ouvrir ${selectedProvider?.name}`}
            variant="outline"
            onPress={handleOpenPaymentApp}
            icon={<Ionicons name="open-outline" size={18} color={colors.primary} />}
            style={styles.actionBtn}
          />
        )}

        <Button
          title="J'ai effectué le paiement"
          onPress={handlePaymentDone}
          loading={loading}
          icon={<Ionicons name="checkmark-circle-outline" size={20} color={colors.textInverse} />}
          style={styles.doneBtn}
        />
        <Button
          title="Retour"
          variant="ghost"
          onPress={() => setStep(requiresPhone ? STEPS.ENTER_PHONE : STEPS.SELECT_PROVIDER)}
          style={styles.backBtn}
        />
      </>
    );
  };

  const renderPending = () => (
    <Card style={styles.pendingCard}>
      {paymentStatus === 'confirmed' ? (
        <>
          <View style={styles.pendingIconContainer}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>
          <Text style={styles.pendingTitle}>Paiement confirmé!</Text>
          <Text style={styles.pendingSubtitle}>
            Votre abonnement {plan?.name} est maintenant actif.
          </Text>
        </>
      ) : paymentStatus === 'rejected' ? (
        <>
          <View style={styles.pendingIconContainer}>
            <Ionicons name="close-circle" size={72} color={colors.error} />
          </View>
          <Text style={styles.pendingTitle}>Paiement rejeté</Text>
          <Text style={styles.pendingSubtitle}>
            Votre paiement a été rejeté. Veuillez contacter l'administrateur ou réessayer.
          </Text>
          <Button
            title="Réessayer"
            onPress={() => setStep(STEPS.SELECT_PROVIDER)}
            style={styles.actionBtn}
          />
        </>
      ) : (
        <>
          <View style={styles.pendingIconContainer}>
            <ActivityIndicator size={60} color={colors.primary} />
          </View>
          <Text style={styles.pendingTitle}>Paiement en attente</Text>
          <Text style={styles.pendingSubtitle}>
            Votre paiement est en cours de vérification par l'administrateur.
            Vous serez notifié dès la confirmation.
          </Text>
          <View style={styles.pendingRefBox}>
            <Text style={styles.pendingRefLabel}>Référence:</Text>
            <Text style={styles.pendingRefValue}>{reference}</Text>
          </View>
          <Text style={styles.pendingNote}>
            Temps de traitement habituel: 1 à 24 heures ouvrables.
          </Text>
        </>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Paiement"
        subtitle={step === STEPS.PENDING ? 'Vérification en cours' : `Plan ${plan?.name}`}
        onBack={step === STEPS.PENDING ? undefined : () => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === STEPS.SELECT_PROVIDER && renderSelectProvider()}
        {step === STEPS.ENTER_PHONE && renderEnterPhone()}
        {step === STEPS.INSTRUCTIONS && renderInstructions()}
        {step === STEPS.PENDING && renderPending()}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  planSummaryCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  planSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSummaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  planSummaryName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  planSummaryDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planSummaryPrice: {
    alignItems: 'flex-end',
  },
  planSummaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  providerEmoji: {
    fontSize: 28,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  providerUssd: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  stepCard: {
    padding: 20,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  providerBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerEmojiLarge: {
    fontSize: 30,
  },
  stepHeaderInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  referenceBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  referenceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  referenceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  instructionNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  instructionNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  actionBtn: {
    marginBottom: 10,
  },
  doneBtn: {
    marginBottom: 10,
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  backBtn: {
    marginBottom: 4,
  },
  pendingCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  pendingIconContainer: {
    marginBottom: 20,
  },
  pendingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  pendingRefBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  pendingRefLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pendingRefValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  pendingNote: {
    fontSize: 12,
    color: colors.textDisabled,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 32,
  },
});

export default PaymentMethodScreen;
