import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useDelivery } from '../../../context/DeliveryContext';
import { useStore } from '../../../context/StoreContext';
import {
  deleteDelivery,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
} from '../../../services/deliveryService';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

moment.locale('fr');

const STATUS_FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'assigned', label: 'Assignées' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'failed', label: 'Échouées' },
  { key: 'cancelled', label: 'Annulées' },
];

const DeliveriesManagementScreen = ({ navigation }) => {
  const { deliveries, stats, livreurs, loading, storeId } = useDelivery();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: deliveries.length };
    for (const d of deliveries) {
      counts[d.status] = (counts[d.status] || 0) + 1;
    }
    return counts;
  }, [deliveries]);

  const filtered = useMemo(() => {
    return deliveries.filter((d) => {
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchSearch =
        !search ||
        d.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        d.clientAddress?.toLowerCase().includes(search.toLowerCase()) ||
        d.assignedToName?.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [deliveries, statusFilter, search]);

  const handleDelete = (delivery) => {
    Alert.alert(
      'Supprimer la livraison',
      `Supprimer la livraison pour "${delivery.clientName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (!storeId) return;
            const result = await deleteDelivery(storeId, delivery.id);
            if (!result.success) Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const statusIcon = getStatusIcon(item.status);
    const date = item.createdAt?.toDate
      ? moment(item.createdAt.toDate()).format('DD/MM HH:mm')
      : '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('LivraisonDetail', { delivery: item })}
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

          {item.assignedToName && (
            <View style={styles.row}>
              <Ionicons name="bicycle-outline" size={13} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.accent }]}>{item.assignedToName}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.amount}>
              {new Intl.NumberFormat('fr-FR').format(item.totalAmount || 0)} FCFA
            </Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('LivraisonDetail', { delivery: item })}
          >
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          {['pending', 'assigned'].includes(item.status) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${colors.error}10` }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
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
            <Text style={styles.headerTitle}>Livraisons</Text>
            <Text style={styles.headerSubtitle}>{deliveries.length} livraison(s)</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.livreurBtn}
            onPress={() => navigation.navigate('LivreursManagement')}
          >
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.livreurBtnText}>{livreurs.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateDelivery')}
          >
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <MiniStat label="En attente" value={(countByStatus['pending'] || 0) + (countByStatus['assigned'] || 0)} color={colors.warning} />
        <MiniStat label="En cours" value={countByStatus['in_progress'] || 0} color={colors.secondary} />
        <MiniStat label="Livrées" value={countByStatus['delivered'] || 0} color={colors.success} />
        <MiniStat label="Réussite" value={`${stats.successRate}%`} color={colors.primary} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status filters */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        renderItem={({ item: f }) => {
          const count = countByStatus[f.key] ?? 0;
          const isActive = statusFilter === f.key;
          return (
            <TouchableOpacity
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bicycle-outline"
            title="Aucune livraison"
            message={
              search || statusFilter !== 'all'
                ? 'Aucune livraison ne correspond à vos critères.'
                : 'Créez votre première livraison.'
            }
            actionLabel="Créer une livraison"
            onAction={() => navigation.navigate('CreateDelivery')}
          />
        }
      />
    </SafeAreaView>
  );
};

const MiniStat = ({ label, value, color }) => (
  <View style={[styles.miniStat, { backgroundColor: `${color}12` }]}>
    <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { padding: 4, marginRight: 4 },
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  livreurBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  livreurBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  miniStatValue: { fontSize: 18, fontWeight: '800' },
  miniStatLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, marginLeft: 8 },
  filtersRow: { paddingHorizontal: 16, paddingRight: 16, paddingVertical: 6, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.textInverse },
  filterCount: {
    backgroundColor: colors.border,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  filterCountTextActive: { color: colors.textInverse },
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  amount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  dateText: { fontSize: 11, color: colors.textDisabled },
  cardActions: { gap: 8, marginLeft: 10 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DeliveriesManagementScreen;
