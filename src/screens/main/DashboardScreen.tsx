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
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const DashboardScreen = ({ navigation }) => {
  const { userProfile, subscription, getSubscriptionDaysLeft } = useAuth();
  const {
    store,
    products,
    clients,
    employees,
    loading,
    getLowStockProducts,
    getTotalRevenue,
    getTotalExpenses,
    getTotalProfit,
    getTotalReceivable,
    getTotalPayable,
    getStockValue,
  } = useStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const lowStockProducts = useMemo(() => getLowStockProducts(), [products]);
  const revenue = useMemo(() => getTotalRevenue('month'), []);
  const expenses = useMemo(() => getTotalExpenses('month'), []);
  const profit = useMemo(() => getTotalProfit('month'), []);
  const receivable = useMemo(() => getTotalReceivable(), []);
  const stockValue = useMemo(() => getStockValue(), [products]);
  const daysLeft = getSubscriptionDaysLeft();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement du tableau de bord..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour, {userProfile?.name?.split(' ')[0]} 👋
            </Text>
            <Text style={styles.date}>{moment().format('dddd D MMMM YYYY')}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifButton}
            onPress={() => navigation.navigate('Paramètres')}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Subscription warning */}
        {daysLeft <= 7 && daysLeft > 0 && (
          <TouchableOpacity
            style={styles.warningBanner}
            onPress={() => navigation.navigate('Paramètres', { screen: 'Subscription' })}
          >
            <Ionicons name="warning-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>
              Votre abonnement expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* Store name */}
        <View style={styles.storeHeader}>
          <Ionicons name="storefront" size={20} color={colors.primary} />
          <Text style={styles.storeName}>{store?.name || 'Ma Boutique'}</Text>
        </View>

        {/* Financial Stats */}
        <Text style={styles.sectionTitle}>Finances ce mois</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Revenus"
            value={formatCurrency(revenue)}
            icon="trending-up"
            iconColor={colors.success}
            color={colors.success}
            style={styles.statCard}
          />
          <StatCard
            title="Dépenses"
            value={formatCurrency(expenses)}
            icon="trending-down"
            iconColor={colors.error}
            color={colors.error}
            style={styles.statCard}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Bénéfice Net"
            value={formatCurrency(profit)}
            icon="cash-outline"
            iconColor={profit >= 0 ? colors.primary : colors.error}
            color={profit >= 0 ? colors.primary : colors.error}
            style={styles.statCard}
          />
          <StatCard
            title="À recevoir"
            value={formatCurrency(receivable)}
            icon="wallet-outline"
            iconColor={colors.warning}
            color={colors.warning}
            style={styles.statCard}
          />
        </View>

        {/* Business Stats */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Produits"
            value={products.length.toString()}
            icon="cube-outline"
            iconColor={colors.primary}
            subtitle={`Valeur: ${formatCurrency(stockValue)}`}
            style={styles.statCard}
            onPress={() => navigation.navigate('Stock')}
          />
          <StatCard
            title="Clients"
            value={clients.length.toString()}
            icon="people-outline"
            iconColor={colors.secondary}
            style={styles.statCard}
            onPress={() => navigation.navigate('Clients')}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Employés"
            value={employees.length.toString()}
            icon="person-outline"
            iconColor={colors.accent}
            style={styles.statCard}
            onPress={() => navigation.navigate('Employees')}
          />
          <StatCard
            title="Stock faible"
            value={lowStockProducts.length.toString()}
            icon="alert-circle-outline"
            iconColor={lowStockProducts.length > 0 ? colors.error : colors.success}
            color={lowStockProducts.length > 0 ? colors.error : colors.success}
            style={styles.statCard}
          />
        </View>

        {/* Low stock alerts */}
        {lowStockProducts.length > 0 && (
          <>
            <View style={styles.alertHeader}>
              <Text style={styles.sectionTitle}>Alertes Stock Faible</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Stock')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {lowStockProducts.slice(0, 5).map((product) => (
              <Card
                key={product.id}
                style={styles.alertCard}
                onPress={() => navigation.navigate('Stock', {
                  screen: 'ProductDetail',
                  params: { productId: product.id },
                })}
              >
                <View style={styles.alertCardContent}>
                  <View style={styles.alertIconContainer}>
                    <Ionicons name="cube" size={24} color={colors.error} />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertProductName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.alertStock}>
                      Stock: {product.quantity} {product.unit || 'unité(s)'}
                    </Text>
                  </View>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>Faible</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon="add-circle"
            label="Ajouter produit"
            color={colors.primary}
            onPress={() => navigation.navigate('Stock', { screen: 'AddProduct' })}
          />
          <QuickAction
            icon="person-add"
            label="Nouveau client"
            color={colors.secondary}
            onPress={() => navigation.navigate('Clients', { screen: 'AddClient' })}
          />
          <QuickAction
            icon="cash"
            label="Enregistrer vente"
            color={colors.success}
            onPress={() => navigation.navigate('Finance', {
              screen: 'AddTransaction',
              params: { type: 'revenue' },
            })}
          />
          <QuickAction
            icon="receipt"
            label="Ajouter dépense"
            color={colors.error}
            onPress={() => navigation.navigate('Finance', {
              screen: 'AddTransaction',
              params: { type: 'expense' },
            })}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.quickActionLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    marginHorizontal: 10,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  seeAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  alertCard: {
    marginBottom: 8,
  },
  alertCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertStock: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  alertBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 24,
  },
});

export default DashboardScreen;
