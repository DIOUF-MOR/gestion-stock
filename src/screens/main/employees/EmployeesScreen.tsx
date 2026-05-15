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
import { deleteEmployee } from '../../../services/employeeService';
import { canAddEmployee } from '../../../services/subscriptionService';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const EmployeesScreen = ({ navigation }) => {
  const { employees, loading, storeId } = useStore();
  const { subscription } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      return !searchQuery ||
        e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [employees, searchQuery]);

  const totalSalaries = useMemo(() => {
    return employees.filter(e => e.isActive !== false).reduce((sum, e) => sum + (e.salary || 0), 0);
  }, [employees]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleAddEmployee = () => {
    if (!canAddEmployee(subscription, employees.length)) {
      Alert.alert(
        'Limite atteinte',
        'Vous avez atteint la limite d\'employés de votre plan. Passez à un plan supérieur.',
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
    navigation.navigate('AddEmployee');
  };

  const handleDeleteEmployee = (employee) => {
    Alert.alert(
      'Supprimer l\'employé',
      `Voulez-vous vraiment supprimer "${employee.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEmployee(storeId, employee.id);
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

  const avatarColors = [
    colors.primary, colors.secondary, colors.accent,
    colors.success, colors.warning, colors.info,
  ];

  const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

  const renderEmployee = ({ item, index }) => (
    <Card style={styles.employeeCard} onPress={() => navigation.navigate('EmployeeDetail', { employee: item })}>
      <View style={styles.employeeContent}>
        <View style={[styles.avatar, { backgroundColor: `${getAvatarColor(index)}20` }]}>
          <Text style={[styles.avatarText, { color: getAvatarColor(index) }]}>
            {getInitials(item.name)}
          </Text>
        </View>

        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.employeeRole}>{item.role || 'Employé'}</Text>
          {item.salary > 0 && (
            <Text style={styles.employeeSalary}>
              Salaire: {formatCurrency(item.salary)}/mois
            </Text>
          )}
        </View>

        <View style={styles.employeeRight}>
          {item.isActive === false && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactif</Text>
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('AddEmployee', { employee: item })}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteEmployee(item)}
            >
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Card>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Employés</Text>
          <Text style={styles.headerSubtitle}>{employees.length} employé(s)</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddEmployee}>
          <Ionicons name="person-add" size={22} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Salary summary */}
      {totalSalaries > 0 && (
        <View style={styles.salarySummary}>
          <Ionicons name="cash-outline" size={18} color={colors.primary} />
          <Text style={styles.salarySummaryText}>
            Masse salariale mensuelle: <Text style={styles.salarySummaryAmount}>{formatCurrency(totalSalaries)}</Text>
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un employé..."
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
        data={filteredEmployees}
        keyExtractor={(item) => item.id}
        renderItem={renderEmployee}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Aucun employé"
            message={
              searchQuery
                ? 'Aucun employé ne correspond à votre recherche.'
                : 'Ajoutez votre premier employé pour commencer.'
            }
            actionLabel="Ajouter un employé"
            onAction={handleAddEmployee}
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  salarySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  salarySummaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  salarySummaryAmount: {
    fontWeight: '700',
    color: colors.primary,
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
  employeeCard: {
    marginBottom: 10,
  },
  employeeContent: {
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
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  employeeRole: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  employeeSalary: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  employeeRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  inactiveBadge: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
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

export default EmployeesScreen;
