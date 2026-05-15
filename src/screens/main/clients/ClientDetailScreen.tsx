import React, { useState, useEffect } from 'react';
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
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { deleteClient } from '../../../services/clientService';
import { getClientDebts } from '../../../services/clientService';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import EmptyState from '../../../components/common/EmptyState';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const ClientDetailScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const client = route.params?.client;
  const [debts, setDebts] = useState([]);
  const [loadingDebts, setLoadingDebts] = useState(true);

  useEffect(() => {
    if (client) {
      loadDebts();
    }
  }, [client]);

  const loadDebts = async () => {
    setLoadingDebts(true);
    const result = await getClientDebts(storeId, client.id);
    if (result.success) {
      setDebts(result.debts);
    }
    setLoadingDebts(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(amount || 0) + ' FCFA';
  };

  const handleCall = () => {
    if (client.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleEmail = () => {
    if (client.email) {
      Linking.openURL(`mailto:${client.email}`);
    }
  };

  const handleDelete = () => {
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

  if (!client) return null;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const unpaidDebts = debts.filter(d => !d.isPaid);
  const paidDebts = debts.filter(d => d.isPaid);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Détail client"
        onBack={() => navigation.goBack()}
        rightIcon="create-outline"
        onRightPress={() => navigation.navigate('AddClient', { client })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Client header */}
        <View style={styles.clientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(client.name)}</Text>
          </View>
          <Text style={styles.clientName}>{client.name}</Text>

          {client.totalDebt > 0 && (
            <View style={styles.debtChip}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.debtChipText}>Doit {formatCurrency(client.totalDebt)}</Text>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            {client.phone && (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: `${colors.success}15` }]} onPress={handleCall}>
                <Ionicons name="call" size={22} color={colors.success} />
                <Text style={[styles.quickActionLabel, { color: colors.success }]}>Appeler</Text>
              </TouchableOpacity>
            )}
            {client.email && (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: `${colors.primary}15` }]} onPress={handleEmail}>
                <Ionicons name="mail" size={22} color={colors.primary} />
                <Text style={[styles.quickActionLabel, { color: colors.primary }]}>Email</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: `${colors.warning}15` }]}
              onPress={() => navigation.navigate('Finance', {
                screen: 'AddDebt',
                params: { clientId: client.id, clientName: client.name },
              })}
            >
              <Ionicons name="add-circle" size={22} color={colors.warning} />
              <Text style={[styles.quickActionLabel, { color: colors.warning }]}>Dette</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact info */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {client.phone && (
            <InfoRow icon="call-outline" label="Téléphone" value={client.phone} />
          )}
          {client.email && (
            <InfoRow icon="mail-outline" label="Email" value={client.email} />
          )}
          {client.address && (
            <InfoRow icon="location-outline" label="Adresse" value={client.address} />
          )}
          {client.notes && (
            <InfoRow icon="document-text-outline" label="Notes" value={client.notes} />
          )}
        </Card>

        {/* Unpaid debts */}
        <View style={styles.debtsHeader}>
          <Text style={styles.sectionTitle}>
            Dettes impayées ({unpaidDebts.length})
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Finance', {
              screen: 'AddDebt',
              params: { clientId: client.id, clientName: client.name },
            })}
          >
            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {unpaidDebts.length === 0 ? (
          <Card style={styles.card}>
            <Text style={styles.noDebtsText}>Aucune dette impayée</Text>
          </Card>
        ) : (
          unpaidDebts.map((debt) => (
            <Card key={debt.id} style={styles.debtCard}>
              <View style={styles.debtContent}>
                <View style={[styles.debtIcon, { backgroundColor: `${colors.error}15` }]}>
                  <Ionicons name="receipt-outline" size={20} color={colors.error} />
                </View>
                <View style={styles.debtInfo}>
                  <Text style={styles.debtDescription} numberOfLines={1}>
                    {debt.description || 'Crédit'}
                  </Text>
                  <Text style={styles.debtDate}>
                    {moment(debt.createdAt?.toDate?.() || debt.createdAt).format('D MMM YYYY')}
                  </Text>
                  {debt.dueDate && (
                    <Text style={styles.debtDueDate}>
                      Échéance: {moment(debt.dueDate?.toDate?.() || debt.dueDate).format('D MMM YYYY')}
                    </Text>
                  )}
                </View>
                <Text style={styles.debtAmount}>{formatCurrency(debt.amount)}</Text>
              </View>
            </Card>
          ))
        )}

        {/* Paid debts */}
        {paidDebts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              Dettes payées ({paidDebts.length})
            </Text>
            {paidDebts.slice(0, 3).map((debt) => (
              <Card key={debt.id} style={styles.debtCard}>
                <View style={styles.debtContent}>
                  <View style={[styles.debtIcon, { backgroundColor: `${colors.success}15` }]}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                  </View>
                  <View style={styles.debtInfo}>
                    <Text style={styles.debtDescription} numberOfLines={1}>
                      {debt.description || 'Crédit'}
                    </Text>
                    <Text style={[styles.debtDate, { color: colors.success }]}>Payé</Text>
                  </View>
                  <Text style={[styles.debtAmount, { color: colors.success }]}>
                    {formatCurrency(debt.amount)}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.deleteButtonText}>Supprimer ce client</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={infoRowStyles.container}>
    <View style={infoRowStyles.iconContainer}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
    </View>
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
  iconContainer: {
    width: 32,
    marginRight: 12,
    paddingTop: 2,
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
  clientHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${colors.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.secondary,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  debtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
  },
  debtChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    alignItems: 'center',
    paddingHorizontal: 16,
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
  debtsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  noDebtsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  debtCard: {
    marginBottom: 10,
  },
  debtContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  debtDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  debtDueDate: {
    fontSize: 11,
    color: colors.warning,
    marginTop: 2,
  },
  debtAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },
  bottomPadding: {
    height: 24,
  },
});

export default ClientDetailScreen;
