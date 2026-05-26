import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import Header from '../../../components/common/Header';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const PERIODS = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week',  label: '7 jours' },
  { key: 'month', label: '30 jours' },
  { key: 'all',   label: 'Tout' },
];

const PAYMENT_ICONS: Record<string, string> = {
  'Espèces':      'cash-outline',
  'Mobile Money': 'phone-portrait-outline',
  'Virement':     'swap-horizontal-outline',
  'Crédit':       'time-outline',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const fmtDate = (ts: any): string => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtTime = (ts: any): string => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const startOf = (period: string): Date => {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === 'week') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'month') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return new Date(0);
};

// ─── SaleCard ──────────────────────────────────────────────────────────────

const SaleCard = ({ sale }: { sale: any }) => {
  const [expanded, setExpanded] = useState(false);
  const hasItems = Array.isArray(sale.items) && sale.items.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateDay}>
              {sale.date?.toDate
                ? sale.date.toDate().getDate().toString().padStart(2, '0')
                : '—'}
            </Text>
            <Text style={styles.dateMonth}>
              {sale.date?.toDate
                ? sale.date.toDate().toLocaleDateString('fr-FR', { month: 'short' })
                : ''}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {sale.clientName || 'Client anonyme'}
            </Text>
            <View style={styles.cardMeta}>
              <Ionicons
                name={(PAYMENT_ICONS[sale.paymentMethod] || 'card-outline') as any}
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.cardMetaText}>{sale.paymentMethod || 'Espèces'}</Text>
              {hasItems && (
                <>
                  <Text style={styles.cardDot}>·</Text>
                  <Text style={styles.cardMetaText}>
                    {sale.items.length} article{sale.items.length > 1 ? 's' : ''}
                  </Text>
                </>
              )}
              <Text style={styles.cardDot}>·</Text>
              <Text style={styles.cardMetaText}>{fmtTime(sale.date)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>{fmt(sale.amount)}</Text>
          {sale.discount > 0 && (
            <Text style={styles.cardDiscount}>-{fmt(sale.discount)}</Text>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textDisabled}
          />
        </View>
      </View>

      {/* Line items (expanded) */}
      {expanded && hasItems && (
        <View style={styles.itemsContainer}>
          <View style={styles.itemsDivider} />
          {sale.items.map((item: any, idx: number) => (
            <View key={idx} style={styles.lineItem}>
              <Text style={styles.lineItemName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.lineItemQty}>
                {item.quantity} {item.unit}
              </Text>
              <Text style={styles.lineItemPrice}>
                {fmt(item.unitPrice)} × {item.quantity}
              </Text>
              <Text style={styles.lineItemSubtotal}>{fmt(item.subtotal)}</Text>
            </View>
          ))}
          {sale.discount > 0 && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Remise</Text>
              <Text style={styles.discountValue}>- {fmt(sale.discount)}</Text>
            </View>
          )}
          <View style={styles.totalLine}>
            <Text style={styles.totalLineLabel}>Total</Text>
            <Text style={styles.totalLineValue}>{fmt(sale.amount)}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── SalesHistoryScreen ────────────────────────────────────────────────────

const SalesHistoryScreen = ({ navigation }) => {
  const { transactions, loading } = useStore();
  const [period, setPeriod] = useState('month');

  const sales = useMemo(() => {
    const cutoff = startOf(period);
    return transactions.filter(t => {
      if (t.type !== 'revenue') return false;
      if (t.category !== 'Vente de produits') return false;
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date || 0);
      return d >= cutoff;
    });
  }, [transactions, period]);

  const stats = useMemo(() => {
    const total = sales.reduce((s, t) => s + (t.amount || 0), 0);
    const avg   = sales.length ? total / sales.length : 0;
    return { count: sales.length, total, avg };
  }, [sales]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Historique des ventes"
        subtitle="Toutes les transactions"
        onBack={() => navigation.goBack()}
        accentColor={colors.success}
        showShadow
      />

      {/* Period filter */}
      <View style={styles.periodBar}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.count}</Text>
          <Text style={styles.statLabel}>Ventes</Text>
        </View>
        <View style={[styles.statCard, styles.statCardMiddle]}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {fmt(stats.total)}
          </Text>
          <Text style={styles.statLabel}>Chiffre d'affaires</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{fmt(stats.avg)}</Text>
          <Text style={styles.statLabel}>Panier moyen</Text>
        </View>
      </View>

      {/* Sales list */}
      <FlatList
        data={sales}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <SaleCard sale={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Aucune vente"
            message={
              period === 'today'
                ? "Aucune vente enregistrée aujourd'hui."
                : `Aucune vente sur les ${period === 'week' ? '7' : '30'} derniers jours.`
            }
            actionLabel="Nouvelle vente"
            onAction={() => navigation.navigate('NewSale')}
          />
        }
      />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Period filter
  periodBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  periodBtn: {
    flex: 1, alignItems: 'center',
    paddingVertical: 7, borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  periodLabelActive: { color: colors.textInverse },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface,
    borderRadius: 12, padding: 12, alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statCardMiddle: { flex: 1.4 },
  statValue: {
    fontSize: 14, fontWeight: '800',
    color: colors.textPrimary, textAlign: 'center',
  },
  statLabel: {
    fontSize: 11, color: colors.textSecondary,
    marginTop: 3, textAlign: 'center',
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Sale card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14, marginBottom: 10,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  dateBlock: {
    width: 42, height: 48,
    backgroundColor: `${colors.primary}12`,
    borderRadius: 10, alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontSize: 18, fontWeight: '800', color: colors.primary, lineHeight: 20 },
  dateMonth: { fontSize: 10, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.textSecondary },
  cardDot: { fontSize: 12, color: colors.textDisabled },
  cardRight: { alignItems: 'flex-end', gap: 2 },
  cardAmount: { fontSize: 15, fontWeight: '800', color: colors.success },
  cardDiscount: { fontSize: 11, color: colors.error },

  // Line items
  itemsContainer: { marginTop: 8 },
  itemsDivider: { height: 1, backgroundColor: colors.divider, marginBottom: 10 },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    gap: 6,
  },
  lineItemName: { flex: 2, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  lineItemQty: { fontSize: 12, color: colors.textSecondary, minWidth: 40, textAlign: 'center' },
  lineItemPrice: { flex: 1, fontSize: 11, color: colors.textSecondary, textAlign: 'right' },
  lineItemSubtotal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, minWidth: 80, textAlign: 'right' },
  discountRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4, paddingHorizontal: 4,
  },
  discountLabel: { fontSize: 12, color: colors.error },
  discountValue: { fontSize: 12, color: colors.error, fontWeight: '600' },
  totalLine: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.divider,
    paddingTop: 8, marginTop: 4,
  },
  totalLineLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  totalLineValue: { fontSize: 15, fontWeight: '800', color: colors.success },
});

export default SalesHistoryScreen;
