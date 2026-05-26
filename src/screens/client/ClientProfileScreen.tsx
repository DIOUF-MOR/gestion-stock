import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import { logoutUser } from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ClientProfileScreen = () => {
  const { userProfile } = useAuth();
  const { stats } = useOrder();
  const [loading, setLoading] = useState(false);

  const getInitials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'C';

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          await logoutUser();
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner fullScreen message="Déconnexion..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.name || '')}</Text>
          </View>
          <Text style={styles.name}>{userProfile?.name}</Text>
          <View style={styles.rolePill}>
            <Ionicons name="person" size={13} color={colors.secondary} />
            <Text style={styles.roleText}>Client</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes achats</Text>
          <View style={styles.statsGrid}>
            <StatCard value={stats.total} label="Commandes" icon="receipt-outline" color={colors.primary} />
            <StatCard value={stats.active} label="En cours" icon="bicycle-outline" color={colors.warning} />
            <StatCard value={stats.delivered} label="Livrées" icon="checkmark-circle-outline" color={colors.success} />
            <StatCard value={stats.cancelled} label="Annulées" icon="close-circle-outline" color={colors.error} />
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes informations</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom" value={userProfile?.name} />
            <InfoRow icon="call-outline" label="Téléphone" value={userProfile?.phone} />
            {userProfile?.address && (
              <InfoRow icon="location-outline" label="Adresse" value={userProfile.address} />
            )}
          </View>
        </View>

        {/* Store code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boutique</Text>
          <View style={[styles.card, styles.storeCard]}>
            <Ionicons name="storefront" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>Boutique associée</Text>
              <Text style={styles.storeCode} numberOfLines={1}>{userProfile?.storeId}</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({ value, label, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={15} color={colors.textSecondary} style={{ width: 22 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  hero: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16,
    backgroundColor: colors.surface, marginBottom: 16,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.textInverse },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${colors.secondary}15`, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  roleText: { fontSize: 13, fontWeight: '700', color: colors.secondary },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 10,
  },
  infoLabel: { width: 80, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  storeCode: { fontSize: 12, color: colors.textDisabled, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: colors.error, gap: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
});

export default ClientProfileScreen;
