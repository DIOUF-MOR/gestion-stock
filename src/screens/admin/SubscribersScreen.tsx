import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { getAllVendorsWithSubscriptions } from '../../services/subscriptionService';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const SubscribersScreen = ({ navigation }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const result = await getAllVendorsWithSubscriptions();
    if (result.success) {
      setVendors(result.vendors);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVendors();
    setRefreshing(false);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchSearch = !searchQuery ||
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterStatus === 'all') return matchSearch;

      const sub = v.subscription;
      if (!sub) return filterStatus === 'none' && matchSearch;

      const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
      const isActive = sub.status === 'active' && endDate > new Date();

      if (filterStatus === 'active') return isActive && matchSearch;
      if (filterStatus === 'expired') return !isActive && matchSearch;
      return matchSearch;
    });
  }, [vendors, searchQuery, filterStatus]);

  const getSubscriptionStatus = (sub) => {
    if (!sub) return { label: 'Aucun', color: colors.textDisabled };
    const endDate = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
    const isActive = sub.status === 'active' && endDate > new Date();
    const daysLeft = Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)));

    if (sub.status === 'cancelled') return { label: 'Annulé', color: colors.error };
    if (!isActive) return { label: 'Expiré', color: colors.error };
    if (daysLeft <= 7) return { label: `${daysLeft}j restants`, color: colors.warning };
    return { label: 'Actif', color: colors.success };
  };

  const getPlanName = (planId) => {
    const plans = { free: 'Gratuit', basic: 'Basique', premium: 'Premium' };
    return plans[planId] || planId;
  };

  const getPlanColor = (planId) => {
    const planColors = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return planColors[planId] || colors.textSecondary;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const renderVendor = ({ item }) => {
    const subStatus = getSubscriptionStatus(item.subscription);
    const planId = item.subscription?.plan || 'free';

    return (
      <Card
        style={styles.vendorCard}
        onPress={() => navigation.navigate('SubscriberDetail', { vendor: item })}
      >
        <View style={styles.vendorContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>

          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.vendorEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.vendorMeta}>
              <View style={[styles.planChip, { backgroundColor: `${getPlanColor(planId)}15` }]}>
                <Text style={[styles.planChipText, { color: getPlanColor(planId) }]}>
                  {getPlanName(planId)}
                </Text>
              </View>
              <Text style={[styles.statusText, { color: subStatus.color }]}>
                {subStatus.label}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
        </View>
      </Card>
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Abonnés"
        onBack={() => navigation.goBack()}
      />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{vendors.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {vendors.filter(v => {
              const sub = v.subscription;
              if (!sub) return false;
              const end = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
              return sub.status === 'active' && end > new Date();
            }).length}
          </Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>
            {vendors.filter(v => {
              const sub = v.subscription;
              if (!sub) return true;
              const end = sub.endDate?.toDate ? sub.endDate.toDate() : new Date(sub.endDate);
              return sub.status !== 'active' || end <= new Date();
            }).length}
          </Text>
          <Text style={styles.statLabel}>Expirés</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un vendeur..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'active', label: 'Actifs' },
          { key: 'expired', label: 'Expirés' },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filterStatus === f.key && styles.filterTabActive]}
            onPress={() => setFilterStatus(f.key)}
          >
            <Text style={[styles.filterTabText, filterStatus === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredVendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucun abonné"
            message="Aucun vendeur trouvé."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  vendorCard: {
    marginBottom: 10,
  },
  vendorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vendorEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  planChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  planChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SubscribersScreen;
