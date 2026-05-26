import React, { useState, useMemo } from 'react';
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
import { useDelivery } from '../../context/DeliveryContext';
import { getStatusLabel, getStatusColor, getStatusIcon } from '../../services/deliveryService';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'failed', label: 'Échouées' },
  { key: 'cancelled', label: 'Annulées' },
];

const DeliveryHistoryScreen = ({ navigation }) => {
  const { historyDeliveries, stats, loading } = useDelivery();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return historyDeliveries;
    return historyDeliveries.filter((d) => d.status === filter);
  }, [historyDeliveries, filter]);

  if (loading) return <LoadingSpinner fullScreen />;

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const statusIcon = getStatusIcon(item.status);
    const date = item.deliveredAt || item.failedAt || item.cancelledAt || item.createdAt;
    const formattedDate = date?.toDate
      ? moment(date.toDate()).format('DD/MM/YYYY HH:mm')
      : '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DeliveryDetail', { delivery: item })}
        activeOpacity={0.85}
      >
        <View style={[styles.cardBorder, { backgroundColor: statusColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
            <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
              <Ionicons name={statusIcon as any} size={12} color={statusColor} />
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.clientAddress}</Text>
          </View>
          <View style={styles.rowFooter}>
            <Text style={styles.amount}>
              {new Intl.NumberFormat('fr-FR').format(item.totalAmount || 0)} FCFA
            </Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique</Text>
        <Text style={styles.headerSubtitle}>{historyDeliveries.length} livraison(s) terminée(s)</Text>
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: `${colors.success}15` }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Livrées</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: `${colors.error}15` }]}>
          <Text style={[styles.statValue, { color: colors.error }]}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Échouées</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.successRate}%</Text>
          <Text style={styles.statLabel}>Réussite</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Aucun historique"
            message="Vos livraisons terminées apparaîtront ici."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.textInverse },
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
  },
  cardBorder: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  amount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  dateText: { fontSize: 11, color: colors.textDisabled },
});

export default DeliveryHistoryScreen;
