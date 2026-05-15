import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { deleteEmployee, toggleEmployeeStatus } from '../../../services/employeeService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';

moment.locale('fr');

const EmployeeDetailScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const employee = route.params?.employee;

  if (!employee) {
    navigation.goBack();
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleCall = () => {
    if (employee.phone) {
      Linking.openURL(`tel:${employee.phone}`);
    }
  };

  const handleToggleStatus = () => {
    const newStatus = employee.isActive !== false ? false : true;
    Alert.alert(
      newStatus ? 'Réactiver l\'employé' : 'Désactiver l\'employé',
      `Voulez-vous ${newStatus ? 'réactiver' : 'désactiver'} ${employee.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const result = await toggleEmployeeStatus(storeId, employee.id, newStatus);
            if (!result.success) {
              Alert.alert('Erreur', result.error);
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
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
            if (result.success) {
              navigation.goBack();
            } else {
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

  const startDate = employee.startDate
    ? moment(typeof employee.startDate === 'string' ? employee.startDate : employee.startDate)
    : null;

  const monthsWorked = startDate ? moment().diff(startDate, 'months') : 0;
  const isActive = employee.isActive !== false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Détail employé"
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('AddEmployee', { employee })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Employee header */}
        <View style={styles.employeeHeader}>
          <View style={[styles.avatar, { opacity: isActive ? 1 : 0.5 }]}>
            <Text style={styles.avatarText}>{getInitials(employee.name)}</Text>
          </View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{employee.role || 'Employé'}</Text>
          </View>

          {!isActive && (
            <View style={styles.inactiveBanner}>
              <Ionicons name="pause-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.inactiveText}>Employé inactif</Text>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            {employee.phone && (
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: `${colors.success}15` }]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={22} color={colors.success} />
                <Text style={[styles.quickActionLabel, { color: colors.success }]}>Appeler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.quickAction,
                { backgroundColor: isActive ? `${colors.warning}15` : `${colors.success}15` },
              ]}
              onPress={handleToggleStatus}
            >
              <Ionicons
                name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={isActive ? colors.warning : colors.success}
              />
              <Text
                style={[
                  styles.quickActionLabel,
                  { color: isActive ? colors.warning : colors.success },
                ]}
              >
                {isActive ? 'Désactiver' : 'Réactiver'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {employee.phone && (
            <InfoRow icon="call-outline" label="Téléphone" value={employee.phone} />
          )}
          {employee.email && (
            <InfoRow icon="mail-outline" label="Email" value={employee.email} />
          )}
          {employee.address && (
            <InfoRow icon="location-outline" label="Adresse" value={employee.address} />
          )}
          {startDate && (
            <InfoRow
              icon="calendar-outline"
              label="Date d'embauche"
              value={startDate.format('D MMMM YYYY')}
            />
          )}
          <InfoRow
            icon="time-outline"
            label="Ancienneté"
            value={`${monthsWorked} mois`}
          />
        </Card>

        {/* Salary card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Rémunération</Text>
          <View style={styles.salaryRow}>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryAmount}>{formatCurrency(employee.salary || 0)}</Text>
              <Text style={styles.salaryLabel}>Salaire mensuel</Text>
            </View>
            <View style={styles.salaryDivider} />
            <View style={styles.salaryItem}>
              <Text style={styles.salaryAmount}>{formatCurrency((employee.salary || 0) * 12)}</Text>
              <Text style={styles.salaryLabel}>Coût annuel</Text>
            </View>
          </View>
        </Card>

        {/* Notes */}
        {employee.notes && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{employee.notes}</Text>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('AddEmployee', { employee })}
          >
            <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={infoRowStyles.container}>
    <Ionicons name={icon} size={18} color={colors.textSecondary} style={infoRowStyles.icon} />
    <View style={infoRowStyles.content}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={infoRowStyles.value}>{value}</Text>
    </View>
  </View>
);

const infoRowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
    width: 24,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  employeeHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.accent,
  },
  employeeName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inactiveText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  salaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  salaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  salaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
  notesText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  bottomPadding: {
    height: 24,
  },
});

export default EmployeeDetailScreen;
