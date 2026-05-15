import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { markDebtAsPaid, deleteDebt } from '../../../services/financeService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';

moment.locale('fr');

const DebtsScreen = ({ navigation }) => {
  const { debts, loading, storeId } = useStore();
  const [filterType, setFilterType] = useState('all');
  const [showPaid, setShowPaid] = useState(false);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const matchType = filterType === 'all' || d.type === filterType;
      const matchPaid = showPaid ? true : !d.isPaid;
      return matchType && matchPaid;
    });
  }, [debts, filterType, showPaid]);

  const totalReceivable = useMemo(() => {
    return debts
      .filter(d => d.type === 'receivable' && !d.isPaid)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [debts]);

  const totalPayable = useMemo(() => {
    return debts
      .filter(d => d.type === 'payable' && !d.isPaid)
      .reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [debts]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleMarkAsPaid = (debt) => {
    Alert.alert(
      'Marquer comme payé',
      `Confirmer le paiement de "${debt.description || 'cette dette'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const result = await markDebtAsPaid(storeId, debt.id);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (debt) => {
    Alert.alert(
      'Supprimer la dette',
      'Voulez-vous vraiment supprimer cette dette ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDebt(storeId, debt.id);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const renderDebt = ({ item }) => {
    const isReceivable = item.type === 'receivable';
    const isPaid = item.isPaid;
    const dueDate = item.dueDate?.toDate ? item.dueDate.toDate() : (item.dueDate ? new Date(item.dueDate) : null);
    const isOverdue = dueDate && !isPaid && dueDate < new Date();

    return (
      <Card style={[styles.debtCard, isOverdue && styles.overdueCard]}>
        <View style={styles.debtContent}>
          <View style={[
            styles.debtIcon,
            {
              backgroundColor: isPaid
                ? `${colors.success}15`
                : isReceivable ? `${colors.warning}15` : `${colors.error}15`,
            },
          ]}>
            <Ionicons
              name={isPaid ? 'checkmark-circle' : isReceivable ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={isPaid ? colors.success : isReceivable ? colors.warning : colors.error}
            />
          </View>

          <View style={styles.debtInfo}>
            <Text style={styles.debtDesc} numberOfLines={1}>
              {item.description || (isReceivable ? 'À recevoir' : 'À payer')}
            </Text>
            <Text style={styles.debtParty}>
              {isReceivable ? item.clientName : item.supplierName || 'Fournisseur'}
            </Text>
            {dueDate && (
              <Text style={[styles.debtDue, isOverdue && styles.debtDueOverdue]}>
                Échéance: {moment(dueDate).format('D MMM YYYY')}
                {isOverdue && ' (En retard!)'}
              </Text>
            )}
          </View>

          <View style={styles.debtRight}>
            <Text style={[
              styles.debtAmount,
              { color: isPaid ? colors.success : isReceivable ? colors.warning : colors.error },
            ]}>
              {formatCurrency(item.amount)}
            </Text>

            {!isPaid && (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => handleMarkAsPaid(item)}
              >
                <Ionicons name="checkmark" size={14} color={colors.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
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
        title="Gestion des dettes"
        onBack={() => navigation.goBack()}
        rightIcon="add"
        onRightPress={() => navigation.navigate('AddDebt')}
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: colors.warning }]}>
          <Text style={styles.summaryLabel}>À recevoir</Text>
          <Text style={[styles.summaryAmount, { color: colors.warning }]}>
            {formatCurrency(totalReceivable)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: colors.error }]}>
          <Text style={styles.summaryLabel}>À payer</Text>
          <Text style={[styles.summaryAmount, { color: colors.error }]}>
            {formatCurrency(totalPayable)}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={styles.filterTabs}>
          {[
            { key: 'all', label: 'Tous' },
            { key: 'receivable', label: 'À recevoir' },
            { key: 'payable', label: 'À payer' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
              onPress={() => setFilterType(f.key)}
            >
              <Text style={[styles.filterTabText, filterType === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.showPaidBtn, showPaid && styles.showPaidBtnActive]}
          onPress={() => setShowPaid(!showPaid)}
        >
          <Text style={[styles.showPaidText, showPaid && styles.showPaidTextActive]}>
            {showPaid ? 'Cacher payés' : 'Voir payés'}
          </Text>
        </TouchableOpacity>
      </View>

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
            message="Aucune dette à afficher."
            actionLabel="Ajouter une dette"
            onAction={() => navigation.navigate('AddDebt')}
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
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
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.textInverse,
  },
  showPaidBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  showPaidBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  showPaidText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  showPaidTextActive: {
    color: colors.textInverse,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  debtCard: {
    marginBottom: 10,
  },
  overdueCard: {
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  debtContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  debtParty: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  debtDue: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },
  debtDueOverdue: {
    color: colors.error,
    fontWeight: '700',
  },
  debtRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  debtAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  payBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.success}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DebtsScreen;
