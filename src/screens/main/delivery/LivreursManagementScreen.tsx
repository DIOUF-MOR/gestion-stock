import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useDelivery } from '../../../context/DeliveryContext';
import { useStore } from '../../../context/StoreContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase.config';
import { resetLivreurPassword } from '../../../services/authService';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const LivreursManagementScreen = ({ navigation }) => {
  const { livreurs, deliveries, loading } = useDelivery();
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return livreurs;
    const q = search.toLowerCase();
    return livreurs.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
    );
  }, [livreurs, search]);

  // Edit modal
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const openEditModal = (livreur: any) => {
    setEditTarget(livreur);
    setEditName(livreur.name || '');
    setEditPhone(livreur.phone || '');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return Alert.alert('Erreur', 'Le nom est requis.');
    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'users', editTarget.id), {
        name: editName.trim(),
        phone: editPhone.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditTarget(null);
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le livreur.');
    }
    setEditLoading(false);
  };

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const openResetModal = (livreur: any) => {
    setResetTarget(livreur);
    setNewPwd(''); setConfirmPwd('');
    setShowNew(false);
  };

  const closeResetModal = () => setResetTarget(null);

  const handleResetPassword = async () => {
    if (newPwd.length < 6) return Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
    if (newPwd !== confirmPwd) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');

    setResetLoading(true);
    const result = await resetLivreurPassword(resetTarget.id, resetTarget.phone, newPwd);
    setResetLoading(false);

    if (result.success) {
      closeResetModal();
      Alert.alert('Succès', `Le mot de passe de ${resetTarget.name} a été réinitialisé.`);
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  const getInitials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'L';

  const avatarColors = [colors.primary, colors.secondary, colors.accent, colors.success, colors.warning];
  const getAvatarColor = (index: number) => avatarColors[index % avatarColors.length];

  const getLivreurStats = (livreurId: string) => {
    const lDeliveries = deliveries.filter((d) => d.assignedTo === livreurId);
    const delivered = lDeliveries.filter((d) => d.status === 'delivered').length;
    const active = lDeliveries.filter((d) => ['pending', 'assigned', 'in_progress'].includes(d.status)).length;
    return { total: lDeliveries.length, delivered, active };
  };

  const handleToggleStatus = async (livreur: any) => {
    const newStatus = livreur.isActive === false ? true : false;
    const label = newStatus ? 'activer' : 'désactiver';

    Alert.alert(
      `${newStatus ? 'Activer' : 'Désactiver'} le livreur`,
      `Voulez-vous ${label} "${livreur.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading(livreur.id);
            try {
              await updateDoc(doc(db, 'users', livreur.id), { isActive: newStatus });
            } catch (e) {
              Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
            }
            setActionLoading(null);
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const renderItem = ({ item, index }) => {
    const stats = getLivreurStats(item.id);
    const isActive = item.isActive !== false;
    const avatarColor = getAvatarColor(index);

    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: `${avatarColor}20` }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>
            {getInitials(item.name)}
          </Text>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactif</Text>
              </View>
            )}
          </View>
          <Text style={styles.phone}>{item.phone}</Text>

          {/* Mini stats */}
          <View style={styles.statsRow}>
            <MiniStat icon="bicycle-outline" value={stats.active} label="actives" color={colors.accent} />
            <MiniStat icon="checkmark-circle-outline" value={stats.delivered} label="livrées" color={colors.success} />
            <MiniStat icon="layers-outline" value={stats.total} label="total" color={colors.primary} />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.accent}15` }]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => openResetModal(item)}
          >
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isActive ? `${colors.error}15` : `${colors.success}15` }]}
            onPress={() => handleToggleStatus(item)}
            disabled={actionLoading === item.id}
          >
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={22}
              color={isActive ? colors.error : colors.success}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Mes Livreurs</Text>
          <Text style={styles.headerSubtitle}>{livreurs.length} livreur(s)</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddLivreur')}
        >
          <Ionicons name="person-add" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un livreur..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="bicycle-outline"
            title={search ? 'Aucun résultat' : 'Aucun livreur'}
            message={
              search
                ? `Aucun livreur ne correspond à "${search}".`
                : 'Ajoutez votre premier livreur pour commencer à gérer les livraisons.'
            }
            actionLabel={search ? undefined : 'Ajouter un livreur'}
            onAction={search ? undefined : () => navigation.navigate('AddLivreur')}
          />
        }
      />

      {/* Edit livreur modal */}
      <Modal visible={!!editTarget} transparent animationType="slide" onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Modifier le livreur</Text>
                <Text style={styles.modalSub}>{editTarget?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditTarget(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.pwdLabel}>Nom complet</Text>
            <View style={styles.pwdRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.pwdInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nom du livreur"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.pwdLabel}>Numéro de téléphone</Text>
            <View style={styles.pwdRow}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.pwdInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Numéro de téléphone"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={14} color={colors.info} />
              <Text style={styles.infoText}>
                Modifier le téléphone ici ne change pas les identifiants de connexion du livreur.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.confirmBtn, editLoading && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={editLoading}
            >
              <Ionicons name="checkmark" size={18} color={colors.textInverse} />
              <Text style={styles.confirmBtnText}>
                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reset password modal */}
      <Modal visible={!!resetTarget} transparent animationType="slide" onRequestClose={closeResetModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeResetModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Réinitialiser le mot de passe</Text>
                <Text style={styles.modalSub}>{resetTarget?.name} · {resetTarget?.phone}</Text>
              </View>
              <TouchableOpacity onPress={closeResetModal}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
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
              style={[styles.confirmBtn, resetLoading && { opacity: 0.6 }]}
              onPress={handleResetPassword}
              disabled={resetLoading}
            >
              <Ionicons name="key" size={18} color={colors.textInverse} />
              <Text style={styles.confirmBtnText}>
                {resetLoading ? 'Réinitialisation...' : 'Confirmer la réinitialisation'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const MiniStat = ({ icon, value, label, color }) => (
  <View style={styles.miniStat}>
    <Ionicons name={icon} size={12} color={color} />
    <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
    <Text style={styles.miniStatLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary },
  addBtn: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  inactiveBadge: {
    backgroundColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inactiveBadgeText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  phone: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 10 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatValue: { fontSize: 12, fontWeight: '700' },
  miniStatLabel: { fontSize: 11, color: colors.textSecondary },
  actions: { gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}15`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
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
    marginBottom: 14,
  },
  pwdInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: colors.textInverse },
});

export default LivreursManagementScreen;
