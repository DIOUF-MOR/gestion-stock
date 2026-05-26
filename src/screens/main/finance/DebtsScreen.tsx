import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { markDebtAsPaid, applyPartialPaymentToDebt, deleteDebt } from '../../../services/financeService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';

moment.locale('fr');

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n || 0) + ' FCFA';

const DebtsScreen = ({ navigation }) => {
  const { debts, clients, storeId } = useStore();
  const [filterType, setFilterType] = useState('all');
  const [showPaid, setShowPaid] = useState(false);
  const [search, setSearch] = useState('');
  const [partialVisible, setPartialVisible] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState('');

  // ── Derived counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const unpaid = debts.filter((d) => !d.isPaid);
    return {
      all: unpaid.length,
      receivable: unpaid.filter((d) => d.type === 'receivable').length,
      payable: unpaid.filter((d) => d.type === 'payable').length,
      overdue: unpaid.filter((d) => {
        const due = d.dueDate?.toDate ? d.dueDate.toDate() : d.dueDate ? new Date(d.dueDate) : null;
        return due && due < new Date();
      }).length,
    };
  }, [debts]);

  const totalReceivable = useMemo(
    () => debts.filter((d) => d.type === 'receivable' && !d.isPaid).reduce((s, d) => s + (d.amount || 0), 0),
    [debts]
  );
  const totalPayable = useMemo(
    () => debts.filter((d) => d.type === 'payable' && !d.isPaid).reduce((s, d) => s + (d.amount || 0), 0),
    [debts]
  );
  const overdueReceivable = useMemo(
    () => debts.filter((d) => {
      if (d.type !== 'receivable' || d.isPaid) return false;
      const due = d.dueDate?.toDate ? d.dueDate.toDate() : d.dueDate ? new Date(d.dueDate) : null;
      return due && due < new Date();
    }).length,
    [debts]
  );
  const overduePayable = useMemo(
    () => debts.filter((d) => {
      if (d.type !== 'payable' || d.isPaid) return false;
      const due = d.dueDate?.toDate ? d.dueDate.toDate() : d.dueDate ? new Date(d.dueDate) : null;
      return due && due < new Date();
    }).length,
    [debts]
  );
  const netBalance = totalReceivable - totalPayable;

  // ── Filtered + sorted list ─────────────────────────────────────────
  const filteredDebts = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = debts.filter((d) => {
      const matchType = filterType === 'all' || d.type === filterType;
      const matchPaid = showPaid ? true : !d.isPaid;
      const matchSearch =
        !q ||
        d.clientName?.toLowerCase().includes(q) ||
        d.supplierName?.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q);
      return matchType && matchPaid && matchSearch;
    });

    // Sort: overdue first → unpaid by due date asc → paid last
    list = list.sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      const aDate = a.dueDate?.toDate ? a.dueDate.toDate() : a.dueDate ? new Date(a.dueDate) : null;
      const bDate = b.dueDate?.toDate ? b.dueDate.toDate() : b.dueDate ? new Date(b.dueDate) : null;
      const now = new Date();
      const aOverdue = aDate && aDate < now;
      const bOverdue = bDate && bDate < now;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      if (aDate && bDate) return aDate.getTime() - bDate.getTime();
      if (aDate) return -1;
      if (bDate) return 1;
      return (b.amount || 0) - (a.amount || 0);
    });
    return list;
  }, [debts, filterType, showPaid, search]);

  // ── Actions ────────────────────────────────────────────────────────
  const handleMarkAsPaid = (debt: any) => {
    Alert.alert(
      'Solder la dette',
      `Confirmer le paiement complet de ${fmt(debt.amount)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const result = await markDebtAsPaid(storeId, debt.id);
            if (!result.success) Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  const handlePartialPayment = async (debt: any) => {
    const payment = parseFloat(partialAmount.replace(',', '.'));
    if (!payment || payment <= 0) {
      Alert.alert('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }
    if (payment > debt.amount) {
      Alert.alert('Montant trop élevé', `Le montant ne peut pas dépasser ${fmt(debt.amount)}.`);
      return;
    }
    const result = await applyPartialPaymentToDebt(storeId, debt.id, payment);
    if (result.success) {
      setPartialVisible(null);
      setPartialAmount('');
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  const handleDelete = (debt: any) => {
    Alert.alert(
      'Supprimer la dette',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDebt(storeId, debt.id);
            if (!result.success) Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  const handleNavigateToClient = (debt: any) => {
    if (!debt.clientId) return;
    const client = clients.find((c) => c.id === debt.clientId);
    if (client) navigation.navigate('Clients', { screen: 'ClientPortal', params: { client } });
  };

  // ── Render ─────────────────────────────────────────────────────────
  const renderDebt = ({ item }: { item: any }) => {
    const isReceivable = item.type === 'receivable';
    const isPaid = item.isPaid;
    const dueDate = item.dueDate?.toDate
      ? item.dueDate.toDate()
      : item.dueDate ? new Date(item.dueDate) : null;
    const isOverdue = dueDate && !isPaid && dueDate < new Date();
    const isExpanded = partialVisible === item.id;

    const accentColor = isPaid ? colors.success : isReceivable ? colors.warning : colors.error;

    return (
      <Card style={[styles.debtCard, isOverdue && styles.overdueCard, isPaid && styles.paidCard]}>
        <TouchableOpacity
          activeOpacity={item.clientId && !isPaid ? 0.7 : 1}
          onPress={() => item.clientId && !isPaid && handleNavigateToClient(item)}
        >
          <View style={styles.debtContent}>
            {/* Icon */}
            <View style={[styles.debtIcon, { backgroundColor: `${accentColor}15` }]}>
              <Ionicons
                name={isPaid ? 'checkmark-circle' : isReceivable ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={24}
                color={accentColor}
              />
            </View>

            {/* Info */}
            <View style={styles.debtInfo}>
              <Text style={styles.debtDesc} numberOfLines={1}>
                {item.description || (isReceivable ? 'À recevoir' : 'À payer')}
              </Text>
              <View style={styles.partyRow}>
                <Text style={styles.debtParty} numberOfLines={1}>
                  {isReceivable ? item.clientName || '—' : item.supplierName || 'Fournisseur'}
                </Text>
                {item.clientId && !isPaid && (
                  <View style={styles.profileBadge}>
                    <Ionicons name="person-outline" size={10} color={colors.primary} />
                    <Text style={styles.profileBadgeText}>voir</Text>
                  </View>
                )}
              </View>
              {dueDate && (
                <View style={styles.dueDateRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={11}
                    color={isOverdue ? colors.error : colors.textDisabled}
                  />
                  <Text style={[styles.debtDue, isOverdue && styles.debtDueOverdue]}>
                    {isOverdue ? 'En retard · ' : ''}{moment(dueDate).format('D MMM YYYY')}
                  </Text>
                </View>
              )}
              {isPaid && item.paidAt && (
                <Text style={styles.paidAt}>
                  Soldé le {moment(item.paidAt.toDate ? item.paidAt.toDate() : new Date(item.paidAt)).format('D MMM YYYY')}
                </Text>
              )}
            </View>

            {/* Right side */}
            <View style={styles.debtRight}>
              <Text style={[styles.debtAmount, { color: accentColor }]}>{fmt(item.amount)}</Text>
              {!isPaid && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.partialBtn]}
                    onPress={() => {
                      if (isExpanded) { setPartialVisible(null); setPartialAmount(''); }
                      else { setPartialVisible(item.id); setPartialAmount(''); }
                    }}
                  >
                    <Ionicons name="remove-circle-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.paidBtn]}
                    onPress={() => handleMarkAsPaid(item)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={17} color={colors.success} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={13} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* Partial payment panel */}
        {isExpanded && (
          <View style={styles.partialRow}>
            <View style={styles.partialInfo}>
              <Text style={styles.partialInfoText}>Reste dû : {fmt(item.amount)}</Text>
            </View>
            <View style={styles.partialInputRow}>
              <TextInput
                style={styles.partialInput}
                placeholder="Montant reçu"
                placeholderTextColor={colors.textDisabled}
                keyboardType="numeric"
                value={partialAmount}
                onChangeText={setPartialAmount}
                autoFocus
              />
              <TouchableOpacity
                style={styles.partialConfirmBtn}
                onPress={() => handlePartialPayment(item)}
              >
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                <Text style={styles.partialConfirmText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>
    );
  };

  const FILTERS = [
    { key: 'all', label: 'Tous', count: counts.all },
    { key: 'receivable', label: 'À recevoir', count: counts.receivable },
    { key: 'payable', label: 'À payer', count: counts.payable },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Dettes"
        subtitle={`${counts.all} impayée${counts.all !== 1 ? 's' : ''}`}
        onBack={() => navigation.goBack()}
        accentColor={counts.overdue > 0 ? colors.error : colors.warning}
        showShadow
        rightActions={[{
          icon: 'add',
          onPress: () => navigation.navigate('AddDebt'),
          variant: 'filled',
          color: colors.primary,
        }]}
      />

      {/* Summary cards — cliquables, filtrent la liste */}
      <View style={styles.summaryRow}>
        {/* À recevoir */}
        <TouchableOpacity
          style={[
            styles.summaryCard,
            { borderColor: filterType === 'receivable' ? colors.warning : `${colors.warning}30` },
            filterType === 'receivable' && styles.summaryCardActive,
          ]}
          onPress={() => setFilterType(filterType === 'receivable' ? 'all' : 'receivable')}
          activeOpacity={0.8}
        >
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.warning}15` }]}>
              <Ionicons name="arrow-down-circle" size={18} color={colors.warning} />
            </View>
            {overdueReceivable > 0 && (
              <View style={styles.summaryOverdueBadge}>
                <Ionicons name="alert-circle" size={10} color={colors.error} />
                <Text style={styles.summaryOverdueText}>{overdueReceivable} retard</Text>
              </View>
            )}
          </View>
          <Text style={[styles.summaryAmount, { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(totalReceivable)}
          </Text>
          <View style={styles.summaryBottom}>
            <Text style={styles.summaryLabel}>À recevoir</Text>
            <Text style={styles.summaryCount}>{counts.receivable} dette{counts.receivable !== 1 ? 's' : ''}</Text>
          </View>
          {filterType === 'receivable' && (
            <View style={[styles.summaryActivePill, { backgroundColor: colors.warning }]}>
              <Text style={styles.summaryActivePillText}>Filtré</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* À payer */}
        <TouchableOpacity
          style={[
            styles.summaryCard,
            { borderColor: filterType === 'payable' ? colors.error : `${colors.error}30` },
            filterType === 'payable' && styles.summaryCardActive,
          ]}
          onPress={() => setFilterType(filterType === 'payable' ? 'all' : 'payable')}
          activeOpacity={0.8}
        >
          <View style={styles.summaryTop}>
            <View style={[styles.summaryIconWrap, { backgroundColor: `${colors.error}15` }]}>
              <Ionicons name="arrow-up-circle" size={18} color={colors.error} />
            </View>
            {overduePayable > 0 && (
              <View style={styles.summaryOverdueBadge}>
                <Ionicons name="alert-circle" size={10} color={colors.error} />
                <Text style={styles.summaryOverdueText}>{overduePayable} retard</Text>
              </View>
            )}
          </View>
          <Text style={[styles.summaryAmount, { color: colors.error }]} numberOfLines={1} adjustsFontSizeToFit>
            {fmt(totalPayable)}
          </Text>
          <View style={styles.summaryBottom}>
            <Text style={styles.summaryLabel}>À payer</Text>
            <Text style={styles.summaryCount}>{counts.payable} dette{counts.payable !== 1 ? 's' : ''}</Text>
          </View>
          {filterType === 'payable' && (
            <View style={[styles.summaryActivePill, { backgroundColor: colors.error }]}>
              <Text style={styles.summaryActivePillText}>Filtré</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Solde net */}
      <View style={[
        styles.netRow,
        { backgroundColor: netBalance >= 0 ? `${colors.success}10` : `${colors.error}10` },
      ]}>
        <View style={styles.netLeft}>
          <Ionicons
            name={netBalance >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
            size={15}
            color={netBalance >= 0 ? colors.success : colors.error}
          />
          <Text style={styles.netLabel}>Solde net</Text>
        </View>
        <Text style={[styles.netValue, { color: netBalance >= 0 ? colors.success : colors.error }]}>
          {netBalance >= 0 ? '+' : '-'}{fmt(Math.abs(netBalance))}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher client, fournisseur, description..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.filterTabs}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
              onPress={() => setFilterType(f.key)}
            >
              <Text style={[styles.filterTabText, filterType === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
              {f.count > 0 && (
                <View style={[styles.filterBadge, filterType === f.key && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, filterType === f.key && styles.filterBadgeTextActive]}>
                    {f.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.showPaidBtn, showPaid && styles.showPaidBtnActive]}
          onPress={() => setShowPaid(!showPaid)}
        >
          <Ionicons
            name={showPaid ? 'eye-off-outline' : 'eye-outline'}
            size={14}
            color={showPaid ? colors.textInverse : colors.textSecondary}
          />
          <Text style={[styles.showPaidText, showPaid && styles.showPaidTextActive]}>
            Soldés
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      {(search.trim() !== '' || filterType !== 'all') && (
        <Text style={styles.resultsCount}>{filteredDebts.length} résultat{filteredDebts.length !== 1 ? 's' : ''}</Text>
      )}

      <FlatList
        data={filteredDebts}
        keyExtractor={(item) => item.id}
        renderItem={renderDebt}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="Aucune dette"
            message={search ? 'Aucun résultat pour cette recherche.' : 'Aucune dette pour ce filtre.'}
            actionLabel="Ajouter une dette"
            onAction={() => navigation.navigate('AddDebt')}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 6,
  },
  summaryCardActive: {
    shadowOpacity: 0.14,
    elevation: 6,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryOverdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${colors.error}12`,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryOverdueText: { fontSize: 9, fontWeight: '700', color: colors.error },
  summaryAmount: { fontSize: 17, fontWeight: '800', minHeight: 22 },
  summaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  summaryCount: { fontSize: 10, color: colors.textDisabled, fontWeight: '600' },
  summaryActivePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  summaryActivePillText: { fontSize: 9, fontWeight: '700', color: colors.textInverse },

  // Net balance
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  netLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  netLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  netValue: { fontSize: 14, fontWeight: '800' },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.textPrimary },

  // Filters
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  filterTabs: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  filterTabTextActive: { color: colors.textInverse },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: `${colors.textDisabled}25`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  filterBadgeTextActive: { color: colors.textInverse },
  showPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showPaidBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  showPaidText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  showPaidTextActive: { color: colors.textInverse },

  resultsCount: {
    fontSize: 12,
    color: colors.textDisabled,
    paddingHorizontal: 16,
    marginBottom: 6,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  debtCard: { marginBottom: 10, padding: 0, overflow: 'hidden' },
  overdueCard: { borderWidth: 1, borderColor: `${colors.error}40` },
  paidCard: { opacity: 0.65 },
  debtContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  debtIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtInfo: { flex: 1, minWidth: 0 },
  debtDesc: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  debtParty: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  profileBadgeText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  debtDue: { fontSize: 11, color: colors.textDisabled },
  debtDueOverdue: { color: colors.error, fontWeight: '700' },
  paidAt: { fontSize: 11, color: colors.success, marginTop: 3, fontWeight: '600' },

  debtRight: { alignItems: 'flex-end', gap: 6 },
  debtAmount: { fontSize: 14, fontWeight: '800' },
  actionButtons: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialBtn: { backgroundColor: `${colors.primary}12` },
  paidBtn: { backgroundColor: `${colors.success}12` },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: `${colors.error}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Partial payment panel
  partialRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    padding: 12,
    backgroundColor: colors.surfaceVariant,
    gap: 8,
  },
  partialInfo: { marginBottom: 2 },
  partialInfoText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  partialInputRow: { flexDirection: 'row', gap: 8 },
  partialInput: {
    flex: 1,
    height: 42,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  partialConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  partialConfirmText: { fontSize: 13, fontWeight: '700', color: colors.textInverse },
});

export default DebtsScreen;
