import React, { useState, useEffect } from 'react';
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
import { logoutUser } from '../../services/authService';
import { getAdminStats } from '../../services/subscriptionService';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const AdminDashboardScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const result = await getAdminStats();
    if (result.success) {
      setStats(result.stats);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) return <LoadingSpinner fullScreen message="Chargement des statistiques..." />;

  const adminMenuItems = [
    {
      icon: 'people',
      label: 'Abonnés',
      subtitle: `${stats?.totalVendors || 0} vendeurs`,
      color: colors.primary,
      onPress: () => navigation.navigate('Subscribers'),
    },
    {
      icon: 'cash',
      label: 'Paiements',
      subtitle: `${stats?.totalPayments || 0} transactions`,
      color: colors.success,
      onPress: () => navigation.navigate('Payments'),
    },
    {
      icon: 'pricetag',
      label: 'Plans',
      subtitle: 'Gérer les offres',
      color: colors.secondary,
      onPress: () => navigation.navigate('Plans'),
    },
    {
      icon: 'shield-checkmark',
      label: 'Vérifier paiements',
      subtitle: 'Paiements en attente',
      color: colors.warning,
      onPress: () => navigation.navigate('PaymentVerification'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.adminBadge}>ADMIN</Text>
            <Text style={styles.greeting}>
              Bonjour, {userProfile?.name?.split(' ')[0]} 👋
            </Text>
            <Text style={styles.date}>{moment().format('dddd D MMMM YYYY')}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total vendeurs"
            value={(stats?.totalVendors || 0).toString()}
            icon="people-outline"
            iconColor={colors.primary}
            style={styles.statCard}
          />
          <StatCard
            title="Abonnements actifs"
            value={(stats?.activeSubscriptions || 0).toString()}
            icon="checkmark-circle-outline"
            iconColor={colors.success}
            color={colors.success}
            style={styles.statCard}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Revenus totaux"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon="cash-outline"
            iconColor={colors.secondary}
            color={colors.secondary}
            style={styles.statCard}
          />
          <StatCard
            title="Paiements"
            value={(stats?.totalPayments || 0).toString()}
            icon="receipt-outline"
            iconColor={colors.accent}
            color={colors.accent}
            style={styles.statCard}
          />
        </View>

        {/* Quick stats */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé rapide</Text>
          <View style={styles.summaryItem}>
            <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Taux d'abonnement actif</Text>
            <Text style={styles.summaryValue}>
              {stats?.totalVendors > 0
                ? `${Math.round((stats.activeSubscriptions / stats.totalVendors) * 100)}%`
                : '0%'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Revenu moyen/vendeur</Text>
            <Text style={styles.summaryValue}>
              {stats?.totalVendors > 0
                ? formatCurrency((stats?.totalRevenue || 0) / stats.totalVendors)
                : formatCurrency(0)}
            </Text>
          </View>
        </Card>

        {/* Admin menu */}
        <Text style={styles.sectionTitle}>Gestion</Text>
        <View style={styles.menuGrid}>
          {adminMenuItems.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuCard}
              onPress={item.onPress}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={30} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  adminBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: 2,
    marginBottom: 4,
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
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
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
  summaryCard: {
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  menuIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 24,
  },
});

export default AdminDashboardScreen;
