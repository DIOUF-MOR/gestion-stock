import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useDelivery } from '../../context/DeliveryContext';
import { getStatusLabel, getStatusColor, getStatusIcon } from '../../services/deliveryService';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'assigned', label: 'Assignées' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'pending', label: 'En attente' },
];

const DeliveriesListScreen = ({ navigation }) => {
  const { activeDeliveries, loading } = useDelivery();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    return activeDeliveries.filter((d) => {
      const matchFilter = filter === 'all' || d.status === filter;
      const matchSearch =
        !search ||
        d.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        d.clientAddress?.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [activeDeliveries, filter, search]);

  if (loading) return <LoadingSpinner fullScreen />;

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);
    const statusIcon = getStatusIcon(item.status);
    const createdDate = item.createdAt?.toDate
      ? moment(item.createdAt.toDate()).fromNow()
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
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.clientAddress}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.clientPhone}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.row}>
              <Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {item.products?.length || 0} article(s) —{' '}
                {new Intl.NumberFormat('fr-FR').format(item.totalAmount || 0)} FCFA
              </Text>
            </View>
            <Text style={styles.dateText}>{createdDate}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Livraisons</Text>
        <Text style={styles.headerSubtitle}>{activeDeliveries.length} livraison(s) active(s)</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client ou adresse..."
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
            icon="bicycle-outline"
            title="Aucune livraison"
            message={
              search || filter !== 'all'
                ? 'Aucune livraison ne correspond à vos critères.'
                : 'Vous n\'avez aucune livraison active en ce moment.'
            }
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 8,
  },
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
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
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
    marginBottom: 8,
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
    alignItems: 'center',
    marginTop: 6,
  },
  dateText: { fontSize: 11, color: colors.textDisabled, fontWeight: '500' },
});

export default DeliveriesListScreen;
