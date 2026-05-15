import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { PLANS } from '../../../firebase.config';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const PLAN_ICONS = {
  free: 'gift-outline',
  basic: 'star-outline',
  premium: 'diamond-outline',
};

const SubscriptionUpgradeScreen = ({ navigation, route }) => {
  const { subscription, getSubscriptionDaysLeft } = useAuth();
  const { products, clients, employees } = useStore();

  const currentPlan = subscription?.plan || 'free';
  const daysLeft = getSubscriptionDaysLeft();
  const triggerReason = route.params?.reason || 'expired'; // 'expired' | 'limit'
  const limitType = route.params?.limitType || null; // 'products' | 'clients' | 'employees'

  const getPlanColor = (planId) => {
    const map = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return map[planId] || colors.textSecondary;
  };

  const getCurrentUsage = () => {
    const current = PLANS[currentPlan];
    return {
      products: { current: products.length, max: current?.maxProducts },
      clients: { current: clients.length, max: current?.maxClients },
      employees: { current: employees.length, max: current?.maxEmployees },
    };
  };

  const usage = getCurrentUsage();

  const handleSelectPlan = (planId) => {
    if (planId === currentPlan) return;
    navigation.navigate('PaymentMethod', { planId });
  };

  const getReasonMessage = () => {
    if (triggerReason === 'limit') {
      const labels = { products: 'produits', clients: 'clients', employees: 'employés' };
      return `Vous avez atteint la limite de ${labels[limitType] || 'votre plan actuel'}. Passez à un plan supérieur pour continuer.`;
    }
    if (daysLeft <= 0) {
      return 'Votre abonnement a expiré. Renouvelez maintenant pour continuer à utiliser toutes les fonctionnalités.';
    }
    return `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Renouvelez ou améliorez votre plan.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Plans d'abonnement"
        subtitle="Choisissez votre plan"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Alert banner */}
        <View style={[styles.alertBanner, daysLeft <= 0 ? styles.alertBannerExpired : styles.alertBannerWarning]}>
          <Ionicons
            name={daysLeft <= 0 ? 'lock-closed-outline' : 'warning-outline'}
            size={20}
            color={daysLeft <= 0 ? colors.error : colors.warning}
          />
          <Text style={[styles.alertText, daysLeft <= 0 ? styles.alertTextExpired : styles.alertTextWarning]}>
            {getReasonMessage()}
          </Text>
        </View>

        {/* Current usage */}
        <Card style={styles.usageCard}>
          <Text style={styles.usageTitle}>Utilisation actuelle ({PLANS[currentPlan]?.name})</Text>
          <UsageRow
            label="Produits"
            current={usage.products.current}
            max={usage.products.max}
            highlighted={limitType === 'products'}
          />
          <UsageRow
            label="Clients"
            current={usage.clients.current}
            max={usage.clients.max}
            highlighted={limitType === 'clients'}
          />
          <UsageRow
            label="Employés"
            current={usage.employees.current}
            max={usage.employees.max}
            highlighted={limitType === 'employees'}
          />
        </Card>

        {/* Plan cards */}
        <Text style={styles.sectionTitle}>Choisir un plan</Text>

        {Object.values(PLANS).map(plan => {
          const isCurrentPlan = plan.id === currentPlan;
          const planColor = getPlanColor(plan.id);
          const isPremium = plan.id === 'premium';

          return (
            <Card
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && { borderColor: planColor, borderWidth: 2 },
                isPremium && styles.premiumCard,
              ]}
            >
              {isPremium && (
                <View style={styles.recommendedBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.recommendedText}>Recommandé</Text>
                </View>
              )}
              {isCurrentPlan && (
                <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
                  <Text style={styles.currentBadgeText}>Plan actuel</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={[styles.planIconBox, { backgroundColor: `${planColor}15` }]}>
                  <Ionicons name={PLAN_ICONS[plan.id]} size={26} color={planColor} />
                </View>
                <View style={styles.planHeaderInfo}>
                  <Text style={[styles.planName, { color: planColor }]}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    {plan.price === 0 ? (
                      <Text style={styles.planPrice}>Gratuit</Text>
                    ) : (
                      <>
                        <Text style={[styles.planPrice, { color: planColor }]}>{plan.price}</Text>
                        <Text style={styles.planPriceCurrency}> FCFA/mois</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Limits comparison */}
              <View style={styles.limitsGrid}>
                <LimitCell
                  icon="cube"
                  value={plan.maxProducts === -1 ? '∞' : plan.maxProducts}
                  label="produits"
                  color={planColor}
                />
                <LimitCell
                  icon="people"
                  value={plan.maxClients === -1 ? '∞' : plan.maxClients}
                  label="clients"
                  color={planColor}
                />
                <LimitCell
                  icon="person"
                  value={plan.maxEmployees === -1 ? '∞' : plan.maxEmployees}
                  label="employés"
                  color={planColor}
                />
              </View>

              {/* Features */}
              <View style={styles.featuresSection}>
                {plan.features.slice(0, 4).map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {!isCurrentPlan ? (
                <TouchableOpacity
                  style={[styles.selectBtn, { backgroundColor: planColor }]}
                  onPress={() => handleSelectPlan(plan.id)}
                >
                  <Text style={styles.selectBtnText}>
                    {plan.price === 0 ? 'Sélectionner' : `Passer au plan ${plan.name}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.currentPlanBtn, { borderColor: planColor }]}>
                  <Text style={[styles.currentPlanBtnText, { color: planColor }]}>Plan actuel</Text>
                </View>
              )}
            </Card>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const UsageRow = ({ label, current, max, highlighted }) => {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / (max || 1)) * 100));
  const isAtLimit = !isUnlimited && current >= max;

  return (
    <View style={[styles.usageRow, highlighted && styles.usageRowHighlighted]}>
      <Text style={[styles.usageLabel, highlighted && styles.usageLabelHighlighted]}>{label}</Text>
      <View style={styles.usageBarContainer}>
        <View
          style={[
            styles.usageBar,
            {
              width: `${isUnlimited ? 0 : percentage}%`,
              backgroundColor: isAtLimit ? colors.error : colors.primary,
            },
          ]}
        />
      </View>
      <Text style={[styles.usageCount, isAtLimit && styles.usageCountAtLimit]}>
        {current}/{isUnlimited ? '∞' : max}
      </Text>
    </View>
  );
};

const LimitCell = ({ icon, value, label, color }) => (
  <View style={styles.limitCell}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.limitValue, { color }]}>{value}</Text>
    <Text style={styles.limitLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  alertBannerExpired: {
    backgroundColor: colors.errorBackground,
  },
  alertBannerWarning: {
    backgroundColor: colors.warningBackground,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  alertTextExpired: {
    color: colors.error,
  },
  alertTextWarning: {
    color: colors.warning,
  },
  usageCard: {
    padding: 16,
    marginBottom: 20,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    padding: 6,
    borderRadius: 8,
  },
  usageRowHighlighted: {
    backgroundColor: colors.errorBackground,
  },
  usageLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    width: 60,
  },
  usageLabelHighlighted: {
    color: colors.error,
    fontWeight: '700',
  },
  usageBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBar: {
    height: '100%',
    borderRadius: 3,
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    width: 48,
    textAlign: 'right',
  },
  usageCountAtLimit: {
    color: colors.error,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  planCard: {
    padding: 18,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  premiumCard: {
    borderColor: colors.planPremium,
    borderWidth: 1.5,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A2A54',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  planIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planHeaderInfo: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  planPriceCurrency: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  limitsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 12,
    marginBottom: 14,
  },
  limitCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  limitLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  featuresSection: {
    marginBottom: 16,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  selectBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  currentPlanBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  currentPlanBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 32,
  },
});

export default SubscriptionUpgradeScreen;
