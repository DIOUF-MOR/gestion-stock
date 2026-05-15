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
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { useAuth } from '../../../context/AuthContext';
import { deleteClient } from '../../../services/clientService';
import { canAddClient } from '../../../services/subscriptionService';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const ClientsScreen = ({ navigation }) => {
  const { clients, loading, storeId } = useStore();
  const { subscription } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDebt, setFilterDebt] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = !searchQuery ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);
      const matchesDebt = !filterDebt || (c.totalDebt > 0);
      return matchesSearch && matchesDebt;
    });
  }, [clients, searchQuery, filterDebt]);

  const totalDebt = useMemo(() => {
    return clients.reduce((sum, c) => sum + (c.totalDebt || 0), 0);
  }, [clients]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleAddClient = () => {
    if (!canAddClient(subscription, clients.length)) {
      Alert.alert(
        'Limite atteinte',
        'Vous avez atteint la limite de clients de votre plan. Passez à un plan supérieur.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Mettre à niveau',
            onPress: () => navigation.navigate('Paramètres', { screen: 'Subscription' }),
          },
        ]
      );
      return;
    }
    navigation.navigate('AddClient');
  };

  const handleDeleteClient = (client) => {
    Alert.alert(
      'Supprimer le client',
      `Voulez-vous vraiment supprimer "${client.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteClient(storeId, client.id);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const renderClient = ({ item }) => (
    <Card style={styles.clientCard} onPress={() => navigation.navigate('ClientDetail', { client: item })}>
      <View style={styles.clientContent}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${colors.secondary}20` }]}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>

        {/* Info */}
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
          {item.phone && (
            <Text style={styles.clientPhone}>{item.phone}</Text>
          )}
          {item.totalDebt > 0 && (
            <View style={styles.debtBadge}>
              <Ionicons name="alert-circle" size={12} color={colors.error} />
              <Text style={styles.debtText}>Doit: {formatCurrency(item.totalDebt)}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('AddClient', { client: item })}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteClient(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clients</Text>
          <Text style={styles.headerSubtitle}>{clients.length} client(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddClient}>
          <Ionicons name="person-add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Total debt summary */}
      {totalDebt > 0 && (
        <View style={styles.debtSummary}>
          <Ionicons name="wallet-outline" size={18} color={colors.warning} />
          <Text style={styles.debtSummaryText}>
            Total dû: <Text style={styles.debtSummaryAmount}>{formatCurrency(totalDebt)}</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setFilterDebt(!filterDebt)}
            style={[styles.filterButton, filterDebt && styles.filterButtonActive]}
          >
            <Text style={[styles.filterButtonText, filterDebt && styles.filterButtonTextActive]}>
              {filterDebt ? 'Tous' : 'Avec dettes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
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

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucun client"
            message={
              searchQuery
                ? 'Aucun client ne correspond à votre recherche.'
                : 'Ajoutez votre premier client pour commencer.'
            }
            actionLabel="Ajouter un client"
            onAction={handleAddClient}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  debtSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBackground,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  debtSummaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  debtSummaryAmount: {
    fontWeight: '700',
    color: colors.warning,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.textInverse,
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
    marginRight: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  clientCard: {
    marginBottom: 10,
  },
  clientContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clientPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  debtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  debtText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.error}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ClientsScreen;
