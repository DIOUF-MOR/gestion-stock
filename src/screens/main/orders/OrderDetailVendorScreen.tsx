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
import { useOrder } from '../../../context/OrderContext';
import { useStore } from '../../../context/StoreContext';
import {
  ORDER_STATUS_CONFIG,
  OrderStatus,
  updateOrderStatus,
  cancelOrder,
  assignOrderLivreur,
} from '../../../services/orderService';

moment.locale('fr');

// Next statuses a vendor can transition to from a given status
const NEXT_ACTIONS: Record<OrderStatus, { status: OrderStatus; label: string; icon: string; color: string }[]> = {
  pending: [
    { status: 'confirmed', label: 'Confirmer', icon: 'checkmark-circle-outline', color: colors.primary },
  ],
  confirmed: [
    { status: 'preparing', label: 'Mettre en préparation', icon: 'construct-outline', color: '#9B59B6' },
  ],
  preparing: [
    { status: 'ready', label: 'Marquer comme prête', icon: 'bag-check-outline', color: colors.success },
  ],
  ready: [
    { status: 'in_delivery', label: 'Envoyer en livraison', icon: 'bicycle-outline', color: '#F18F01' },
  ],
  in_delivery: [
    { status: 'delivered', label: 'Marquer comme livrée', icon: 'checkmark-done-circle-outline', color: colors.success },
  ],
  delivered: [],
  cancelled: [],
};

const OrderDetailVendorScreen = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const { orders, storeId } = useOrder();
  const { employees } = useStore();
  const [loading, setLoading] = useState(false);
  const [showLivreurModal, setShowLivreurModal] = useState(false);

  // Get live order from context
  const order = orders.find((o) => o.id === initialOrder.id) || initialOrder;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';
  const config = ORDER_STATUS_CONFIG[order.status];

  const formatDate = (ts: any) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return moment(d).format('DD/MM/YYYY à HH:mm');
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!storeId) return;
    if (newStatus === 'in_delivery') {
      // Show livreur picker first
      setShowLivreurModal(true);
      return;
    }
    const label = ORDER_STATUS_CONFIG[newStatus]?.label || newStatus;
    Alert.alert(
      'Changer le statut',
      `Confirmer : ${label} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLoading(true);
            const result = await updateOrderStatus(storeId, order.id, newStatus);
            setLoading(false);
            if (!result.success) Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  const handleAssignLivreur = async (livreur: any) => {
    if (!storeId) return;
    setShowLivreurModal(false);
    setLoading(true);
    const result = await assignOrderLivreur(storeId, order.id, livreur.id, livreur.name);
    setLoading(false);
    if (!result.success) Alert.alert('Erreur', result.error);
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: async () => {
            if (!storeId) return;
            setLoading(true);
            const result = await cancelOrder(storeId, order.id, 'Annulée par le vendeur');
            setLoading(false);
            if (!result.success) Alert.alert('Erreur', result.error);
            else navigation.goBack();
          },
        },
      ]
    );
  };

  const nextActions = NEXT_ACTIONS[order.status] || [];
  const isFinal = order.status === 'delivered' || order.status === 'cancelled';

  // Livreurs: only employees with role livreur, or pick from employees list
  // For now we show all employees as potential assignees
  const availableLivreurs = employees.filter((e: any) => e.role === 'livreur' || !e.role);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status hero */}
        <View style={[styles.statusHero, { backgroundColor: `${config?.color}15` }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: `${config?.color}25` }]}>
            <Ionicons name={config?.icon as any} size={36} color={config?.color} />
          </View>
          <Text style={[styles.statusLabel, { color: config?.color }]}>{config?.label}</Text>
          <Text style={styles.clientName}>{order.clientName}</Text>
          <Text style={styles.orderDate}>
            Commandée {order.createdAt?.toDate
              ? moment(order.createdAt.toDate()).fromNow()
              : ''}
          </Text>
        </View>

        {/* Action buttons */}
        {!isFinal && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsRow}>
              {nextActions.map((action) => (
                <TouchableOpacity
                  key={action.status}
                  style={[styles.actionBtn, { backgroundColor: `${action.color}15`, borderColor: action.color }]}
                  onPress={() => handleStatusChange(action.status)}
                  disabled={loading}
                >
                  <Ionicons name={action.icon as any} size={18} color={action.color} />
                  <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${colors.error}10`, borderColor: colors.error }]}
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.actionBtnText, { color: colors.error }]}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Livreur info */}
        {order.assignedToName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Livreur assigné</Text>
            <View style={[styles.card, styles.livreurCard]}>
              <View style={styles.livreurAvatar}>
                <Text style={styles.livreurAvatarText}>
                  {order.assignedToName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.livreurName}>{order.assignedToName}</Text>
                <Text style={styles.livreurLabel}>En livraison</Text>
              </View>
              <Ionicons name="bicycle" size={22} color={colors.accent} style={{ marginLeft: 'auto' }} />
            </View>
          </View>
        )}

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom" value={order.clientName} />
            <InfoRow icon="call-outline" label="Tél." value={order.clientPhone} />
            {order.clientAddress && (
              <InfoRow icon="location-outline" label="Adresse" value={order.clientAddress} />
            )}
            {order.notes && (
              <InfoRow icon="document-text-outline" label="Notes" value={order.notes} />
            )}
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({order.items?.length || 0})</Text>
          <View style={styles.card}>
            {order.items?.map((item: any, idx: number) => (
              <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                <Ionicons name="cube-outline" size={13} color={colors.secondary} />
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>{fmt(item.subtotal)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{fmt(order.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique</Text>
          <View style={styles.card}>
            {order.createdAt && (
              <TimeRow icon="receipt-outline" label="Commandée" value={formatDate(order.createdAt)} />
            )}
            {order.confirmedAt && (
              <TimeRow icon="checkmark-circle-outline" label="Confirmée" value={formatDate(order.confirmedAt)} />
            )}
            {order.preparingAt && (
              <TimeRow icon="construct-outline" label="En préparation" value={formatDate(order.preparingAt)} />
            )}
            {order.readyAt && (
              <TimeRow icon="bag-check-outline" label="Prête" value={formatDate(order.readyAt)} />
            )}
            {order.inDeliveryAt && (
              <TimeRow icon="bicycle-outline" label="En livraison" value={formatDate(order.inDeliveryAt)} />
            )}
            {order.deliveredAt && (
              <TimeRow icon="checkmark-done-circle-outline" label="Livrée" value={formatDate(order.deliveredAt)} />
            )}
            {order.cancelledAt && (
              <TimeRow icon="close-circle-outline" label="Annulée" value={formatDate(order.cancelledAt)} color={colors.error} />
            )}
          </View>
        </View>

        {order.cancelReason && (
          <View style={styles.cancelledBox}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={styles.cancelledReason}>{order.cancelReason}</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Livreur picker modal */}
      <Modal
        visible={showLivreurModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLivreurModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un livreur</Text>
              <TouchableOpacity onPress={() => setShowLivreurModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {availableLivreurs.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="person-outline" size={40} color={colors.textDisabled} />
                <Text style={styles.modalEmptyText}>Aucun livreur disponible</Text>
                <Text style={styles.modalEmptySubText}>
                  Ajoutez des livreurs depuis l'onglet Livraisons.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableLivreurs}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <TouchableOpacity
                    style={styles.livreurRow}
                    onPress={() => handleAssignLivreur(item)}
                  >
                    <View style={styles.livreurAvatarSm}>
                      <Text style={styles.livreurAvatarSmText}>
                        {item.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.livreurRowName}>{item.name}</Text>
                      {item.phone && (
                        <Text style={styles.livreurRowPhone}>{item.phone}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} style={{ width: 20 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const TimeRow = ({ icon, label, value, color = colors.textSecondary }) => (
  <View style={styles.timeRow}>
    <Ionicons name={icon} size={14} color={color} style={{ width: 20 }} />
    <Text style={[styles.timeLabel, { color }]}>{label}</Text>
    <Text style={styles.timeValue}>{value || '—'}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  content: { padding: 16 },
  statusHero: {
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
  },
  statusIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statusLabel: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  orderDate: { fontSize: 12, color: colors.textDisabled },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  actionsRow: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  livreurCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  livreurAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  livreurAvatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  livreurName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  livreurLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8,
  },
  infoLabel: { width: 60, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  itemQty: { fontSize: 12, color: colors.textSecondary, width: 26 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: colors.secondary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: colors.divider,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalAmount: { fontSize: 16, fontWeight: '800', color: colors.secondary },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8,
  },
  timeLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  timeValue: { fontSize: 12, color: colors.textSecondary },
  cancelledBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.errorBackground, borderRadius: 12, padding: 14, marginBottom: 20,
  },
  cancelledReason: { flex: 1, fontSize: 13, color: colors.error },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalEmpty: { alignItems: 'center', padding: 40, gap: 12 },
  modalEmptyText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  modalEmptySubText: { fontSize: 13, color: colors.textDisabled, textAlign: 'center' },
  livreurRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 12,
  },
  livreurAvatarSm: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.secondary}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  livreurAvatarSmText: { fontSize: 16, fontWeight: '800', color: colors.secondary },
  livreurRowName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  livreurRowPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});

export default OrderDetailVendorScreen;
