import React from 'react';
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
import { useDelivery } from '../../context/DeliveryContext';
import { getStatusLabel, getStatusColor, getStatusIcon } from '../../services/deliveryService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Card from '../../components/common/Card';

moment.locale('fr');

const DeliveryDashboardScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { activeDeliveries, stats, loading } = useDelivery();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Chargement..." />;
  }

  const urgentDeliveries = activeDeliveries.filter((d) => d.status === 'in_progress');
  const pendingDeliveries = activeDeliveries.filter((d) =>
    ['pending', 'assigned'].includes(d.status)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Bonjour, {userProfile?.name?.split(' ')[0]} !
            </Text>
            <Text style={styles.date}>{moment().format('dddd D MMMM YYYY')}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userProfile?.name?.charAt(0).toUpperCase() || 'L'}
            </Text>
          </View>
        </View>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Ionicons name="bicycle" size={16} color={colors.accent} />
          <Text style={styles.roleBadgeText}>Livreur</Text>
        </View>

        {/* Today's stats */}
        <Text style={styles.sectionTitle}>Aujourd'hui</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: `${colors.accent}15` }]}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{stats.todayTotal}</Text>
            <Text style={styles.statLabel}>Assignées</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: `${colors.success}15` }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats.todayDelivered}</Text>
            <Text style={styles.statLabel}>Livrées</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: `${colors.secondary}15` }]}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </View>
        </View>

        {/* In-progress deliveries */}
        {urgentDeliveries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>En cours de livraison</Text>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>{urgentDeliveries.length}</Text>
              </View>
            </View>
            {urgentDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onPress={() => navigation.navigate('DeliveryDetail', { delivery })}
              />
            ))}
          </>
        )}

        {/* Pending deliveries */}
        {pendingDeliveries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>En attente</Text>
            {pendingDeliveries.slice(0, 5).map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onPress={() => navigation.navigate('DeliveryDetail', { delivery })}
              />
            ))}
            {pendingDeliveries.length > 5 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => navigation.navigate('MesLivraisons')}
              >
                <Text style={styles.seeMoreText}>
                  Voir les {pendingDeliveries.length - 5} autres
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </TouchableOpacity>
            )}
          </>
        )}

        {activeDeliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.emptyTitle}>Tout est livré !</Text>
            <Text style={styles.emptyMessage}>
              Vous n'avez aucune livraison en attente pour le moment.
            </Text>
          </View>
        )}

        {/* Overall stats */}
        <Text style={styles.sectionTitle}>Performance globale</Text>
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <StatItem label="Total" value={stats.total} icon="layers-outline" color={colors.primary} />
            <StatItem label="Livrées" value={stats.delivered} icon="checkmark-done" color={colors.success} />
            <StatItem label="Taux réussite" value={`${stats.successRate}%`} icon="trending-up" color={colors.accent} />
            <StatItem label="Échouées" value={stats.failed} icon="close-circle-outline" color={colors.error} />
          </View>
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const DeliveryCard = ({ delivery, onPress }) => {
  const statusColor = getStatusColor(delivery.status);
  const statusLabel = getStatusLabel(delivery.status);
  const statusIcon = getStatusIcon(delivery.status);

  return (
    <TouchableOpacity style={styles.deliveryCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.deliveryCardBorder, { backgroundColor: statusColor }]} />
      <View style={styles.deliveryCardContent}>
        <View style={styles.deliveryCardTop}>
          <View style={styles.deliveryClientInfo}>
            <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.clientName} numberOfLines={1}>{delivery.clientName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Ionicons name={statusIcon as any} size={12} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
        <View style={styles.deliveryCardBottom}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.addressText} numberOfLines={1}>{delivery.clientAddress}</Text>
        </View>
        <View style={styles.deliveryCardBottom}>
          <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.productsText}>
            {delivery.products?.length || 0} article(s) —{' '}
            {new Intl.NumberFormat('fr-FR').format(delivery.totalAmount || 0)} FCFA
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
    </TouchableOpacity>
  );
};

const StatItem = ({ label, value, icon, color }) => (
  <View style={styles.statItem}>
    <View style={[styles.statItemIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statItemValue, { color }]}>{value}</Text>
    <Text style={styles.statItemLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  date: { fontSize: 13, color: colors.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.textInverse },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '700', color: colors.accent, marginLeft: 6 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  urgentBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textInverse },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  deliveryCardBorder: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  deliveryCardContent: { flex: 1 },
  deliveryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryClientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: 6,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginLeft: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  deliveryCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  addressText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  productsText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 12,
  },
  seeMoreText: { fontSize: 14, color: colors.accent, fontWeight: '600', marginRight: 4 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 16 },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  statsCard: { marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statItemValue: { fontSize: 20, fontWeight: '800' },
  statItemLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
});

export default DeliveryDashboardScreen;
