import React, { useEffect, useState } from 'react';
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
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useOrder } from '../../context/OrderContext';
import {
  ORDER_STATUS_CONFIG,
  OrderStatus,
  cancelOrder,
} from '../../services/orderService';

moment.locale('fr');

const TIMELINE_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'pending', label: 'Commande reçue', icon: 'receipt-outline' },
  { status: 'confirmed', label: 'Confirmée', icon: 'checkmark-circle-outline' },
  { status: 'preparing', label: 'En préparation', icon: 'construct-outline' },
  { status: 'ready', label: 'Prête', icon: 'bag-check-outline' },
  { status: 'in_delivery', label: 'En livraison', icon: 'bicycle-outline' },
  { status: 'delivered', label: 'Livrée', icon: 'checkmark-done-circle-outline' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  in_delivery: 4,
  delivered: 5,
  cancelled: -1,
};

const OrderTrackingScreen = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const { userProfile } = useAuth();
  const { orders } = useOrder();
  const [cancelling, setCancelling] = useState(false);

  // Get live order from context
  const order = orders.find((o) => o.id === initialOrder.id) || initialOrder;
  const storeId = userProfile?.storeId;

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'delivered';
  const currentStep = STATUS_ORDER[order.status] ?? 0;
  const config = ORDER_STATUS_CONFIG[order.status];

  const formatDate = (ts: any) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return moment(d).format('DD/MM/YYYY à HH:mm');
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la commande',
      'Voulez-vous vraiment annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande',
          style: 'destructive',
          onPress: async () => {
            if (!storeId) return;
            setCancelling(true);
            const result = await cancelOrder(storeId, order.id, 'Annulée par le client');
            setCancelling(false);
            if (!result.success) Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status hero */}
        <View style={[styles.statusHero, { backgroundColor: `${config?.color}15` }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: `${config?.color}25` }]}>
            <Ionicons name={config?.icon as any} size={36} color={config?.color} />
          </View>
          <Text style={[styles.statusLabel, { color: config?.color }]}>{config?.label}</Text>
          <Text style={styles.statusDescription}>{config?.description}</Text>
          <Text style={styles.orderDate}>
            Commandé {order.createdAt?.toDate
              ? moment(order.createdAt.toDate()).fromNow()
              : ''}
          </Text>
        </View>

        {/* Live tracking timeline */}
        {!isCancelled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progression</Text>
            <View style={styles.card}>
              {TIMELINE_STEPS.map((step, idx) => {
                const stepOrder = STATUS_ORDER[step.status];
                const isDone = currentStep >= stepOrder;
                const isCurrent = currentStep === stepOrder;
                const isLast = idx === TIMELINE_STEPS.length - 1;

                return (
                  <View key={step.status} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          isDone && styles.timelineDotDone,
                          isCurrent && styles.timelineDotCurrent,
                        ]}
                      >
                        {isDone ? (
                          <Ionicons
                            name={isCurrent ? step.icon as any : 'checkmark'}
                            size={isCurrent ? 14 : 12}
                            color={colors.textInverse}
                          />
                        ) : (
                          <View style={styles.timelineDotInner} />
                        )}
                      </View>
                      {!isLast && (
                        <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>
                        {step.label}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.timelineCurrentText}>En cours...</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <View style={styles.cancelledBox}>
            <Ionicons name="close-circle" size={32} color={colors.error} />
            <Text style={styles.cancelledTitle}>Commande annulée</Text>
            {order.cancelReason && (
              <Text style={styles.cancelledReason}>{order.cancelReason}</Text>
            )}
            {order.cancelledAt && (
              <Text style={styles.cancelledDate}>{formatDate(order.cancelledAt)}</Text>
            )}
          </View>
        )}

        {/* Livreur info (when in delivery) */}
        {order.status === 'in_delivery' && order.assignedToName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Votre livreur</Text>
            <View style={[styles.card, styles.livreurCard]}>
              <View style={styles.livreurAvatar}>
                <Text style={styles.livreurAvatarText}>
                  {order.assignedToName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.livreurName}>{order.assignedToName}</Text>
                <Text style={styles.livreurLabel}>Livreur en route</Text>
              </View>
              <Ionicons name="bicycle" size={22} color={colors.accent} style={{ marginLeft: 'auto' }} />
            </View>
          </View>
        )}

        {/* Order details */}
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

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Livraison</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.rowText}>{order.clientAddress || '—'}</Text>
            </View>
            {order.notes && (
              <View style={[styles.row, { marginTop: 8 }]}>
                <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
                <Text style={styles.rowText}>{order.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Cancel button (only pending orders) */}
        {order.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.cancelBtnText}>
              {cancelling ? 'Annulation...' : 'Annuler la commande'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  statusLabel: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  statusDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  orderDate: { fontSize: 12, color: colors.textDisabled, marginTop: 8 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  timelineLeft: { alignItems: 'center', width: 28, marginRight: 14 },
  timelineDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: colors.success },
  timelineDotCurrent: { backgroundColor: colors.secondary },
  timelineDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textDisabled },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineContent: { flex: 1, paddingTop: 4, paddingBottom: 16 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: colors.textDisabled },
  timelineLabelDone: { color: colors.textPrimary },
  timelineCurrentText: { fontSize: 12, color: colors.secondary, fontWeight: '600', marginTop: 3 },
  cancelledBox: {
    backgroundColor: colors.errorBackground, borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 20, gap: 8,
  },
  cancelledTitle: { fontSize: 16, fontWeight: '700', color: colors.error },
  cancelledReason: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  cancelledDate: { fontSize: 12, color: colors.textDisabled },
  livreurCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  livreurAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  livreurAvatarText: { fontSize: 18, fontWeight: '800', color: colors.accent },
  livreurName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  livreurLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.error, borderRadius: 12, padding: 14, gap: 8,
    backgroundColor: colors.errorBackground,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.error },
});

export default OrderTrackingScreen;
