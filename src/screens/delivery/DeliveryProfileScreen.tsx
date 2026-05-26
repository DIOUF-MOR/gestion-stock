import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useDelivery } from '../../context/DeliveryContext';
import { logoutUser, changePassword } from '../../services/authService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DeliveryProfileScreen = () => {
  const { userProfile } = useAuth();
  const { stats, deliveries } = useDelivery();
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Change password modal
  const [pwdModal, setPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  const openPwdModal = () => {
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowCurrent(false); setShowNew(false);
    setPwdModal(true);
  };

  const handleChangePassword = async () => {
    if (!currentPwd) return Alert.alert('Erreur', 'Entrez votre mot de passe actuel.');
    if (newPwd.length < 6) return Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
    if (newPwd !== confirmPwd) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
    setPwdLoading(true);
    const result = await changePassword(currentPwd, newPwd);
    setPwdLoading(false);
    if (result.success) {
      setPwdModal(false);
      Alert.alert('Succès', 'Mot de passe modifié avec succès.');
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setLogoutLoading(true);
            await logoutUser();
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'L';
  };

  if (logoutLoading) return <LoadingSpinner fullScreen message="Déconnexion..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.name || '')}</Text>
          </View>
          <Text style={styles.name}>{userProfile?.name}</Text>
          <View style={styles.rolePill}>
            <Ionicons name="bicycle" size={14} color={colors.accent} />
            <Text style={styles.roleText}>Livreur</Text>
          </View>
          <Text style={styles.phone}>{userProfile?.phone}</Text>
        </View>

        {/* Performance stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma performance</Text>
          <View style={styles.statsGrid}>
            <StatCard
              value={stats.total}
              label="Total"
              icon="layers-outline"
              color={colors.primary}
            />
            <StatCard
              value={stats.delivered}
              label="Livrées"
              icon="checkmark-circle-outline"
              color={colors.success}
            />
            <StatCard
              value={`${stats.successRate}%`}
              label="Taux réussite"
              icon="trending-up-outline"
              color={colors.accent}
            />
            <StatCard
              value={stats.failed}
              label="Échouées"
              icon="close-circle-outline"
              color={colors.error}
            />
          </View>
        </View>

        {/* Activity breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Répartition</Text>
          <View style={styles.card}>
            <BreakdownRow
              label="En attente / Assignées"
              count={stats.pending}
              total={stats.total}
              color={colors.warning}
            />
            <BreakdownRow
              label="En cours"
              count={stats.inProgress}
              total={stats.total}
              color={colors.secondary}
            />
            <BreakdownRow
              label="Livrées avec succès"
              count={stats.delivered}
              total={stats.total}
              color={colors.success}
            />
            <BreakdownRow
              label="Annulées"
              count={stats.cancelled}
              total={stats.total}
              color={colors.textDisabled}
            />
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom" value={userProfile?.name} />
            <InfoRow icon="call-outline" label="Téléphone" value={userProfile?.phone} />
            <InfoRow icon="storefront-outline" label="Boutique" value={userProfile?.storeId ? 'Affectée' : 'Non affectée'} />
          </View>
        </View>

        {/* Change password + Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.changePwdBtn} onPress={openPwdModal}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <Text style={styles.changePwdText}>Changer mon mot de passe</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Change password modal */}
      <Modal visible={pwdModal} transparent animationType="slide" onRequestClose={() => setPwdModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPwdModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setPwdModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pwdLabel}>Mot de passe actuel</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Votre mot de passe actuel"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pwdLabel}>Nouveau mot de passe</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Minimum 6 caractères"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pwdLabel}>Confirmer le nouveau mot de passe</Text>
            <View style={styles.pwdRow}>
              <TextInput
                style={styles.pwdInput}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Répéter le nouveau mot de passe"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry={!showNew}
              />
              {confirmPwd.length > 0 && (
                <Ionicons
                  name={newPwd === confirmPwd ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={newPwd === confirmPwd ? colors.success : colors.error}
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.pwdConfirmBtn, pwdLoading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={pwdLoading}
            >
              <Text style={styles.pwdConfirmText}>
                {pwdLoading ? 'Modification...' : 'Modifier le mot de passe'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const StatCard = ({ value, label, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const BreakdownRow = ({ label, count, total, color }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: color }]} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownCount}>{count}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={16} color={colors.textSecondary} style={{ width: 24 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: colors.textInverse },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8,
  },
  roleText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  phone: { fontSize: 14, color: colors.textSecondary },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { flex: 1, fontSize: 13, color: colors.textPrimary },
  breakdownCount: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, width: 24 },
  barContainer: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  infoLabel: { width: 90, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  changePwdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 12,
  },
  changePwdText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.error,
    gap: 10,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.error },
  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  pwdLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  pwdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  pwdInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  pwdConfirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  pwdConfirmText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
});

export default DeliveryProfileScreen;
