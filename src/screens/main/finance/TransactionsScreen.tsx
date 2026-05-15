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
import { deleteTransaction } from '../../../services/financeService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';

moment.locale('fr');

const TransactionsScreen = ({ navigation }) => {
  const { transactions, loading, storeId } = useStore();
  const [filterType, setFilterType] = useState('all');

  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return transactions;
    return transactions.filter(t => t.type === filterType);
  }, [transactions, filterType]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleDelete = (transaction) => {
    Alert.alert(
      'Supprimer la transaction',
      'Voulez-vous vraiment supprimer cette transaction ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTransaction(storeId, transaction.id);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item }) => {
    const isRevenue = item.type === 'revenue';
    const date = item.date?.toDate ? item.date.toDate() : new Date(item.date);

    return (
      <Card style={styles.transactionCard}>
        <View style={styles.transactionContent}>
          <View style={[
            styles.transactionIcon,
            { backgroundColor: isRevenue ? `${colors.success}15` : `${colors.error}15` },
          ]}>
            <Ionicons
              name={isRevenue ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={24}
              color={isRevenue ? colors.success : colors.error}
            />
          </View>

          <View style={styles.transactionInfo}>
            <Text style={styles.transactionDesc} numberOfLines={1}>
              {item.description || item.category}
            </Text>
            <Text style={styles.transactionCategory}>{item.category}</Text>
            <Text style={styles.transactionDate}>
              {moment(date).format('D MMM YYYY')} • {item.paymentMethod || 'Espèces'}
            </Text>
          </View>

          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              { color: isRevenue ? colors.success : colors.error },
            ]}>
              {isRevenue ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
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
        onBack={() => navigation.goBack()}
        rightIcon="add"
        onRightPress={() => navigation.navigate('AddTransaction')}
      />

      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'revenue', label: 'Revenus' },
          { key: 'expense', label: 'Dépenses' },
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
            message="Ajoutez votre première transaction."
            actionLabel="Ajouter une transaction"
            onAction={() => navigation.navigate('AddTransaction')}
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
  transactionCard: {
    marginBottom: 10,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transactionCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
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

export default TransactionsScreen;
