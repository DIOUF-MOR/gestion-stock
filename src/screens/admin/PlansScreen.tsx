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
import { PLANS } from '../../../firebase.config';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';

const PlansScreen = ({ navigation }) => {
  const getPlanColor = (planId) => {
    const planColors = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return planColors[planId] || colors.textSecondary;
  };

  const getPlanIcon = (planId) => {
    const icons = { free: 'gift-outline', basic: 'star-outline', premium: 'diamond-outline' };
    return icons[planId] || 'pricetag-outline';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Plans d'abonnement"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Consultez et gérez les plans d'abonnement disponibles.
        </Text>

        {Object.values(PLANS).map((plan) => {
          const planColor = getPlanColor(plan.id);

          return (
            <Card key={plan.id} style={[styles.planCard, { borderLeftColor: planColor }]}>
              {/* Header */}
              <View style={styles.planHeader}>
                <View style={[styles.planIconContainer, { backgroundColor: `${planColor}15` }]}>
                  <Ionicons name={getPlanIcon(plan.id)} size={32} color={planColor} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: planColor }]}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.price === 0 ? 'Gratuit' : `$${plan.price}/mois`}
                  </Text>
                  <Text style={styles.planDuration}>Durée: {plan.duration} jours</Text>
                </View>
              </View>

              {/* Limits */}
              <View style={styles.limitsSection}>
                <Text style={styles.limitsTitle}>Limites</Text>
                <View style={styles.limitsGrid}>
                  <LimitItem
                    icon="cube-outline"
                    label="Produits"
                    value={plan.maxProducts === -1 ? 'Illimité' : plan.maxProducts}
                    color={planColor}
                  />
                  <LimitItem
                    icon="people-outline"
                    label="Clients"
                    value={plan.maxClients === -1 ? 'Illimité' : plan.maxClients}
                    color={planColor}
                  />
                  <LimitItem
                    icon="person-outline"
                    label="Employés"
                    value={plan.maxEmployees === -1 ? 'Illimité' : plan.maxEmployees}
                    color={planColor}
                  />
                </View>
              </View>

              {/* Features */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Fonctionnalités</Text>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={planColor} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={24} color={colors.info} />
            <Text style={styles.infoTitle}>Comment gérer les abonnements</Text>
          </View>
          <Text style={styles.infoText}>
            Pour activer ou modifier l'abonnement d'un vendeur, allez dans{' '}
            <Text style={styles.infoLink}>Abonnés</Text> et sélectionnez le vendeur concerné.
            Vous pourrez ensuite choisir le plan, enregistrer le paiement et activer l'abonnement.
          </Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => navigation.navigate('Subscribers')}
          >
            <Text style={styles.infoButtonText}>Gérer les abonnés</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const LimitItem = ({ icon, label, value, color }) => (
  <View style={limitItemStyles.container}>
    <View style={[limitItemStyles.iconContainer, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={limitItemStyles.value}>{value}</Text>
    <Text style={limitItemStyles.label}>{label}</Text>
  </View>
);

const limitItemStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
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
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  planCard: {
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planDuration: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  limitsSection: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 14,
    textAlign: 'center',
  },
  limitsGrid: {
    flexDirection: 'row',
  },
  featuresSection: {},
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
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
  infoCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: `${colors.info}08`,
    borderWidth: 1,
    borderColor: `${colors.info}30`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  infoLink: {
    fontWeight: '700',
    color: colors.primary,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomPadding: {
    height: 24,
  },
});

export default PlansScreen;
