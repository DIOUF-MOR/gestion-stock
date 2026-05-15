import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { getAllPayments } from '../../services/subscriptionService';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const PaymentsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const result = await getAllPayments();
    if (result.success) {
      setPayments(result.payments);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const totalRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const revenueThisMonth = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return payments
      .filter(p => {
        const date = p.date?.toDate ? p.date.toDate() : new Date(p.date);
        return date >= startOfMonth;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const getPlanName = (planId) => {
    const plans = { free: 'Gratuit', basic: 'Basique', premium: 'Premium' };
    return plans[planId] || planId;
  };

  const getPlanColor = (planId) => {
    const planColors = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return planColors[planId] || colors.textSecondary;
  };

  const getMethodIcon = (method) => {
    if (method?.toLowerCase().includes('mobile')) return 'phone-portrait-outline';
    if (method?.toLowerCase().includes('virement') || method?.toLowerCase().includes('bank')) return 'business-outline';
    return 'cash-outline';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const renderPayment = ({ item }) => {
    const date = item.date?.toDate ? item.date.toDate() : item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.date || item.createdAt);

    return (
      <Card style={styles.paymentCard}>
        <View style={styles.paymentContent}>
          <View style={[styles.paymentIcon, { backgroundColor: `${getPlanColor(item.plan)}15` }]}>
            <Ionicons name={getMethodIcon(item.method)} size={22} color={getPlanColor(item.plan)} />
          </View>

          <View style={styles.paymentInfo}>
            <View style={styles.paymentTopRow}>
              <View style={[styles.planBadge, { backgroundColor: `${getPlanColor(item.plan)}20` }]}>
                <Text style={[styles.planBadgeText, { color: getPlanColor(item.plan) }]}>
                  {getPlanName(item.plan)}
                </Text>
              </View>
              <Text style={styles.paymentDate}>{moment(date).format('D MMM YYYY')}</Text>
            </View>
            <Text style={styles.paymentMethod}>{item.method || 'Espèces'}</Text>
            {item.reference && (
              <Text style={styles.paymentRef}>Réf: {item.reference}</Text>
            )}
          </View>

          <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Paiements"
        onBack={() => navigation.goBack()}
      />

      {/* Revenue summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="cash-outline" size={20} color={colors.success} />
          <Text style={styles.summaryLabel}>Total revenus</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.summaryLabel}>Ce mois</Text>
          <Text style={[styles.summaryAmount, { color: colors.primary }]}>
            {formatCurrency(revenueThisMonth)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="receipt-outline" size={20} color={colors.accent} />
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={[styles.summaryAmount, { color: colors.accent }]}>
            {payments.length}
          </Text>
        </View>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={renderPayment}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Aucun paiement"
            message="Aucun paiement enregistré pour l'instant."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  paymentCard: {
    marginBottom: 10,
  },
  paymentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentMethod: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentRef: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
});

export default PaymentsScreen;
