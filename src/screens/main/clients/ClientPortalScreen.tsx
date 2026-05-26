import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/fr';

import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import {
  getClientTransactions,
  getClientDebts,
  markClientDebtPaid,
  applyPartialPayment,
  deleteClient,
} from '../../../services/clientService';
import { activateClientAccount } from '../../../services/authService';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

moment.locale('fr');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(amount || 0) + ' FCFA';

const getInitials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getClientStatus = (txCount: number): { label: string; color: string } => {
  if (txCount >= 10) return { label: 'VIP', color: colors.accent };
  if (txCount >= 3) return { label: 'Régulier', color: colors.primary };
  return { label: 'Nouveau', color: colors.success };
};

const getPaymentIcon = (method: string): string => {
  switch (method) {
    case 'Espèces': return 'cash-outline';
    case 'Mobile Money': return 'phone-portrait-outline';
    case 'Virement': return 'swap-horizontal-outline';
    case 'Crédit': return 'time-outline';
    default: return 'card-outline';
  }
};

const getPaymentColor = (method: string): string => {
  switch (method) {
    case 'Espèces': return colors.success;
    case 'Mobile Money': return colors.primary;
    case 'Crédit': return colors.warning;
    default: return colors.textSecondary;
  }
};

// ─── Period filter helpers ─────────────────────────────────────────────────────

const PURCHASE_PERIODS = [
  { label: 'Tout', days: 0 },
  { label: '7 jours', days: 7 },
  { label: '30 jours', days: 30 },
  { label: '3 mois', days: 90 },
];

const STATEMENT_PERIODS = [
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '1 an', days: 365 },
  { label: 'Tout', days: 0 },
];

const filterByPeriod = <T extends { date?: any; createdAt?: any }>(
  items: T[],
  days: number,
  dateField: 'date' | 'createdAt' = 'date'
): T[] => {
  if (days === 0) return items;
  const cutoff = moment().subtract(days, 'days').toDate();
  return items.filter((item) => {
    const raw = item[dateField];
    const d = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
    return d && d >= cutoff;
  });
};

const getItemDate = (item: any): Date | null => {
  const raw = item.date ?? item.createdAt;
  if (!raw) return null;
  return raw.toDate ? raw.toDate() : new Date(raw);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TabBar = ({
  tabs,
  active,
  badges,
  onPress,
}: {
  tabs: string[];
  active: number;
  badges?: (number | null)[];
  onPress: (i: number) => void;
}) => (
  <View style={styles.tabBar}>
    {tabs.map((t, i) => (
      <TouchableOpacity
        key={t}
        style={[styles.tabItem, active === i && styles.tabItemActive]}
        onPress={() => onPress(i)}
      >
        <View style={styles.tabInner}>
          <Text style={[styles.tabText, active === i && styles.tabTextActive]}>{t}</Text>
          {badges && badges[i] != null && badges[i]! > 0 && (
            <View style={[styles.tabBadge, active === i && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, active === i && styles.tabBadgeTextActive]}>
                {badges[i]}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ))}
  </View>
);

const PeriodChips = ({
  periods,
  active,
  onPress,
}: {
  periods: { label: string; days: number }[];
  active: number;
  onPress: (i: number) => void;
}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
    {periods.map((p, i) => (
      <TouchableOpacity
        key={p.label}
        style={[styles.periodChip, active === i && styles.periodChipActive]}
        onPress={() => onPress(i)}
      >
        <Text style={[styles.periodChipText, active === i && styles.periodChipTextActive]}>
          {p.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const ClientPortalScreen = ({ navigation, route }) => {
  const client = route.params?.client;
  const { storeId } = useStore();

  const [activeTab, setActiveTab] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Purchase filter
  const [purchasePeriodIdx, setPurchasePeriodIdx] = useState(0);

  // Statement filter
  const [statementPeriodIdx, setStatementPeriodIdx] = useState(1);

  // Partial payment state: debtId -> input string
  const [partialInputVisible, setPartialInputVisible] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState('');

  // Account activation modal
  const [activationModalVisible, setActivationModalVisible] = useState(false);
  const [activationPassword, setActivationPassword] = useState('');
  const [activationConfirm, setActivationConfirm] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientActivated, setClientActivated] = useState(!!client?.isActivated);

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!storeId || !client?.id) return;
    setLoading(true);
    const [txRes, debtRes] = await Promise.all([
      getClientTransactions(storeId, client.id),
      getClientDebts(storeId, client.id),
    ]);
    if (txRes.success) setTransactions(txRes.transactions);
    if (debtRes.success) setDebts(debtRes.debts);
    setLoading(false);
  }, [storeId, client?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ── Derived data ──────────────────────────────────────────────

  const unpaidDebts = useMemo(
    () => {
      const filtered = debts.filter((d) => !d.isPaid);
      // Sort: overdue first → due date ascending → amount descending
      return filtered.sort((a, b) => {
        const aOverdue = a.dueDate && moment(a.dueDate).isBefore(moment(), 'day');
        const bOverdue = b.dueDate && moment(b.dueDate).isBefore(moment(), 'day');
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (b.amount || 0) - (a.amount || 0);
      });
    },
    [debts]
  );

  const paidDebts = useMemo(
    () => debts.filter((d) => d.isPaid).slice(0, 5),
    [debts]
  );

  const totalDebt = useMemo(
    () => unpaidDebts.reduce((s, d) => s + (d.amount || 0), 0),
    [unpaidDebts]
  );

  const overdueCount = useMemo(
    () => unpaidDebts.filter((d) => d.dueDate && moment(d.dueDate).isBefore(moment(), 'day')).length,
    [unpaidDebts]
  );

  const status = getClientStatus(transactions.length);

  const lastVisit = useMemo(() => {
    if (transactions.length === 0) return null;
    const d = getItemDate(transactions[0]);
    return d ? moment(d).fromNow() : null;
  }, [transactions]);

  const totalRevenue = useMemo(
    () => transactions.reduce((s, t) => s + (t.amount || 0), 0),
    [transactions]
  );

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    const days = PURCHASE_PERIODS[purchasePeriodIdx].days;
    return filterByPeriod(transactions, days, 'date');
  }, [transactions, purchasePeriodIdx]);

  const filteredPurchasesTotal = useMemo(
    () => filteredPurchases.reduce((s, t) => s + (t.amount || 0), 0),
    [filteredPurchases]
  );

  // Statement data
  const statementDays = STATEMENT_PERIODS[statementPeriodIdx].days;

  const statementTransactions = useMemo(
    () => filterByPeriod(transactions, statementDays, 'date'),
    [transactions, statementDays]
  );

  const statementDebts = useMemo(
    () => filterByPeriod(debts, statementDays, 'createdAt'),
    [debts, statementDays]
  );

  const statementTotalAchats = useMemo(
    () => statementTransactions.reduce((s, t) => s + (t.amount || 0), 0),
    [statementTransactions]
  );

  const statementTotalCredits = useMemo(
    () => statementDebts.reduce((s, d) => s + (d.amount || 0), 0),
    [statementDebts]
  );

  const statementEncaisse = useMemo(
    () =>
      statementTransactions
        .filter((t) => t.paymentMethod !== 'Crédit')
        .reduce((s, t) => s + (t.amount || 0), 0),
    [statementTransactions]
  );

  const statementSoldeDu = useMemo(
    () => statementDebts.filter((d) => !d.isPaid).reduce((s, d) => s + (d.amount || 0), 0),
    [statementDebts]
  );

  // Combined chronological list for statement
  const statementItems = useMemo(() => {
    const txItems = statementTransactions.map((t) => ({ ...t, _kind: 'transaction' }));
    const debtItems = statementDebts.map((d) => ({ ...d, _kind: 'debt' }));
    return [...txItems, ...debtItems].sort((a, b) => {
      const da = getItemDate(a)?.getTime() ?? 0;
      const db2 = getItemDate(b)?.getTime() ?? 0;
      return db2 - da;
    });
  }, [statementTransactions, statementDebts]);

  // Tab badges
  const tabBadges = useMemo(() => [
    null,
    filteredPurchases.length > 0 ? filteredPurchases.length : null,
    unpaidDebts.length > 0 ? unpaidDebts.length : null,
    null,
  ], [filteredPurchases.length, unpaidDebts.length]);

  // ── Actions ───────────────────────────────────────────────────

  const handleCall = () => {
    if (client.phone) Linking.openURL(`tel:${client.phone}`);
  };

  const handleWhatsApp = () => {
    if (client.phone) {
      const phone = client.phone.replace(/\D/g, '');
      Linking.openURL(`https://wa.me/${phone}`);
    }
  };

  const handleDeleteClient = () => {
    Alert.alert(
      'Supprimer le client',
      `Voulez-vous vraiment supprimer "${client.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteClient(storeId, client.id);
            if (res.success) {
              navigation.goBack();
            } else {
              Alert.alert('Erreur', res.error);
            }
          },
        },
      ]
    );
  };

  const handleActivateAccount = async () => {
    if (!client?.phone) {
      Alert.alert('Numéro manquant', 'Ce client n\'a pas de numéro de téléphone.');
      return;
    }
    if (activationPassword.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (activationPassword !== activationConfirm) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setActivationLoading(true);
    const res = await activateClientAccount({
      clientId: client.id,
      storeId,
      phone: client.phone,
      name: client.name,
      password: activationPassword,
    });
    setActivationLoading(false);
    if (res.success) {
      setClientActivated(true);
      setActivationModalVisible(false);
      setActivationPassword('');
      setActivationConfirm('');
      Alert.alert('Compte activé', `${client.name} peut maintenant se connecter avec son numéro de téléphone.`);
    } else {
      Alert.alert('Erreur', res.error);
    }
  };

  const handleMarkPaid = (debt: any) => {
    Alert.alert(
      'Solder la dette',
      `Confirmer le paiement complet de ${fmt(debt.amount)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const res = await markClientDebtPaid(storeId, debt.id, client.id, debt.amount);
            if (res.success) {
              loadData();
            } else {
              Alert.alert('Erreur', res.error);
            }
          },
        },
      ]
    );
  };

  const handlePartialPayment = async (debt: any) => {
    const payment = parseFloat(partialAmount);
    if (!payment || payment <= 0) {
      Alert.alert('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }
    if (payment > debt.amount) {
      Alert.alert('Montant trop élevé', `Le montant ne peut pas dépasser ${fmt(debt.amount)}.`);
      return;
    }
    const res = await applyPartialPayment(storeId, debt.id, client.id, payment, debt.amount);
    if (res.success) {
      setPartialInputVisible(null);
      setPartialAmount('');
      loadData();
    } else {
      Alert.alert('Erreur', res.error);
    }
  };

  const handleShareStatement = () => {
    const lines: string[] = [
      `*Relevé client — ${client.name}*`,
      `Période : ${STATEMENT_PERIODS[statementPeriodIdx].label}`,
      `Date : ${moment().format('DD/MM/YYYY')}`,
      '',
      `Total achats    : ${fmt(statementTotalAchats)}`,
      `Crédits accordés: ${fmt(statementTotalCredits)}`,
      `Montant encaissé: ${fmt(statementEncaisse)}`,
      `Solde dû        : ${fmt(statementSoldeDu)}`,
      '',
      '--- Détail ---',
      ...statementItems.map((item) => {
        const d = getItemDate(item);
        const dateStr = d ? moment(d).format('DD/MM/YY') : '?';
        if (item._kind === 'transaction') {
          return `${dateStr} | Achat ${fmt(item.amount)} (${item.paymentMethod})`;
        }
        return `${dateStr} | Crédit ${fmt(item.amount)}${item.isPaid ? ' ✓' : ''}`;
      }),
    ];
    const text = lines.join('\n');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  // ── Render helpers ────────────────────────────────────────────

  const renderTransactionItem = ({ item }: { item: any }) => {
    const d = getItemDate(item);
    const dateStr = d ? moment(d).format('DD MMM YYYY') : '—';
    const itemCount = item.items?.length ?? 0;
    const itemNames = item.items
      ?.slice(0, 2)
      .map((it: any) => it.productName || it.name)
      .filter(Boolean)
      .join(', ');
    const isCredit = item.paymentMethod === 'Crédit';

    return (
      <View style={styles.txCard}>
        <View style={styles.txLeft}>
          <View style={[styles.txIconWrap, { backgroundColor: `${getPaymentColor(item.paymentMethod)}15` }]}>
            <Ionicons
              name={getPaymentIcon(item.paymentMethod) as any}
              size={18}
              color={getPaymentColor(item.paymentMethod)}
            />
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txDesc} numberOfLines={1}>
              {itemNames || (itemCount > 0 ? `${itemCount} article(s)` : item.description || 'Vente')}
            </Text>
            <View style={styles.txMeta}>
              <Text style={styles.txDate}>{dateStr}</Text>
              {itemCount > 0 && (
                <View style={styles.txItemsBadge}>
                  <Text style={styles.txItemsBadgeText}>{itemCount} art.</Text>
                </View>
              )}
              <View style={[styles.txMethodBadge, { backgroundColor: `${getPaymentColor(item.paymentMethod)}15` }]}>
                <Text style={[styles.txMethodText, { color: getPaymentColor(item.paymentMethod) }]}>
                  {item.paymentMethod || '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={[styles.txAmount, isCredit && { color: colors.warning }]}>
          {fmt(item.amount)}
        </Text>
      </View>
    );
  };

  const renderDebtCard = (item: any) => {
    const d = getItemDate(item) ?? (item.createdAt?.toDate ? item.createdAt.toDate() : null);
    const dateStr = d ? moment(d).format('DD MMM YYYY') : '—';
    const hasDueDate = !!item.dueDate;
    const isOverdue =
      hasDueDate && !item.isPaid && moment(item.dueDate).isBefore(moment(), 'day');
    const isExpanded = partialInputVisible === item.id;
    const partialPaid = item.partialPaid || 0;
    const remaining = (item.amount || 0) - partialPaid;

    return (
      <View key={item.id} style={[styles.debtCard, isOverdue && styles.debtCardOverdue]}>
        {/* Overdue badge */}
        {isOverdue && (
          <View style={styles.overdueBanner}>
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Text style={styles.overdueBannerText}>En retard</Text>
          </View>
        )}

        <View style={styles.debtCardTop}>
          <View style={styles.debtCardLeft}>
            <Text style={styles.debtDesc} numberOfLines={2}>
              {item.description || 'Crédit'}
            </Text>
            <Text style={styles.debtDate}>{dateStr}</Text>
            {hasDueDate && (
              <Text style={[styles.debtDue, isOverdue && styles.debtDueOverdue]}>
                <Ionicons name="calendar-outline" size={11} /> Échéance : {moment(item.dueDate).format('DD MMM YYYY')}
              </Text>
            )}
          </View>
          <View style={styles.debtAmountCol}>
            <Text style={[styles.debtAmount, isOverdue && { color: colors.error }]}>
              {fmt(item.amount)}
            </Text>
            {partialPaid > 0 && (
              <Text style={styles.debtRemaining}>Reste : {fmt(remaining)}</Text>
            )}
          </View>
        </View>

        {partialPaid > 0 && (
          <View style={styles.partialProgress}>
            <View style={styles.partialProgressBar}>
              <View
                style={[
                  styles.partialProgressFill,
                  { width: `${Math.min(100, (partialPaid / item.amount) * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.partialProgressText}>
              {fmt(partialPaid)} payé
            </Text>
          </View>
        )}

        <View style={styles.debtActions}>
          <TouchableOpacity
            style={styles.debtBtnPartial}
            onPress={() => {
              if (isExpanded) {
                setPartialInputVisible(null);
                setPartialAmount('');
              } else {
                setPartialInputVisible(item.id);
                setPartialAmount('');
              }
            }}
          >
            <Ionicons name="wallet-outline" size={14} color={colors.warning} />
            <Text style={styles.debtBtnPartialText}>Paiement partiel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.debtBtnPay} onPress={() => handleMarkPaid(item)}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.textInverse} />
            <Text style={styles.debtBtnPayText}>Solder</Text>
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.partialRow}>
            <TextInput
              style={styles.partialInput}
              placeholder={`Montant payé sur ${fmt(remaining)}`}
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
              <Text style={styles.partialConfirmText}>Valider</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderStatementItem = (item: any) => {
    const d = getItemDate(item);
    const dateStr = d ? moment(d).format('DD MMM YY') : '—';
    const isDebt = item._kind === 'debt';
    const itemCount = item.items?.length ?? 0;
    const itemNames = item.items
      ?.slice(0, 2)
      .map((it: any) => it.productName || it.name)
      .filter(Boolean)
      .join(', ');

    return (
      <View key={`${item._kind}-${item.id}`} style={styles.stmtRow}>
        <View style={[styles.stmtIconWrap, { backgroundColor: isDebt ? `${colors.error}15` : `${colors.success}15` }]}>
          <Ionicons
            name={isDebt ? 'time-outline' : (getPaymentIcon(item.paymentMethod) as any)}
            size={16}
            color={isDebt ? colors.error : colors.success}
          />
        </View>
        <View style={styles.stmtInfo}>
          <Text style={styles.stmtLabel} numberOfLines={1}>
            {isDebt
              ? (item.description || 'Crédit accordé')
              : (itemNames || item.description || `Achat (${item.paymentMethod || '—'})`)}
          </Text>
          <View style={styles.stmtMeta}>
            <Text style={styles.stmtDate}>{dateStr}</Text>
            {isDebt && (
              <View style={[styles.stmtStatusBadge, { backgroundColor: item.isPaid ? `${colors.success}15` : `${colors.error}15` }]}>
                <Text style={[styles.stmtStatusText, { color: item.isPaid ? colors.success : colors.error }]}>
                  {item.isPaid ? 'Soldé' : 'Impayé'}
                </Text>
              </View>
            )}
            {!isDebt && itemCount > 0 && (
              <View style={styles.stmtItemsBadge}>
                <Text style={styles.stmtItemsText}>{itemCount} art.</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.stmtAmount, { color: isDebt ? colors.error : colors.success }]}>
          {isDebt ? '-' : '+'}{fmt(item.amount)}
        </Text>
      </View>
    );
  };

  // ── TAB RENDERS ───────────────────────────────────────────────

  const renderApercu = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Overdue alert */}
      {overdueCount > 0 && (
        <View style={styles.overdueAlert}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.overdueAlertText}>
            {overdueCount} dette{overdueCount > 1 ? 's' : ''} en retard
          </Text>
          <TouchableOpacity onPress={() => setActiveTab(2)}>
            <Text style={styles.overdueAlertLink}>Voir</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="receipt-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Achats</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="trending-up-outline" size={20} color={colors.success} />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{fmt(totalRevenue)}</Text>
          <Text style={styles.statLabel}>CA total</Text>
        </View>
        <View style={[styles.statCard, totalDebt > 0 && styles.statCardDanger]}>
          <View style={[styles.statIconWrap, { backgroundColor: totalDebt > 0 ? `${colors.error}15` : `${colors.success}15` }]}>
            <Ionicons name="time-outline" size={20} color={totalDebt > 0 ? colors.error : colors.success} />
          </View>
          <Text style={[styles.statValue, totalDebt > 0 && { color: colors.error }]} numberOfLines={1}>
            {fmt(totalDebt)}
          </Text>
          <Text style={styles.statLabel}>Dettes</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: `${colors.accent}15` }]}>
            <Ionicons name="time-outline" size={20} color={colors.accent} />
          </View>
          <Text style={styles.statValue} numberOfLines={1}>{lastVisit || '—'}</Text>
          <Text style={styles.statLabel}>Dernière visite</Text>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.qaBtn, !client.phone && styles.qaBtnDisabled]}
          onPress={handleCall}
          disabled={!client.phone}
        >
          <View style={[styles.qaIcon, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="call" size={22} color={client.phone ? colors.success : colors.textDisabled} />
          </View>
          <Text style={[styles.qaLabel, !client.phone && { color: colors.textDisabled }]}>Appeler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.qaBtn, !client.phone && styles.qaBtnDisabled]}
          onPress={handleWhatsApp}
          disabled={!client.phone}
        >
          <View style={[styles.qaIcon, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="logo-whatsapp" size={22} color={client.phone ? colors.success : colors.textDisabled} />
          </View>
          <Text style={[styles.qaLabel, !client.phone && { color: colors.textDisabled }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qaBtn}
          onPress={() => navigation.navigate('ClientNewSale', { client })}
        >
          <View style={[styles.qaIcon, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="cart" size={22} color={colors.primary} />
          </View>
          <Text style={styles.qaLabel}>Vente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qaBtn}
          onPress={() =>
            navigation.navigate('Finance', {
              screen: 'AddDebt',
              params: { clientId: client.id, clientName: client.name },
            })
          }
        >
          <View style={[styles.qaIcon, { backgroundColor: `${colors.warning}18` }]}>
            <Ionicons name="add-circle" size={22} color={colors.warning} />
          </View>
          <Text style={styles.qaLabel}>Crédit</Text>
        </TouchableOpacity>
      </View>

      {/* Contact info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Informations de contact</Text>
        {client.phone ? (
          <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
            <Ionicons name="call-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>{client.phone}</Text>
          </TouchableOpacity>
        ) : null}
        {client.email ? (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{client.email}</Text>
          </View>
        ) : null}
        {client.address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{client.address}</Text>
          </View>
        ) : null}
        {client.notes ? (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{client.notes}</Text>
          </View>
        ) : null}
        {!client.phone && !client.email && !client.address && !client.notes && (
          <Text style={styles.noInfoText}>Aucune information de contact renseignée.</Text>
        )}
      </View>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteClient}>
        <Ionicons name="trash-outline" size={18} color={colors.error} />
        <Text style={styles.deleteBtnText}>Supprimer ce client</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAchats = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <PeriodChips
        periods={PURCHASE_PERIODS}
        active={purchasePeriodIdx}
        onPress={setPurchasePeriodIdx}
      />

      {/* Summary bar */}
      {filteredPurchases.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryBarItem}>
            <Text style={styles.summaryBarValue}>{filteredPurchases.length}</Text>
            <Text style={styles.summaryBarLabel}>vente(s)</Text>
          </View>
          <View style={styles.summaryBarDivider} />
          <View style={styles.summaryBarItem}>
            <Text style={[styles.summaryBarValue, { color: colors.success }]}>{fmt(filteredPurchasesTotal)}</Text>
            <Text style={styles.summaryBarLabel}>total encaissé</Text>
          </View>
        </View>
      )}

      {filteredPurchases.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucun achat"
          message="Aucun achat pour la période sélectionnée."
        />
      ) : (
        filteredPurchases.map((item) => (
          <View key={item.id}>{renderTransactionItem({ item })}</View>
        ))
      )}
    </ScrollView>
  );

  const renderDettes = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <View style={styles.overdueAlert}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.overdueAlertText}>
            {overdueCount} dette{overdueCount > 1 ? 's' : ''} en retard de paiement
          </Text>
        </View>
      )}

      {/* Total dû */}
      <View style={[styles.debtSummary, totalDebt > 0 ? styles.debtSummaryDanger : styles.debtSummaryClear]}>
        <View style={styles.debtSummaryLeft}>
          <Ionicons
            name={totalDebt > 0 ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={28}
            color={totalDebt > 0 ? colors.error : colors.success}
          />
          <View>
            <Text style={styles.debtSummaryLabel}>Total dû</Text>
            <Text style={[styles.debtSummaryAmount, { color: totalDebt > 0 ? colors.error : colors.success }]}>
              {fmt(totalDebt)}
            </Text>
          </View>
        </View>
        {unpaidDebts.length > 0 && (
          <View style={styles.debtSummaryCount}>
            <Text style={styles.debtSummaryCountNum}>{unpaidDebts.length}</Text>
            <Text style={styles.debtSummaryCountLabel}>dette{unpaidDebts.length > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {/* Unpaid debts */}
      {unpaidDebts.length > 0 ? (
        unpaidDebts.map((debt) => renderDebtCard(debt))
      ) : (
        <View style={styles.noDebtBox}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.noDebtText}>Aucune dette impayée</Text>
          <Text style={styles.noDebtSub}>Ce client est à jour dans ses paiements.</Text>
        </View>
      )}

      {/* Add credit button */}
      <TouchableOpacity
        style={styles.addDebtBtn}
        onPress={() =>
          navigation.navigate('Finance', {
            screen: 'AddDebt',
            params: { clientId: client.id, clientName: client.name },
          })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.addDebtBtnText}>Ajouter un crédit</Text>
      </TouchableOpacity>

      {/* Paid debts */}
      {paidDebts.length > 0 && (
        <>
          <View style={styles.paidSeparator}>
            <View style={styles.paidSepLine} />
            <Text style={styles.paidSepLabel}>Soldées ({paidDebts.length})</Text>
            <View style={styles.paidSepLine} />
          </View>
          {paidDebts.map((debt) => {
            const d = getItemDate(debt) ?? (debt.createdAt?.toDate ? debt.createdAt.toDate() : null);
            return (
              <View key={debt.id} style={[styles.debtCard, styles.debtCardPaid]}>
                <View style={styles.debtCardTop}>
                  <View style={styles.debtCardLeft}>
                    <Text style={[styles.debtDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {debt.description || 'Crédit'}
                    </Text>
                    <Text style={styles.debtDate}>
                      {d ? moment(d).format('DD MMM YYYY') : '—'}
                    </Text>
                  </View>
                  <View style={styles.debtAmountColPaid}>
                    <Text style={styles.debtAmountPaid}>{fmt(debt.amount)}</Text>
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                      <Text style={styles.paidBadgeText}>Soldé</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );

  const renderReleve = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <PeriodChips
        periods={STATEMENT_PERIODS}
        active={statementPeriodIdx}
        onPress={setStatementPeriodIdx}
      />

      {/* Summary box */}
      <View style={styles.releveSummary}>
        <Text style={styles.releveSummaryTitle}>Résumé de la période</Text>
        <View style={styles.releveSummaryRow}>
          <View style={styles.releveSummaryLeft}>
            <Ionicons name="receipt-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.releveSummaryLabel}>Total achats</Text>
          </View>
          <Text style={styles.releveSummaryValue}>{fmt(statementTotalAchats)}</Text>
        </View>
        <View style={styles.releveSummaryRow}>
          <View style={styles.releveSummaryLeft}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.releveSummaryLabel}>Crédits accordés</Text>
          </View>
          <Text style={[styles.releveSummaryValue, { color: colors.warning }]}>
            {fmt(statementTotalCredits)}
          </Text>
        </View>
        <View style={styles.releveSummaryRow}>
          <View style={styles.releveSummaryLeft}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={styles.releveSummaryLabel}>Montant encaissé</Text>
          </View>
          <Text style={[styles.releveSummaryValue, { color: colors.success }]}>
            {fmt(statementEncaisse)}
          </Text>
        </View>
        <View style={[styles.releveSummaryRow, styles.releveSummaryLastRow]}>
          <View style={styles.releveSummaryLeft}>
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={statementSoldeDu > 0 ? colors.error : colors.success}
            />
            <Text style={[styles.releveSummaryLabel, { fontWeight: '700', color: colors.textPrimary }]}>
              Solde dû
            </Text>
          </View>
          <Text
            style={[
              styles.releveSummaryValue,
              { color: statementSoldeDu > 0 ? colors.error : colors.success, fontWeight: '800', fontSize: 16 },
            ]}
          >
            {fmt(statementSoldeDu)}
          </Text>
        </View>
      </View>

      {/* Combined timeline */}
      {statementItems.length > 0 ? (
        <>
          <Text style={styles.timelineTitle}>Détail des opérations</Text>
          {statementItems.map((item) => renderStatementItem(item))}
        </>
      ) : (
        <EmptyState
          icon="document-text-outline"
          title="Aucune donnée"
          message="Aucune transaction ni dette pour cette période."
        />
      )}

      {/* WhatsApp share */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShareStatement}>
        <Ionicons name="logo-whatsapp" size={20} color={colors.textInverse} />
        <Text style={styles.shareBtnText}>Partager via WhatsApp</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── MAIN RENDER ───────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingSpinner fullScreen />
      </SafeAreaView>
    );
  }

  const tabs = ['Aperçu', 'Achats', 'Dettes', 'Relevé'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portail Client</Text>
        <TouchableOpacity
          style={styles.headerEdit}
          onPress={() => navigation.navigate('AddClient', { client })}
        >
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{getInitials(client.name)}</Text>
        </View>
        <Text style={styles.heroName}>{client.name}</Text>
        <View style={styles.heroRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
            <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
          </View>
          {clientActivated ? (
            <View style={styles.activatedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.activatedBadgeText}>Compte actif</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.activateBtn}
              onPress={() => setActivationModalVisible(true)}
            >
              <Ionicons name="person-add-outline" size={13} color={colors.primary} />
              <Text style={styles.activateBtnText}>Activer le compte</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        active={activeTab}
        badges={tabBadges}
        onPress={setActiveTab}
      />

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 0 && renderApercu()}
        {activeTab === 1 && renderAchats()}
        {activeTab === 2 && renderDettes()}
        {activeTab === 3 && renderReleve()}
      </View>

      {/* Account activation modal */}
      <Modal
        visible={activationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActivationModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activer le compte</Text>
              <TouchableOpacity onPress={() => setActivationModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Créez un mot de passe pour {client?.name}. Il pourra ensuite se connecter avec
              son numéro <Text style={{ fontWeight: '700' }}>{client?.phone}</Text>.
            </Text>

            <Text style={styles.inputLabel}>Mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 6 caractères"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showPassword}
                value={activationPassword}
                onChangeText={setActivationPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Répéter le mot de passe"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showConfirm}
                value={activationConfirm}
                onChangeText={setActivationConfirm}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm(v => !v)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, activationLoading && { opacity: 0.7 }]}
              onPress={handleActivateAccount}
              disabled={activationLoading}
            >
              {activationLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color={colors.textInverse} />
                  <Text style={styles.modalConfirmText}>Activer le compte</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBack: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  headerEdit: { padding: 4 },

  // Hero section
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.secondary,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activatedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  activateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  // Activation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  modalConfirmText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textInverse,
  },

  // Tab content container
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Overdue alert
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  overdueAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  overdueAlertLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    textDecorationLine: 'underline',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardDanger: {
    backgroundColor: colors.errorBackground,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  qaBtn: { alignItems: 'center', gap: 6 },
  qaBtnDisabled: { opacity: 0.4 },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 64,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  noInfoText: {
    fontSize: 13,
    color: colors.textDisabled,
    fontStyle: 'italic',
  },

  // Delete button
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.errorBackground,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
  },

  // Period chips
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodChipTextActive: {
    color: colors.textInverse,
  },

  // Summary bar (achats)
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  summaryBarItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryBarDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  summaryBarValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  summaryBarLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Transaction card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  txLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  txIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  txDate: { fontSize: 11, color: colors.textSecondary },
  txItemsBadge: {
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txItemsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  txMethodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txMethodText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txAmount: { fontSize: 14, fontWeight: '800', color: colors.success, marginLeft: 4 },

  // Debt summary card
  debtSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  debtSummaryDanger: {
    backgroundColor: colors.errorBackground,
    borderWidth: 1,
    borderColor: `${colors.error}25`,
  },
  debtSummaryClear: {
    backgroundColor: colors.successBackground,
    borderWidth: 1,
    borderColor: `${colors.success}25`,
  },
  debtSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  debtSummaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  debtSummaryAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  debtSummaryCount: {
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  debtSummaryCountNum: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.error,
  },
  debtSummaryCountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.error,
  },

  // Debt card
  debtCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  debtCardOverdue: {
    borderLeftColor: colors.error,
  },
  debtCardPaid: {
    borderLeftColor: colors.success,
    opacity: 0.7,
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.errorBackground,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  overdueBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  debtCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  debtCardLeft: { flex: 1 },
  debtDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  debtDate: { fontSize: 12, color: colors.textSecondary },
  debtDue: { fontSize: 12, color: colors.warning, marginTop: 3 },
  debtDueOverdue: { color: colors.error },
  debtAmountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.warning,
  },
  debtRemaining: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  debtAmountColPaid: {
    alignItems: 'flex-end',
    gap: 4,
  },
  debtAmountPaid: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Partial payment progress
  partialProgress: {
    marginBottom: 10,
    gap: 4,
  },
  partialProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  partialProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  partialProgressText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },

  // Debt action buttons
  debtActions: {
    flexDirection: 'row',
    gap: 8,
  },
  debtBtnPartial: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.warning,
    backgroundColor: colors.warningBackground,
  },
  debtBtnPartialText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
  },
  debtBtnPay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.success,
  },
  debtBtnPayText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },

  // Partial payment inline input
  partialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  partialInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  partialConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  partialConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },

  // No debt box
  noDebtBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  noDebtText: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
  },
  noDebtSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Add debt button
  addDebtBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
    marginBottom: 16,
    marginTop: 4,
  },
  addDebtBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },

  // Paid separator
  paidSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  paidSepLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  paidSepLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Paid badge
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },

  // Statement summary
  releveSummary: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  releveSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  releveSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  releveSummaryLastRow: {
    borderBottomWidth: 0,
    paddingTop: 14,
    marginTop: 2,
  },
  releveSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  releveSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  releveSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Timeline title
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Statement timeline row
  stmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stmtIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stmtInfo: { flex: 1 },
  stmtLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  stmtMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stmtDate: { fontSize: 11, color: colors.textSecondary },
  stmtStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stmtStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stmtItemsBadge: {
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stmtItemsText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  stmtAmount: { fontSize: 13, fontWeight: '800' },

  // Share button
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
});

export default ClientPortalScreen;
