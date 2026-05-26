import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useDelivery } from '../../../context/DeliveryContext';
import { useAuth } from '../../../context/AuthContext';
import {
  updateDeliveryStatus,
  assignDelivery,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
} from '../../../services/deliveryService';

moment.locale('fr');

const LivraisonDetailScreen = ({ route, navigation }) => {
  const { delivery } = route.params;
  const { userProfile } = useAuth();
  const { livreurs, storeId } = useDelivery();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const statusColor = getStatusColor(delivery.status);
  const statusLabel = getStatusLabel(delivery.status);
  const isActive = ['pending', 'assigned', 'in_progress'].includes(delivery.status);

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return moment(d).format('DD/MM/YYYY à HH:mm');
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la livraison',
      'Voulez-vous vraiment annuler cette livraison ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la livraison',
          style: 'destructive',
          onPress: async () => {
            if (!storeId) return;
            setLoading(true);
            const result = await updateDeliveryStatus(storeId, delivery.id, 'cancelled');
            setLoading(false);
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

  const handleAssign = async (livreur: any) => {
    if (!storeId) return;
    setShowAssignModal(false);
    setLoading(true);
    const result = await assignDelivery(storeId, delivery.id, livreur.id, livreur.name);
    setLoading(false);
    if (!result.success) Alert.alert('Erreur', result.error);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livraison</Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons name={getStatusIcon(delivery.status) as any} size={14} color={statusColor} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client info */}
        <Section title="Client">
          <InfoRow icon="person-outline" label="Nom" value={delivery.clientName} />
          <InfoRow icon="call-outline" label="Téléphone" value={delivery.clientPhone} />
          <InfoRow icon="location-outline" label="Adresse" value={delivery.clientAddress} />
        </Section>

        {/* Assigned livreur */}
        <Section title="Livreur assigné">
          {delivery.assignedToName ? (
            <View style={styles.livreurCard}>
              <View style={styles.livreurAvatar}>
                <Text style={styles.livreurAvatarText}>
                  {delivery.assignedToName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.livreurName}>{delivery.assignedToName}</Text>
              {isActive && (
                <TouchableOpacity
                  style={styles.reassignBtn}
                  onPress={() => setShowAssignModal(true)}
                >
                  <Text style={styles.reassignText}>Changer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.assignBtn}
              onPress={() => setShowAssignModal(true)}
              disabled={!isActive}
            >
              <Ionicons name="person-add-outline" size={18} color={colors.primary} />
              <Text style={styles.assignBtnText}>Assigner un livreur</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Products */}
        <Section title={`Articles (${delivery.products?.length || 0})`}>
          {delivery.products?.map((p, idx) => (
            <View key={idx} style={[styles.productRow, idx > 0 && styles.productBorder]}>
              <Ionicons name="cube-outline" size={14} color={colors.primary} />
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productQty}>x{p.quantity}</Text>
              <Text style={styles.productPrice}>
                {new Intl.NumberFormat('fr-FR').format(p.price * p.quantity)} FCFA
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>
              {new Intl.NumberFormat('fr-FR').format(delivery.totalAmount || 0)} FCFA
            </Text>
          </View>
        </Section>

        {/* Timeline */}
        <Section title="Historique">
          <TimeItem icon="add-circle-outline" color={colors.primary} label="Créée" date={formatDate(delivery.createdAt)} />
          {delivery.assignedAt && <TimeItem icon="person-outline" color={colors.info} label="Assignée" date={formatDate(delivery.assignedAt)} />}
          {delivery.startedAt && <TimeItem icon="bicycle-outline" color={colors.secondary} label="Démarrée" date={formatDate(delivery.startedAt)} />}
          {delivery.deliveredAt && <TimeItem icon="checkmark-circle-outline" color={colors.success} label="Livrée" date={formatDate(delivery.deliveredAt)} />}
          {delivery.failedAt && <TimeItem icon="alert-circle-outline" color={colors.error} label="Échouée" date={formatDate(delivery.failedAt)} />}
          {delivery.cancelledAt && <TimeItem icon="close-circle-outline" color={colors.textDisabled} label="Annulée" date={formatDate(delivery.cancelledAt)} />}
        </Section>

        {/* Notes */}
        {delivery.notes && (
          <Section title="Instructions">
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{delivery.notes}</Text>
            </View>
          </Section>
        )}

        {delivery.livreurNotes && (
          <Section title="Notes du livreur">
            <View style={[styles.notesBox, { backgroundColor: `${colors.accent}10` }]}>
              <Text style={styles.notesText}>{delivery.livreurNotes}</Text>
            </View>
          </Section>
        )}

        {/* Actions */}
        {isActive && (
          <Section title="Actions">
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={loading}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={styles.cancelBtnText}>Annuler la livraison</Text>
            </TouchableOpacity>
          </Section>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Assign livreur modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un livreur</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {livreurs.filter((l) => l.isActive !== false).length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Aucun livreur disponible</Text>
              </View>
            ) : (
              <FlatList
                data={livreurs.filter((l) => l.isActive !== false)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => handleAssign(item)}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemPhone}>{item.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={15} color={colors.textSecondary} style={{ width: 22 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const TimeItem = ({ icon, color, label, date }) => (
  <View style={styles.timeItem}>
    <View style={[styles.timeIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={14} color={color} />
    </View>
    <Text style={styles.timeLabel}>{label}</Text>
    <Text style={styles.timeDate}>{date}</Text>
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
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, gap: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { width: 80, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  livreurCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  livreurAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  livreurAvatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  livreurName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  reassignBtn: {
    backgroundColor: `${colors.primary}15`, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  reassignText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${colors.primary}10`, borderRadius: 10, padding: 12,
  },
  assignBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  productRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8,
  },
  productBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  productName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  productQty: { fontSize: 13, color: colors.textSecondary, width: 28 },
  productPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: colors.divider,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalAmount: { fontSize: 17, fontWeight: '800', color: colors.primary },
  timeItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10,
  },
  timeIcon: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  timeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  timeDate: { fontSize: 12, color: colors.textSecondary },
  notesBox: {
    backgroundColor: `${colors.info}10`, borderRadius: 10, padding: 12,
  },
  notesText: { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12, padding: 14, gap: 8,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 12,
  },
  modalAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  modalAvatarText: { fontSize: 16, fontWeight: '800', color: colors.accent },
  modalItemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  modalItemPhone: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: colors.textSecondary },
});

export default LivraisonDetailScreen;
