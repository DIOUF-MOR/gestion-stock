import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import Card from '../../../components/common/Card';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Header from '../../../components/common/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const FinanceScreen = ({ navigation }) => {
  const {
    transactions,
    loading,
    getTotalRevenue,
    getTotalExpenses,
    getTotalProfit,
    getTotalReceivable,
    getTotalPayable,
  } = useStore();

  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const revenue = useMemo(() => getTotalRevenue(selectedPeriod), [transactions, selectedPeriod]);
  const expenses = useMemo(() => getTotalExpenses(selectedPeriod), [transactions, selectedPeriod]);
  const profit = useMemo(() => getTotalProfit(selectedPeriod), [transactions, selectedPeriod]);
  const receivable = useMemo(() => getTotalReceivable(), []);
  const payable = useMemo(() => getTotalPayable(), []);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthlyRevenue = new Array(12).fill(0);
    const monthlyExpenses = new Array(12).fill(0);

    transactions.forEach(t => {
      const date = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (date.getFullYear() === currentYear) {
        const month = date.getMonth();
        if (t.type === 'revenue') monthlyRevenue[month] += t.amount || 0;
        else if (t.type === 'expense') monthlyExpenses[month] += t.amount || 0;
      }
    });

    return { monthlyRevenue, monthlyExpenses };
  }, [transactions]);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M FCFA`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K FCFA`;
    return `${(amount || 0).toFixed(0)} FCFA`;
  };

  const chartData = {
    labels: MONTHS_FR.slice(0, new Date().getMonth() + 1),
    datasets: [
      {
        data: monthlyData.monthlyRevenue.slice(0, new Date().getMonth() + 1),
        color: () => colors.success,
      },
      {
        data: monthlyData.monthlyExpenses.slice(0, new Date().getMonth() + 1),
        color: () => colors.error,
      },
    ],
    legend: ['Revenus', 'Dépenses'],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 134, 171, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: colors.primary },
    barPercentage: 0.6,
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const periods = [
    { key: 'week', label: 'Semaine' },
    { key: 'month', label: 'Mois' },
    { key: 'year', label: 'Année' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Finance"
        subtitle="Tableau de bord"
        accentColor={colors.success}
        showShadow
        rightActions={[{
          icon: 'add',
          onPress: () => navigation.navigate('AddTransaction', { type: 'revenue' }),
          color: colors.success,
          variant: 'filled',
        }]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodTab, selectedPeriod === p.key && styles.periodTabActive]}
              onPress={() => setSelectedPeriod(p.key)}
            >
              <Text style={[styles.periodTabText, selectedPeriod === p.key && styles.periodTabTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Financial summary */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="trending-up" size={20} color={colors.success} />
              </View>
              <Text style={styles.summaryLabel}>Revenus</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.success }]}>
              {formatCurrency(revenue)}
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.error}15` }]}>
                <Ionicons name="trending-down" size={20} color={colors.error} />
              </View>
              <Text style={styles.summaryLabel}>Dépenses</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(expenses)}
            </Text>
          </Card>
        </View>

        {/* Profit card */}
        <Card style={[styles.profitCard, { borderLeftColor: profit >= 0 ? colors.primary : colors.error }]}>
          <View style={styles.profitRow}>
            <View>
              <Text style={styles.profitLabel}>Bénéfice net</Text>
              <Text style={[styles.profitAmount, { color: profit >= 0 ? colors.primary : colors.error }]}>
                {formatCurrency(profit)}
              </Text>
            </View>
            <View style={[styles.profitIcon, { backgroundColor: profit >= 0 ? `${colors.primary}15` : `${colors.error}15` }]}>
              <Ionicons
                name={profit >= 0 ? 'trending-up' : 'trending-down'}
                size={28}
                color={profit >= 0 ? colors.primary : colors.error}
              />
            </View>
          </View>
        </Card>

        {/* Debts summary */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard} onPress={() => navigation.navigate('Debts')}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="arrow-down-circle" size={20} color={colors.warning} />
              </View>
              <Text style={styles.summaryLabel}>À recevoir</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.warning }]}>
              {formatCurrency(receivable)}
            </Text>
          </Card>

          <Card style={styles.summaryCard} onPress={() => navigation.navigate('Debts')}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: `${colors.error}15` }]}>
                <Ionicons name="arrow-up-circle" size={20} color={colors.error} />
              </View>
              <Text style={styles.summaryLabel}>À payer</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(payable)}
            </Text>
          </Card>
        </View>

        {/* Monthly chart */}
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Évolution annuelle</Text>
          {transactions.length > 0 ? (
            <BarChart
              data={chartData}
              width={SCREEN_WIDTH - 64}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showLegend
              withInnerLines={false}
            />
          ) : (
            <View style={styles.noChartData}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textDisabled} />
              <Text style={styles.noChartText}>Pas encore de données</Text>
            </View>
          )}
        </Card>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard
            icon="add-circle"
            label="Nouvelle vente"
            color={colors.success}
            onPress={() => navigation.navigate('AddTransaction', { type: 'revenue' })}
          />
          <ActionCard
            icon="remove-circle"
            label="Nouvelle dépense"
            color={colors.error}
            onPress={() => navigation.navigate('AddTransaction', { type: 'expense' })}
          />
          <ActionCard
            icon="list"
            label="Transactions"
            color={colors.primary}
            onPress={() => navigation.navigate('Transactions')}
          />
          <ActionCard
            icon="wallet"
            label="Dettes"
            color={colors.warning}
            onPress={() => navigation.navigate('Debts')}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const ActionCard = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: colors.textInverse,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
  },
  summaryIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  profitCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    padding: 16,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  profitAmount: {
    fontSize: 28,
    fontWeight: '800',
  },
  profitIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    marginBottom: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
  },
  noChartData: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noChartText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 24,
  },
});

export default FinanceScreen;
