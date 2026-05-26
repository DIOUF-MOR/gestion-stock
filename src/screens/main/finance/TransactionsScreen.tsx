import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { deleteTransaction } from '../../../services/financeService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';

moment.locale('fr');

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(n || 0) + ' FCFA';

const PAYMENT_ICONS: Record<string, string> = {
  'Espèces': 'cash-outline',
  'Mobile Money': 'phone-portrait-outline',
  'Virement': 'swap-horizontal-outline',
  'Crédit': 'time-outline',
};

const TransactionsScreen = ({ navigation }) => {
  const { transactions, clients, loading, storeId } = useStore();
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showClientFilter, setShowClientFilter] = useState(false);

  const periodCutoff = useMemo(() => {
    const now = new Date();
    if (filterPeriod === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (filterPeriod === 'week')  return new Date(now.getTime() - 7  * 86400000);
    if (filterPeriod === 'month') return new Date(now.getTime() - 30 * 86400000);
    return new Date(0);
  }, [filterPeriod]);

  // Clients that appear in transactions (for the filter picker)
  const clientsWithTx = useMemo(() => {
    const ids = new Set(transactions.map((t) => t.clientId).filter(Boolean));
    return clients.filter((c) => ids.has(c.id));
  }, [transactions, clients]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchType   = filterType === 'all' || t.type === filterType;
      const matchClient = !filterClient || t.clientId === filterClient;
      const matchSearch =
        !search.trim() ||
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.clientName  || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.category    || '').toLowerCase().includes(search.toLowerCase());
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || 0);
      const matchPeriod = d >= periodCutoff;
      return matchType && matchClient && matchSearch && matchPeriod;
    });
  }, [transactions, filterType, filterClient, search, periodCutoff]);

  const totalRevenue = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'revenue').reduce((s, t) => s + (t.amount || 0), 0),
    [filteredTransactions]
  );
  const totalExpenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    [filteredTransactions]
  );

  const handleDelete = (transaction) => {
    const isSale = transaction.type === 'revenue' && transaction.items?.length > 0;
    const isCredit = transaction.paymentMethod === 'Crédit';

    let message = 'Voulez-vous vraiment supprimer cette transaction ?';
    if (isSale) {
      message = 'Cette vente sera supprimée et le stock sera restauré automatiquement.';
      if (isCredit) message += '\nLa dette associée sera également supprimée.';
    }

    Alert.alert('Supprimer la transaction', message, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteTransaction(storeId, transaction.id);
          if (!result.success) Alert.alert('Erreur', result.error);
        },
      },
    ]);
  };

  const handleNavigateToClient = (transaction) => {
    if (!transaction.clientId) return;
    const client = clients.find((c) => c.id === transaction.clientId);
    if (client) {
      navigation.navigate('Clients', { screen: 'ClientPortal', params: { client } });
    }
  };

  const renderTransaction = ({ item }) => {
    const isRevenue = item.type === 'revenue';
    const isSale = isRevenue && item.items?.length > 0;
    const date = item.date?.toDate ? item.date.toDate() : new Date(item.date);
    const paymentIcon = PAYMENT_ICONS[item.paymentMethod] || 'card-outline';
    const isCredit = item.paymentMethod === 'Crédit';

    return (
      <Card style={styles.txCard}>
        <View style={styles.txContent}>
          {/* Icon */}
          <View style={[
            styles.txIcon,
            { backgroundColor: isRevenue ? `${colors.success}15` : `${colors.error}15` },
          ]}>
            <Ionicons
              name={isSale ? 'cart-outline' : (isRevenue ? 'arrow-up-circle' : 'arrow-down-circle')}
              size={22}
              color={isRevenue ? colors.success : colors.error}
            />
          </View>

          {/* Info */}
          <View style={styles.txInfo}>
            <View style={styles.txTitleRow}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {item.description || item.category}
              </Text>
              {isSale && (
                <View style={styles.saleBadge}>
                  <Text style={styles.saleBadgeText}>Vente</Text>
                </View>
              )}
            </View>

            <View style={styles.txMeta}>
              <Ionicons name={paymentIcon as any} size={11} color={colors.textDisabled} />
              <Text style={styles.txMetaText}>{item.paymentMethod || 'Espèces'}</Text>
              {item.items?.length > 0 && (
                <Text style={styles.txMetaText}>· {item.items.length} article(s)</Text>
              )}
            </View>

            <Text style={styles.txDate}>{moment(date).format('D MMM YYYY · HH:mm')}</Text>

            {/* Client link */}
            {item.clientName && (
              <TouchableOpacity
                style={styles.clientBadge}
                onPress={() => handleNavigateToClient(item)}
              >
                <Ionicons name="person-circle-outline" size={13} color={colors.primary} />
                <Text style={styles.clientBadgeText}>{item.clientName}</Text>
                {isCredit && (
                  <View style={styles.creditTag}>
                    <Text style={styles.creditTagText}>Crédit</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Items breakdown (collapsed) */}
            {isSale && item.items?.length > 0 && (
              <View style={styles.itemsList}>
                {item.items.slice(0, 2).map((it: any, idx: number) => (
                  <Text key={idx} style={styles.itemRow} numberOfLines={1}>
                    {it.productName} × {it.quantity} → {fmt(it.subtotal ?? it.unitPrice * it.quantity)}
                  </Text>
                ))}
                {item.items.length > 2 && (
                  <Text style={styles.itemRow}>+{item.items.length - 2} autre(s)…</Text>
                )}
              </View>
            )}
          </View>

          {/* Amount + delete */}
          <View style={styles.txRight}>
            <Text style={[styles.txAmount, { color: isRevenue ? colors.success : colors.error }]}>
              {isRevenue ? '+' : '-'}{fmt(item.amount)}
            </Text>
            {item.discount > 0 && (
              <Text style={styles.discountLabel}>-{fmt(item.discount)}</Text>
            )}
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Transactions"
        subtitle="Revenus et dépenses"
        onBack={() => navigation.goBack()}
        accentColor={colors.primary}
        showShadow
        rightActions={[{
          icon: 'add',
          onPress: () => navigation.navigate('AddTransaction'),
          variant: 'filled',
          color: colors.primary,
        }]}
      />

      {/* Period filter */}
      <View style={styles.periodBar}>
        {[
          { key: 'today', label: "Aujourd'hui" },
          { key: 'week',  label: '7 jours' },
          { key: 'month', label: '30 jours' },
          { key: 'all',   label: 'Tout' },
        ].map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, filterPeriod === p.key && styles.periodBtnActive]}
            onPress={() => setFilterPeriod(p.key)}
          >
            <Text style={[styles.periodBtnText, filterPeriod === p.key && styles.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher…"
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type filter tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'Toutes', icon: 'list-outline' },
          { key: 'revenue', label: 'Revenus', icon: 'arrow-up-circle-outline' },
          { key: 'expense', label: 'Dépenses', icon: 'arrow-down-circle-outline' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
            onPress={() => setFilterType(f.key)}
          >
            <Ionicons
              name={f.icon as any}
              size={14}
              color={filterType === f.key ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.filterTabText, filterType === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Client filter (show only if transactions have clients) */}
      {clientsWithTx.length > 0 && (
        <View style={styles.clientFilterRow}>
          <TouchableOpacity
            style={styles.clientFilterToggle}
            onPress={() => setShowClientFilter(!showClientFilter)}
          >
            <Ionicons name="people-outline" size={14} color={filterClient ? colors.primary : colors.textSecondary} />
            <Text style={[styles.clientFilterLabel, filterClient && { color: colors.primary }]}>
              {filterClient ? clients.find((c) => c.id === filterClient)?.name ?? 'Client' : 'Filtrer par client'}
            </Text>
            <Ionicons
              name={showClientFilter ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {filterClient && (
            <TouchableOpacity onPress={() => setFilterClient(null)} style={styles.clearFilter}>
              <Ionicons name="close-circle" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {showClientFilter && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.clientChipRow}
        >
          {clientsWithTx.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.clientChip, filterClient === c.id && styles.clientChipActive]}
              onPress={() => {
                setFilterClient(c.id === filterClient ? null : c.id);
                setShowClientFilter(false);
              }}
            >
              <Text style={[styles.clientChipText, filterClient === c.id && styles.clientChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Summary bar */}
      {filteredTransactions.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryCount}>{filteredTransactions.length} transaction(s)</Text>
          <View style={styles.summaryAmounts}>
            {totalRevenue > 0 && (
              <Text style={styles.summaryRevenue}>+{fmt(totalRevenue)}</Text>
            )}
            {totalExpenses > 0 && (
              <Text style={styles.summaryExpense}>-{fmt(totalExpenses)}</Text>
            )}
          </View>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Aucune transaction"
            message={search || filterClient ? 'Aucun résultat pour ce filtre.' : 'Ajoutez votre première transaction.'}
            actionLabel={search || filterClient ? undefined : 'Ajouter une transaction'}
            onAction={search || filterClient ? undefined : () => navigation.navigate('AddTransaction')}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodBtnText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  periodBtnTextActive: { color: colors.textInverse },

  searchRow: {
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
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

  filterTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  filterTabActive: { backgroundColor: colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTabTextActive: { color: colors.textInverse },

  clientFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  clientFilterToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  clientFilterLabel: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  clearFilter: { padding: 4 },
  clientChipRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  clientChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  clientChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  clientChipTextActive: { color: colors.textInverse },

  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryCount: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  summaryAmounts: { flexDirection: 'row', gap: 10 },
  summaryRevenue: { fontSize: 12, fontWeight: '700', color: colors.success },
  summaryExpense: { fontSize: 12, fontWeight: '700', color: colors.error },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  txCard: { marginBottom: 10, padding: 0, overflow: 'hidden' },
  txContent: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },

  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },

  txInfo: { flex: 1 },
  txTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  txDesc: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  saleBadge: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  txMetaText: { fontSize: 11, color: colors.textDisabled },
  txDate: { fontSize: 11, color: colors.textDisabled },

  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clientBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  creditTag: {
    backgroundColor: colors.warningBackground,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  creditTagText: { fontSize: 10, fontWeight: '700', color: colors.warning },

  itemsList: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 6,
    gap: 2,
  },
  itemRow: { fontSize: 11, color: colors.textSecondary },

  txRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  discountLabel: { fontSize: 10, color: colors.textDisabled, textDecorationLine: 'line-through' },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.error}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TransactionsScreen;
