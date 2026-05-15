import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { PLANS } from '../../../firebase.config';
import {
  setSubscription,
  cancelSubscription,
  extendSubscription,
  recordPayment,
} from '../../services/subscriptionService';
import { getPaymentHistory } from '../../services/paymentService';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

moment.locale('fr');

const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Virement bancaire'];

const SubscriberDetailScreen = ({ navigation, route }) => {
  const vendor = route.params?.vendor;
  const [selectedPlan, setSelectedPlan] = useState(vendor?.subscription?.plan || 'free');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [extensionDays, setExtensionDays] = useState('30');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!vendor?.id) return;
    setLoadingHistory(true);
    getPaymentHistory(vendor.id)
      .then(result => {
        if (result.success) setPaymentHistory(result.payments);
      })
      .finally(() => setLoadingHistory(false));
  }, [vendor?.id]);

  if (!vendor) return null;

  const sub = vendor.subscription;
  const endDate = sub?.endDate?.toDate ? sub.endDate.toDate() : sub?.endDate ? new Date(sub.endDate) : null;
  const isActive = sub?.status === 'active' && endDate && endDate > new Date();
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  const getPlanColor = (planId) => {
    const planColors = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return planColors[planId] || colors.textSecondary;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const handleSetSubscription = async () => {
    const plan = PLANS[selectedPlan];
    const amount = Number(paymentAmount) || plan.price;

    Alert.alert(
      'Confirmer l\'abonnement',
      `Activer le plan ${plan.name} pour ${vendor.name} ?\n\nMontant: $${amount}\nMéthode: ${paymentMethod}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            try {
              // Set subscription
              const subResult = await setSubscription(vendor.id, selectedPlan, paymentMethod, amount);
              if (!subResult.success) throw new Error(subResult.error);

              // Record payment if amount > 0
              if (amount > 0) {
                await recordPayment(vendor.id, {
                  amount,
                  plan: selectedPlan,
                  method: paymentMethod,
                  reference: paymentRef,
                  date: new Date().toISOString(),
                });
              }

              Alert.alert('Succès', 'Abonnement activé avec succès!');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erreur', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExtend = async () => {
    const days = Number(extensionDays);
    if (!days || days <= 0) {
      Alert.alert('Erreur', 'Nombre de jours invalide');
      return;
    }

    Alert.alert(
      'Prolonger l\'abonnement',
      `Prolonger de ${days} jours pour ${vendor.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            const result = await extendSubscription(vendor.id, days);
            setLoading(false);
            if (result.success) {
              Alert.alert('Succès', `Abonnement prolongé de ${days} jours!`);
              navigation.goBack();
            } else {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      `Voulez-vous vraiment annuler l\'abonnement de ${vendor.name} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await cancelSubscription(vendor.id);
            setLoading(false);
            if (result.success) {
              Alert.alert('Succès', 'Abonnement annulé.');
              navigation.goBack();
            } else {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Détail abonné"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Vendor info */}
        <View style={styles.vendorHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(vendor.name)}</Text>
          </View>
          <Text style={styles.vendorName}>{vendor.name}</Text>
          <Text style={styles.vendorEmail}>{vendor.email}</Text>
          {vendor.phone && (
            <Text style={styles.vendorPhone}>{vendor.phone}</Text>
          )}
        </View>

        {/* Current subscription */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Abonnement actuel</Text>
          {sub ? (
            <>
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Plan</Text>
                <Text style={[styles.subValue, { color: getPlanColor(sub.plan) }]}>
                  {PLANS[sub.plan]?.name || sub.plan}
                </Text>
              </View>
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Statut</Text>
                <Text style={[styles.subValue, { color: isActive ? colors.success : colors.error }]}>
                  {isActive ? `Actif (${daysLeft}j restants)` : 'Expiré/Inactif'}
                </Text>
              </View>
              {endDate && (
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Expiration</Text>
                  <Text style={styles.subValue}>{moment(endDate).format('D MMM YYYY')}</Text>
                </View>
              )}
              {sub.paymentMethod && (
                <View style={styles.subRow}>
                  <Text style={styles.subLabel}>Méthode paiement</Text>
                  <Text style={styles.subValue}>{sub.paymentMethod}</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noSubText}>Aucun abonnement</Text>
          )}
        </Card>

        {/* Set new subscription */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Activer / Modifier l'abonnement</Text>

          <Text style={styles.fieldLabel}>Sélectionner un plan:</Text>
          {Object.values(PLANS).map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planOption,
                selectedPlan === plan.id && styles.planOptionSelected,
                { borderColor: selectedPlan === plan.id ? getPlanColor(plan.id) : colors.border },
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              <View style={[styles.planDot, { backgroundColor: getPlanColor(plan.id) }]} />
              <View style={styles.planOptionInfo}>
                <Text style={[styles.planOptionName, { color: getPlanColor(plan.id) }]}>
                  {plan.name}
                </Text>
                <Text style={styles.planOptionDetails}>
                  {plan.price === 0 ? 'Gratuit' : `$${plan.price}/mois`} · {plan.duration} jours
                </Text>
              </View>
              {selectedPlan === plan.id && (
                <Ionicons name="checkmark-circle" size={22} color={getPlanColor(plan.id)} />
              )}
            </TouchableOpacity>
          ))}

          <Text style={styles.fieldLabel}>Méthode de paiement:</Text>
          <View style={styles.paymentChips}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.chip, paymentMethod === method && styles.chipSelected]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text style={[styles.chipText, paymentMethod === method && styles.chipTextSelected]}>
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Montant reçu ($)</Text>
              <TextInput
                style={styles.textInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder={`${PLANS[selectedPlan]?.price || 0}`}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>Référence</Text>
              <TextInput
                style={styles.textInput}
                value={paymentRef}
                onChangeText={setPaymentRef}
                placeholder="REF-001"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Button
            title="Activer l'abonnement"
            onPress={handleSetSubscription}
            loading={loading}
            style={styles.actionBtn}
          />
        </Card>

        {/* Extend subscription */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Prolonger l'abonnement</Text>
          <View style={styles.extendRow}>
            <View style={styles.extendInput}>
              <Text style={styles.inputLabel}>Nombre de jours</Text>
              <TextInput
                style={styles.textInput}
                value={extensionDays}
                onChangeText={setExtensionDays}
                placeholder="30"
                keyboardType="numeric"
              />
            </View>
            <Button
              title="Prolonger"
              onPress={handleExtend}
              loading={loading}
              size="sm"
              style={styles.extendBtn}
              fullWidth={false}
            />
          </View>
          <View style={styles.quickDaysRow}>
            {[7, 30, 60, 90].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.dayChip, extensionDays === days.toString() && styles.dayChipSelected]}
                onPress={() => setExtensionDays(days.toString())}
              >
                <Text style={[styles.dayChipText, extensionDays === days.toString() && styles.dayChipTextSelected]}>
                  {days}j
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Payment history */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Historique des paiements ({paymentHistory.length})</Text>
          {paymentHistory.length === 0 ? (
            <Text style={styles.noSubText}>
              {loadingHistory ? 'Chargement...' : 'Aucun paiement enregistré'}
            </Text>
          ) : (
            paymentHistory.map(payment => {
              const statusColors = { pending: colors.warning, confirmed: colors.success, rejected: colors.error };
              const statusLabels = { pending: 'En attente', confirmed: 'Confirmé', rejected: 'Rejeté' };
              const date = payment.createdAt?.toDate ? payment.createdAt.toDate() : null;
              return (
                <View key={payment.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyPlan}>{PLANS[payment.plan]?.name || payment.plan}</Text>
                    <Text style={styles.historyDate}>
                      {date ? moment(date).format('DD/MM/YYYY HH:mm') : '–'}
                    </Text>
                    <Text style={styles.historyMethod}>{payment.method}</Text>
                    {payment.reference && (
                      <Text style={styles.historyRef}>Réf: {payment.reference}</Text>
                    )}
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>{payment.amount} FCFA</Text>
                    <View style={[styles.historyStatus, { backgroundColor: `${statusColors[payment.status]}20` }]}>
                      <Text style={[styles.historyStatusText, { color: statusColors[payment.status] }]}>
                        {statusLabels[payment.status] || payment.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Cancel subscription */}
        {isActive && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.cancelButtonText}>Annuler l'abonnement</Text>
          </TouchableOpacity>
        )}

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
    paddingTop: 8,
  },
  vendorHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  vendorName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  vendorEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  vendorPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  noSubText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
  },
  planOptionSelected: {
    backgroundColor: colors.surfaceVariant,
  },
  planDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  planOptionInfo: {
    flex: 1,
  },
  planOptionName: {
    fontSize: 15,
    fontWeight: '700',
  },
  planOptionDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  paymentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  actionBtn: {
    marginTop: 4,
  },
  extendRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  extendInput: {
    flex: 1,
  },
  extendBtn: {
    minWidth: 100,
  },
  quickDaysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayChipTextSelected: {
    color: colors.textInverse,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBackground,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 16,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  historyLeft: {
    flex: 1,
  },
  historyPlan: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyMethod: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyRef: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 24,
  },
});

export default SubscriberDetailScreen;
