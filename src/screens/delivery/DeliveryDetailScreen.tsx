import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import {
  updateDeliveryStatus,
  updateDelivery,
  getStatusLabel,
  getStatusColor,
  getStatusIcon,
  DeliveryStatus,
} from '../../services/deliveryService';

moment.locale('fr');

const STATUS_FLOW: { status: DeliveryStatus; label: string; icon: string; color: string }[] = [
  { status: 'in_progress', label: 'Démarrer la livraison', icon: 'bicycle', color: colors.secondary },
  { status: 'delivered', label: 'Marquer comme livrée', icon: 'checkmark-circle', color: colors.success },
  { status: 'failed', label: 'Signaler un problème', icon: 'alert-circle', color: colors.error },
];

const DeliveryDetailScreen = ({ route, navigation }) => {
  const { delivery } = route.params;
  const { userProfile, isLivreur } = useAuth();
  const [notes, setNotes] = useState(delivery.livreurNotes || '');
  const [loading, setLoading] = useState(false);

  const storeId = userProfile?.storeId;
  const isDeliveryLivreur = isLivreur();
  const isEditable = ['pending', 'assigned', 'in_progress'].includes(delivery.status);
  const statusColor = getStatusColor(delivery.status);
  const statusLabel = getStatusLabel(delivery.status);

  const handleCall = () => {
    if (delivery.clientPhone) {
      Linking.openURL(`tel:${delivery.clientPhone}`);
    }
  };

  const handleStatusUpdate = async (newStatus: DeliveryStatus) => {
    const confirmMessages: Record<string, string> = {
      in_progress: 'Confirmer le démarrage de cette livraison ?',
      delivered: 'Confirmer que la livraison a été effectuée avec succès ?',
      failed: 'Signaler que cette livraison a échoué ?',
    };

    Alert.alert(
      'Confirmation',
      confirmMessages[newStatus],
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: newStatus === 'failed' ? 'destructive' : 'default',
          onPress: async () => {
            setLoading(true);
            // Save notes first
            if (notes !== delivery.livreurNotes) {
              await updateDelivery(storeId, delivery.id, { livreurNotes: notes });
            }
            const result = await updateDeliveryStatus(storeId, delivery.id, newStatus);
            setLoading(false);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Erreur', result.error || 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  const handleSaveNotes = async () => {
    if (!storeId) return;
    setLoading(true);
    const result = await updateDelivery(storeId, delivery.id, { livreurNotes: notes });
    setLoading(false);
    if (!result.success) {
      Alert.alert('Erreur', result.error);
    } else {
      Alert.alert('Succès', 'Notes enregistrées');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return moment(d).format('DD/MM/YYYY HH:mm');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail livraison</Text>
        <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons name={getStatusIcon(delivery.status) as any} size={14} color={statusColor} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom" value={delivery.clientName} />
            <InfoRow icon="call-outline" label="Téléphone" value={delivery.clientPhone} />
            <InfoRow icon="location-outline" label="Adresse" value={delivery.clientAddress} />
          </View>

          {/* Call button */}
          {delivery.clientPhone ? (
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <Ionicons name="call" size={18} color={colors.textInverse} />
              <Text style={styles.callBtnText}>Appeler le client</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({delivery.products?.length || 0})</Text>
          <View style={styles.card}>
            {delivery.products?.map((p, idx) => (
              <View key={idx} style={[styles.productRow, idx > 0 && styles.productRowBorder]}>
                <Ionicons name="cube-outline" size={16} color={colors.primary} />
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
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.card}>
            <TimelineItem
              icon="add-circle-outline"
              color={colors.primary}
              label="Créée"
              date={formatDate(delivery.createdAt)}
            />
            {delivery.assignedAt && (
              <TimelineItem
                icon="person-outline"
                color={colors.info}
                label="Assignée"
                date={formatDate(delivery.assignedAt)}
              />
            )}
            {delivery.startedAt && (
              <TimelineItem
                icon="bicycle-outline"
                color={colors.secondary}
                label="Démarrée"
                date={formatDate(delivery.startedAt)}
              />
            )}
            {delivery.deliveredAt && (
              <TimelineItem
                icon="checkmark-circle-outline"
                color={colors.success}
                label="Livrée"
                date={formatDate(delivery.deliveredAt)}
              />
            )}
            {delivery.failedAt && (
              <TimelineItem
                icon="alert-circle-outline"
                color={colors.error}
                label="Échouée"
                date={formatDate(delivery.failedAt)}
              />
            )}
            {delivery.cancelledAt && (
              <TimelineItem
                icon="close-circle-outline"
                color={colors.textDisabled}
                label="Annulée"
                date={formatDate(delivery.cancelledAt)}
              />
            )}
          </View>
        </View>

        {/* Vendor notes */}
        {delivery.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions du gérant</Text>
            <View style={[styles.card, styles.notesCard]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <Text style={styles.notesText}>{delivery.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Livreur notes */}
        {isDeliveryLivreur && isEditable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={4}
              placeholder="Ajouter une note (difficultés, instructions particulières...)"
              placeholderTextColor={colors.textDisabled}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
            {notes !== delivery.livreurNotes && (
              <TouchableOpacity style={styles.saveNotesBtn} onPress={handleSaveNotes}>
                <Ionicons name="save-outline" size={16} color={colors.textInverse} />
                <Text style={styles.saveNotesBtnText}>Enregistrer les notes</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {delivery.livreurNotes && !isEditable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes du livreur</Text>
            <View style={[styles.card, styles.notesCard]}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.notesText}>{delivery.livreurNotes}</Text>
            </View>
          </View>
        )}

        {/* Action buttons (livreur only, editable deliveries) */}
        {isDeliveryLivreur && isEditable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            {STATUS_FLOW.filter((s) => {
              if (delivery.status === 'pending' || delivery.status === 'assigned') {
                return s.status === 'in_progress';
              }
              if (delivery.status === 'in_progress') {
                return s.status === 'delivered' || s.status === 'failed';
              }
              return false;
            }).map((action) => (
              <TouchableOpacity
                key={action.status}
                style={[styles.actionBtn, { backgroundColor: action.color }]}
                onPress={() => handleStatusUpdate(action.status)}
                disabled={loading}
              >
                <Ionicons name={action.icon as any} size={20} color={colors.textInverse} />
                <Text style={styles.actionBtnText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const TimelineItem = ({ icon, color, label, date }) => (
  <View style={styles.timelineItem}>
    <View style={[styles.timelineIcon, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View style={styles.timelineContent}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineDate}>{date}</Text>
    </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoIcon: { width: 24, marginRight: 10, marginTop: 1 },
  infoLabel: { width: 80, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    gap: 8,
  },
  callBtnText: { fontSize: 15, fontWeight: '700', color: colors.textInverse },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  productRowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  productName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  productQty: { fontSize: 13, color: colors.textSecondary, width: 30 },
  productPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalAmount: { fontSize: 17, fontWeight: '800', color: colors.primary },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  timelineDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: `${colors.info}10`,
  },
  notesText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 20 },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
  },
  saveNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  saveNotesBtnText: { fontSize: 14, fontWeight: '600', color: colors.textInverse },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: colors.textInverse },
});

export default DeliveryDetailScreen;
