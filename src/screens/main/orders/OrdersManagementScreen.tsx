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
import { colors } from '../../../theme/colors';
import { useOrder } from '../../../context/OrderContext';
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  getOrderStatusIcon,
} from '../../../services/orderService';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

moment.locale('fr');

const TABS = [
  { key: 'pending', label: 'À traiter' },
  { key: 'active', label: 'En cours' },
  { key: 'done', label: 'Terminées' },
];

const OrdersManagementScreen = ({ navigation }) => {
  const { orders, loading, stats } = useOrder();
  const [tab, setTab] = useState<'pending' | 'active' | 'done'>('pending');

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter((o) =>
    ['confirmed', 'preparing', 'ready', 'in_delivery'].includes(o.status)
  );
  const doneOrders = orders.filter((o) =>
    ['delivered', 'cancelled'].includes(o.status)
  );

  const data =
    tab === 'pending' ? pendingOrders : tab === 'active' ? activeOrders : doneOrders;

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
        onPress={() => navigation.navigate('OrderDetail', { order: item })}
        activeOpacity={0.85}
      >
        <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.clientName}>{item.clientName || '—'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Ionicons name={statusIcon as any} size={12} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.itemsRow}>
            <Ionicons name="cube-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.itemsText} numberOfLines={1}>
              {item.items?.map((i: any) => `${i.name} x${i.quantity}`).join(', ')}
            </Text>
          </View>

          {item.clientPhone && (
            <View style={styles.row}>
              <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.rowText}>{item.clientPhone}</Text>
            </View>
          )}

          {item.clientAddress && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.rowText} numberOfLines={1}>{item.clientAddress}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.total}>{fmt(item.totalAmount)}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Commandes</Text>
            <Text style={styles.headerSub}>{stats.total} commande(s) au total</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatBox value={pendingOrders.length} label="À traiter" color={colors.warning} icon="time-outline" />
        <StatBox value={activeOrders.length} label="En cours" color={colors.primary} icon="bicycle-outline" />
        <StatBox value={stats.delivered} label="Livrées" color={colors.success} icon="checkmark-circle-outline" />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const count =
            t.key === 'pending'
              ? pendingOrders.length
              : t.key === 'active'
              ? activeOrders.length
              : doneOrders.length;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
              onPress={() => setTab(t.key as any)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}{count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Aucune commande"
            message={
              tab === 'pending'
                ? 'Toutes les commandes ont été traitées.'
                : tab === 'active'
                ? 'Aucune commande en cours de traitement.'
                : 'Aucune commande terminée.'
            }
          />
        }
      />
    </SafeAreaView>
  );
};

const StatBox = ({ value, label, color, icon }) => (
  <View style={[styles.statBox, { backgroundColor: `${color}12` }]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 12 },
  statBox: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
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
  tabItemActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
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
    alignItems: 'center', marginBottom: 6,
  },
  clientName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3, gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  itemsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  itemsText: { flex: 1, fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  rowText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  },
  total: { fontSize: 14, fontWeight: '800', color: colors.primary },
  dateText: { fontSize: 11, color: colors.textDisabled },
});

export default OrdersManagementScreen;
