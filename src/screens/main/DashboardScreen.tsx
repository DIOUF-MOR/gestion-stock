import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.abs(n) || 0) + ' FCFA';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const getPaymentIcon = (method: string): string => {
  switch (method) {
    case 'Espèces':      return 'cash-outline';
    case 'Mobile Money': return 'phone-portrait-outline';
    case 'Virement':     return 'swap-horizontal-outline';
    case 'Crédit':       return 'time-outline';
    default:             return 'card-outline';
  }
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({
  title,
  linkLabel,
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {linkLabel && (
      <TouchableOpacity onPress={onLink}>
        <Text style={styles.sectionLink}>{linkLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const QuickAction = ({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.qaIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon as any} size={26} color={color} />
    </View>
    <Text style={styles.qaLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main screen ───────────────────────────────────────────────────────────────

const DashboardScreen = ({ navigation }) => {
  const { userProfile, getSubscriptionDaysLeft } = useAuth();
  const {
    store, products, clients, employees, transactions, debts, loading,
    getLowStockProducts, getTotalRevenue, getTotalExpenses, getTotalProfit,
    getTotalReceivable, getStockValue,
  } = useStore();

  const [refreshing, setRefreshing] = React.useState(false);
  const [period, setPeriod] = React.useState<'week' | 'month' | 'year'>('month');

  const lowStock      = useMemo(() => getLowStockProducts(),        [products]);
  const revenue       = useMemo(() => getTotalRevenue(period),      [transactions, period]);
  const expenses      = useMemo(() => getTotalExpenses(period),     [transactions, period]);
  const profit        = useMemo(() => getTotalProfit(period),       [transactions, period]);
  const receivable    = useMemo(() => getTotalReceivable(),          [debts]);
  const stockValue    = useMemo(() => getStockValue(),              [products]);
  const daysLeft      = getSubscriptionDaysLeft();

  const overdueDebts  = useMemo(
    () => debts.filter(d => !d.isPaid && d.dueDate && (() => {
      const due = d.dueDate?.toDate ? d.dueDate.toDate() : new Date(d.dueDate);
      return due < new Date();
    })()),
    [debts]
  );

  const clientsWithDebt = useMemo(
    () => clients.filter(c => (c.totalDebt || 0) > 0).length,
    [clients]
  );

  const recentTx = useMemo(
    () => transactions.slice(0, 4),
    [transactions]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) return <LoadingSpinner fullScreen message="Chargement..." />;

  const periodLabel = period === 'week' ? '7 derniers jours'
    : period === 'month' ? 'Ce mois-ci'
    : 'Cette année';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >

        {/* ── Greeting ── */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingLeft}>
            <Text style={styles.greetingText}>
              {greeting()}, {userProfile?.name?.split(' ')[0]}
            </Text>
            <Text style={styles.greetingDate}>{moment().format('dddd D MMMM YYYY')}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Paramètres')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Store pill ── */}
        <View style={styles.storePill}>
          <Ionicons name="storefront-outline" size={15} color={colors.primary} />
          <Text style={styles.storeName} numberOfLines={1}>{store?.name || 'Ma boutique'}</Text>
        </View>

        {/* ── Subscription warning ── */}
        {daysLeft <= 7 && daysLeft > 0 && (
          <TouchableOpacity
            style={styles.subWarning}
            onPress={() => navigation.navigate('Paramètres', { screen: 'Subscription' })}
          >
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={styles.subWarningText}>
              Abonnement expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* ── Alertes (stock + dettes en retard) ── */}
        {(lowStock.length > 0 || overdueDebts.length > 0) && (
          <>
            <SectionHeader title="Alertes" />
            <View style={styles.alertsRow}>
              {lowStock.length > 0 && (
                <TouchableOpacity
                  style={[styles.alertCard, { borderColor: `${colors.error}30`, backgroundColor: colors.errorBackground }]}
                  onPress={() => navigation.navigate('Stock')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.alertCardIcon, { backgroundColor: `${colors.error}20` }]}>
                    <Ionicons name="cube-outline" size={20} color={colors.error} />
                  </View>
                  <Text style={[styles.alertCardNum, { color: colors.error }]}>{lowStock.length}</Text>
                  <Text style={styles.alertCardLabel}>Stock{lowStock.length > 1 ? 's' : ''} faible{lowStock.length > 1 ? 's' : ''}</Text>
                  <View style={styles.alertCardArrow}>
                    <Ionicons name="chevron-forward" size={13} color={colors.error} />
                  </View>
                </TouchableOpacity>
              )}
              {overdueDebts.length > 0 && (
                <TouchableOpacity
                  style={[styles.alertCard, { borderColor: `${colors.warning}30`, backgroundColor: colors.warningBackground }]}
                  onPress={() => navigation.navigate('Finance', { screen: 'Debts' })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.alertCardIcon, { backgroundColor: `${colors.warning}20` }]}>
                    <Ionicons name="time-outline" size={20} color={colors.warning} />
                  </View>
                  <Text style={[styles.alertCardNum, { color: colors.warning }]}>{overdueDebts.length}</Text>
                  <Text style={styles.alertCardLabel}>Dette{overdueDebts.length > 1 ? 's' : ''} en retard</Text>
                  <View style={styles.alertCardArrow}>
                    <Ionicons name="chevron-forward" size={13} color={colors.warning} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Carte Finance ── */}
        <View style={styles.financeCard}>
          {/* Period tabs inside card */}
          <View style={styles.financeHeader}>
            <Text style={styles.financeCardTitle}>Finances</Text>
            <View style={styles.periodTabs}>
              {(['week', 'month', 'year'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, period === p && styles.periodTabActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                    {p === 'week' ? '7j' : p === 'month' ? 'Mois' : 'An'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Profit hero */}
          <View style={[styles.profitHero, { backgroundColor: profit >= 0 ? `${colors.primary}08` : `${colors.error}08` }]}>
            <Text style={styles.profitLabel}>Bénéfice net · {periodLabel}</Text>
            <Text style={[styles.profitValue, { color: profit >= 0 ? colors.primary : colors.error }]}>
              {profit >= 0 ? '+' : '-'}{fmt(profit)}
            </Text>
            <View style={[styles.profitBar, { backgroundColor: profit >= 0 ? `${colors.primary}20` : `${colors.error}20` }]}>
              <View
                style={[
                  styles.profitBarFill,
                  {
                    width: revenue > 0 ? `${Math.min(100, ((revenue - expenses) / revenue) * 100)}%` as any : '0%',
                    backgroundColor: profit >= 0 ? colors.primary : colors.error,
                  },
                ]}
              />
            </View>
          </View>

          {/* Revenue / Expenses / Receivable */}
          <View style={styles.financeStats}>
            <View style={styles.financeStat}>
              <View style={[styles.financeStatIcon, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="trending-up" size={15} color={colors.success} />
              </View>
              <Text style={styles.financeStatLabel}>Revenus</Text>
              <Text style={[styles.financeStatValue, { color: colors.success }]}>{fmt(revenue)}</Text>
            </View>

            <View style={styles.financeStatDivider} />

            <View style={styles.financeStat}>
              <View style={[styles.financeStatIcon, { backgroundColor: `${colors.error}15` }]}>
                <Ionicons name="trending-down" size={15} color={colors.error} />
              </View>
              <Text style={styles.financeStatLabel}>Dépenses</Text>
              <Text style={[styles.financeStatValue, { color: colors.error }]}>{fmt(expenses)}</Text>
            </View>

            <View style={styles.financeStatDivider} />

            <View style={styles.financeStat}>
              <View style={[styles.financeStatIcon, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="wallet-outline" size={15} color={colors.warning} />
              </View>
              <Text style={styles.financeStatLabel}>À recevoir</Text>
              <Text style={[styles.financeStatValue, { color: colors.warning }]}>{fmt(receivable)}</Text>
            </View>
          </View>
        </View>

        {/* ── Vue d'ensemble ── */}
        <SectionHeader title="Vue d'ensemble" />
        <View style={styles.statsGrid}>
          {/* Produits */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Stock')}
            activeOpacity={0.8}
          >
            <View style={[styles.statCardIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="cube-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statCardValue}>{products.length}</Text>
            <Text style={styles.statCardTitle}>Produits</Text>
            <Text style={styles.statCardSub}>{fmt(stockValue)}</Text>
          </TouchableOpacity>

          {/* Clients */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Clients')}
            activeOpacity={0.8}
          >
            <View style={[styles.statCardIcon, { backgroundColor: `${colors.secondary}15` }]}>
              <Ionicons name="people-outline" size={22} color={colors.secondary} />
            </View>
            <Text style={styles.statCardValue}>{clients.length}</Text>
            <Text style={styles.statCardTitle}>Clients</Text>
            {clientsWithDebt > 0 ? (
              <Text style={[styles.statCardSub, { color: colors.warning }]}>
                {clientsWithDebt} débiteur{clientsWithDebt > 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.statCardSub}>Aucune dette</Text>
            )}
          </TouchableOpacity>

          {/* Employés */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Plus', { screen: 'EmployeesMain' })}
            activeOpacity={0.8}
          >
            <View style={[styles.statCardIcon, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="person-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.statCardValue}>{employees.length}</Text>
            <Text style={styles.statCardTitle}>Employés</Text>
            <Text style={styles.statCardSub}>Actifs</Text>
          </TouchableOpacity>

          {/* Stock faible */}
          <TouchableOpacity
            style={[styles.statCard, lowStock.length > 0 && styles.statCardDanger]}
            onPress={() => navigation.navigate('Stock')}
            activeOpacity={0.8}
          >
            <View style={[
              styles.statCardIcon,
              { backgroundColor: `${lowStock.length > 0 ? colors.error : colors.success}15` },
            ]}>
              <Ionicons
                name={lowStock.length > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={22}
                color={lowStock.length > 0 ? colors.error : colors.success}
              />
            </View>
            <Text style={[
              styles.statCardValue,
              { color: lowStock.length > 0 ? colors.error : colors.success },
            ]}>
              {lowStock.length}
            </Text>
            <Text style={styles.statCardTitle}>Stock faible</Text>
            <Text style={styles.statCardSub}>
              {lowStock.length === 0 ? 'Tout est OK' : `${lowStock.length} produit${lowStock.length > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Transactions récentes ── */}
        {recentTx.length > 0 && (
          <>
            <SectionHeader
              title="Transactions récentes"
              linkLabel="Voir tout"
              onLink={() => navigation.navigate('Finance', { screen: 'Transactions' })}
            />
            <View style={styles.txList}>
              {recentTx.map((tx) => {
                const isRevenue = tx.type === 'revenue';
                const d = tx.date?.toDate ? tx.date.toDate() : tx.date ? new Date(tx.date) : null;
                const dateStr = d ? moment(d).format('D MMM') : '—';
                return (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: `${isRevenue ? colors.success : colors.error}12` }]}>
                      <Ionicons
                        name={getPaymentIcon(tx.paymentMethod) as any}
                        size={16}
                        color={isRevenue ? colors.success : colors.error}
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>
                        {tx.description || tx.category || (isRevenue ? 'Revenu' : 'Dépense')}
                      </Text>
                      <Text style={styles.txMeta}>{dateStr} · {tx.paymentMethod || '—'}</Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isRevenue ? colors.success : colors.error }]}>
                      {isRevenue ? '+' : '-'}{fmt(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Actions rapides ── */}
        <SectionHeader title="Actions rapides" />
        <View style={styles.qaGrid}>
          <QuickAction
            icon="cart-outline"
            label="Nouvelle vente"
            color={colors.success}
            onPress={() => navigation.navigate('Finance', { screen: 'NewSale' })}
          />
          <QuickAction
            icon="cube-outline"
            label="Ajouter produit"
            color={colors.primary}
            onPress={() => navigation.navigate('Stock', { screen: 'AddProduct' })}
          />
          <QuickAction
            icon="person-add-outline"
            label="Nouveau client"
            color={colors.secondary}
            onPress={() => navigation.navigate('Clients', { screen: 'AddClient' })}
          />
          <QuickAction
            icon="remove-circle-outline"
            label="Ajouter dépense"
            color={colors.error}
            onPress={() => navigation.navigate('Finance', {
              screen: 'AddTransaction',
              params: { type: 'expense' },
            })}
          />
          <QuickAction
            icon="time-outline"
            label="Crédit client"
            color={colors.warning}
            onPress={() => navigation.navigate('Finance', { screen: 'AddDebt' })}
          />
          <QuickAction
            icon="bar-chart-outline"
            label="Rapports"
            color={colors.accent}
            onPress={() => navigation.navigate('Plus', { screen: 'Reports' })}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingLeft: { flex: 1 },
  greetingText: { fontSize: 23, fontWeight: '800', color: colors.textPrimary },
  greetingDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    textTransform: 'capitalize',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Store pill
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}12`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
    gap: 6,
  },
  storeName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Subscription warning
  subWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.warning}35`,
  },
  subWarningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Alertes
  alertsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  alertCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  alertCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  alertCardNum: {
    fontSize: 22,
    fontWeight: '800',
  },
  alertCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertCardArrow: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // Finance card
  financeCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  financeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  financeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
    gap: 2,
  },
  periodTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodTabActive: { backgroundColor: colors.primary },
  periodTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  periodTabTextActive: { color: colors.textInverse },

  // Profit hero
  profitHero: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  profitLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  profitBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  profitBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Finance stats row
  financeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financeStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  financeStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  financeStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  financeStatValue: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  financeStatDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.divider,
    marginHorizontal: 4,
  },

  // Stats grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardDanger: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: `${colors.error}20`,
  },
  statCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statCardSub: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 3,
    fontWeight: '500',
  },

  // Recent transactions
  txList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  txIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  txMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '800', flexShrink: 0 },

  // Quick actions
  qaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  qaBtn: {
    width: '30.5%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default DashboardScreen;
