import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { useOrder } from '../../context/OrderContext';
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderStatusIcon,
  isActiveOrder,
} from '../../services/orderService';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const TABS = [
  { key: 'active', label: 'En cours' },
  { key: 'completed', label: 'Historique' },
];

const ClientOrdersScreen = ({ navigation }) => {
  const { activeOrders, completedOrders, loading, stats } = useOrder();
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  const data = tab === 'active' ? activeOrders : completedOrders;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

  if (loading) return <LoadingSpinner fullScreen />;

  const renderItem = ({ item }: { item: any }) => {
    const statusColor = getOrderStatusColor(item.status);
    const statusLabel = getOrderStatusLabel(item.status);
    const statusIcon = getOrderStatusIcon(item.status);
    const date = item.createdAt?.toDate
      ? moment(item.createdAt.toDate()).fromNow()
      : '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OrderTracking', { order: item })}
        activeOpacity={0.85}
      >
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Ionicons name={statusIcon as any} size={13} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          <View style={styles.itemsRow}>
            <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.itemsText} numberOfLines={1}>
              {item.items?.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}
            </Text>
          </View>

          {item.clientAddress && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>{item.clientAddress}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.total}>{fmt(item.totalAmount)}</Text>
            {isActiveOrder(item.status) && (
              <View style={styles.trackBtn}>
                <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
                <Text style={styles.trackBtnText}>Suivre</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Commandes</Text>
        <Text style={styles.headerSub}>{stats.total} commande(s) au total</Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <StatBox value={stats.active} label="En cours" color={colors.warning} />
        <StatBox value={stats.delivered} label="Livrées" color={colors.success} />
        <StatBox value={stats.cancelled} label="Annulées" color={colors.textDisabled} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key as any)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
              {t.key === 'active' && activeOrders.length > 0
                ? ` (${activeOrders.length})`
                : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'active' ? 'bicycle-outline' : 'time-outline'}
            title={tab === 'active' ? 'Aucune commande en cours' : 'Aucun historique'}
            message={
              tab === 'active'
                ? 'Parcourez le catalogue pour passer votre première commande.'
                : 'Vos commandes terminées apparaîtront ici.'
            }
            actionLabel={tab === 'active' ? 'Voir le catalogue' : undefined}
            onAction={tab === 'active' ? () => navigation.navigate('ClientHome') : undefined}
          />
        }
      />
    </SafeAreaView>
  );
};

const StatBox = ({ value, label, color }) => (
  <View style={[styles.statBox, { backgroundColor: `${color}12` }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: colors.secondary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.secondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
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
    gap: 2,
  },
  statusStrip: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: colors.textDisabled },
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  itemsText: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  addressText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  },
  total: { fontSize: 15, fontWeight: '800', color: colors.secondary },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: `${colors.secondary}10`, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  trackBtnText: { fontSize: 12, fontWeight: '700', color: colors.secondary },
});

export default ClientOrdersScreen;
