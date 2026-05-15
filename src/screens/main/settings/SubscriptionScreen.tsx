import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { PLANS } from '../../../../firebase.config';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';

moment.locale('fr');

const SubscriptionScreen = ({ navigation }) => {
  const { subscription, getSubscriptionDaysLeft } = useAuth();

  const currentPlan = subscription?.plan || 'free';
  const daysLeft = getSubscriptionDaysLeft();
  const endDate = subscription?.endDate?.toDate
    ? subscription.endDate.toDate()
    : subscription?.endDate ? new Date(subscription.endDate) : null;

  const handleUpgrade = (planId) => {
    navigation.navigate('PaymentMethod', { planId });
  };

  const handleRenew = () => {
    navigation.navigate('SubscriptionUpgrade', { reason: daysLeft <= 0 ? 'expired' : 'renew' });
  };

  const getPlanColor = (planId) => {
    const planColors = {
      free: colors.planFree,
      basic: colors.planBasic,
      premium: colors.planPremium,
    };
    return planColors[planId] || colors.textSecondary;
  };

  const getStatusColor = () => {
    if (!subscription) return colors.error;
    if (subscription.status === 'cancelled') return colors.error;
    if (daysLeft <= 0) return colors.error;
    if (daysLeft <= 7) return colors.warning;
    return colors.success;
  };

  const getStatusLabel = () => {
    if (!subscription) return 'Inactif';
    if (subscription.status === 'cancelled') return 'Annulé';
    if (daysLeft <= 0) return 'Expiré';
    return 'Actif';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Mon abonnement"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current plan */}
        <Card style={[styles.currentPlanCard, { borderColor: getPlanColor(currentPlan) }]}>
          <View style={styles.currentPlanHeader}>
            <View>
              <Text style={styles.currentPlanLabel}>Plan actuel</Text>
              <Text style={[styles.currentPlanName, { color: getPlanColor(currentPlan) }]}>
                {PLANS[currentPlan]?.name || 'Inconnu'}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          </View>

          {endDate && (
            <View style={styles.expiryRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.expiryText}>
                {daysLeft > 0
                  ? `Expire le ${moment(endDate).format('D MMMM YYYY')} (${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''})`
                  : `Expiré le ${moment(endDate).format('D MMMM YYYY')}`}
              </Text>
            </View>
          )}

          {subscription?.paymentMethod && (
            <View style={styles.paymentRow}>
              <Ionicons name="card-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.paymentText}>
                Paiement via: {subscription.paymentMethod}
              </Text>
            </View>
          )}

          {/* Limits */}
          <View style={styles.limitsContainer}>
            <Text style={styles.limitsTitle}>Limites du plan</Text>
            <LimitRow
              label="Produits"
              limit={PLANS[currentPlan]?.maxProducts}
            />
            <LimitRow
              label="Clients"
              limit={PLANS[currentPlan]?.maxClients}
            />
            <LimitRow
              label="Employés"
              limit={PLANS[currentPlan]?.maxEmployees}
            />
          </View>

          {/* Renew / Upgrade button */}
          <TouchableOpacity
            style={[styles.renewButton, { backgroundColor: getStatusColor() === colors.success ? `${colors.primary}15` : colors.errorBackground }]}
            onPress={handleRenew}
          >
            <Ionicons
              name="refresh-circle-outline"
              size={20}
              color={getStatusColor() === colors.success ? colors.primary : colors.error}
            />
            <Text style={[styles.renewButtonText, { color: getStatusColor() === colors.success ? colors.primary : colors.error }]}>
              {daysLeft <= 0 ? 'Renouveler l\'abonnement' : daysLeft <= 7 ? 'Renouveler maintenant' : 'Voir les plans / Upgrader'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={getStatusColor() === colors.success ? colors.primary : colors.error} />
          </TouchableOpacity>
        </Card>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Changer de plan</Text>
        <Text style={styles.sectionSubtitle}>
          Contactez l'administrateur pour changer votre plan.
        </Text>

        {Object.values(PLANS).map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const planColor = getPlanColor(plan.id);

          return (
            <Card
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && { borderColor: planColor, borderWidth: 2 },
              ]}
            >
              {isCurrentPlan && (
                <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
                  <Text style={styles.currentBadgeText}>Plan actuel</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, { color: planColor }]}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    {plan.price === 0 ? (
                      <Text style={styles.planPrice}>Gratuit</Text>
                    ) : (
                      <>
                        <Text style={[styles.planPrice, { color: planColor }]}>
                          ${plan.price}
                        </Text>
                        <Text style={styles.planPricePeriod}>/mois</Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.planDuration}>{plan.duration} jours</Text>
                </View>
                <View style={[styles.planIconContainer, { backgroundColor: `${planColor}15` }]}>
                  <Ionicons
                    name={plan.id === 'free' ? 'gift-outline' : plan.id === 'basic' ? 'star-outline' : 'diamond-outline'}
                    size={28}
                    color={planColor}
                  />
                </View>
              </View>

              {/* Features */}
              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Limits summary */}
              <View style={styles.planLimitsRow}>
                <PlanLimit icon="cube" label={plan.maxProducts === -1 ? '∞' : plan.maxProducts} sublabel="produits" />
                <PlanLimit icon="people" label={plan.maxClients === -1 ? '∞' : plan.maxClients} sublabel="clients" />
                <PlanLimit icon="person" label={plan.maxEmployees === -1 ? '∞' : plan.maxEmployees} sublabel="employés" />
              </View>

              {!isCurrentPlan && (
                <TouchableOpacity
                  style={[styles.upgradeButton, { backgroundColor: planColor }]}
                  onPress={() => handleUpgrade(plan.id)}
                >
                  <Text style={styles.upgradeButtonText}>
                    {plan.id === 'free' ? 'Rétrograder' : 'Passer à ce plan'}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const LimitRow = ({ label, limit }) => (
  <View style={limitRowStyles.container}>
    <Text style={limitRowStyles.label}>{label}:</Text>
    <Text style={limitRowStyles.value}>
      {limit === -1 ? 'Illimité' : limit}
    </Text>
  </View>
);

const limitRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

const PlanLimit = ({ icon, label, sublabel }) => (
  <View style={planLimitStyles.container}>
    <Ionicons name={icon} size={16} color={colors.textSecondary} />
    <Text style={planLimitStyles.value}>{label}</Text>
    <Text style={planLimitStyles.sublabel}>{sublabel}</Text>
  </View>
);

const planLimitStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 4,
  },
  sublabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  currentPlanCard: {
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderRadius: 16,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentPlanLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  expiryText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  paymentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  limitsContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  renewButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  planCard: {
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 1,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planPricePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  planDuration: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresList: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  planLimitsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 14,
    marginBottom: 16,
  },
  upgradeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  bottomPadding: {
    height: 24,
  },
});

export default SubscriptionScreen;
