import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../theme/colors';
import { PLANS } from '../../../firebase.config';
import {
  listenToPendingPayments,
  verifyPaymentManually,
  rejectPayment,
} from '../../services/paymentService';
import Header from '../../components/common/Header';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

moment.locale('fr');

const PAYMENT_STATUS_COLORS = {
  pending: colors.warning,
  confirmed: colors.success,
  rejected: colors.error,
};

const PAYMENT_STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  rejected: 'Rejeté',
};

const PaymentVerificationScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all'
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    const unsub = listenToPendingPayments((pendingList) => {
      setPayments(pendingList);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleConfirm = (payment) => {
    Alert.alert(
      'Confirmer le paiement',
      `Confirmer le paiement de ${payment.amount} FCFA (${payment.plan}) de ${payment.vendorName || 'ce vendeur'} ?\n\nRéférence: ${payment.reference}\nMéthode: ${payment.method}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setActionLoading(payment.id);
            const result = await verifyPaymentManually(payment.id, 'Confirmé par admin');
            setActionLoading(null);
            if (result.success) {
              Alert.alert('Succès', 'Paiement confirmé et abonnement activé!');
            } else {
              Alert.alert('Erreur', result.error);
            }
          },
        },
      ]
    );
  };

  const handleRejectInit = (payment) => {
    setSelectedPayment(payment);
    setRejectReason('');
    setRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedPayment) return;
    setRejectModal(false);
    setActionLoading(selectedPayment.id);
    const result = await rejectPayment(selectedPayment.id, rejectReason);
    setActionLoading(null);
    if (result.success) {
      Alert.alert('Paiement rejeté', 'Le vendeur a été notifié.');
    } else {
      Alert.alert('Erreur', result.error);
    }
    setSelectedPayment(null);
  };

  const formatDate = (d) => {
    if (!d) return '–';
    const date = d?.toDate ? d.toDate() : new Date(d);
    return moment(date).format('DD/MM/YYYY HH:mm');
  };

  const getPlanColor = (planId) => {
    const map = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return map[planId] || colors.textSecondary;
  };

  if (loading) return <LoadingSpinner fullScreen message="Chargement des paiements..." />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Vérification paiements"
        subtitle={`${payments.length} en attente`}
        onBack={() => navigation.goBack()}
      />

      {payments.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Aucun paiement en attente"
          subtitle="Tous les paiements ont été traités."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {payments.map(payment => {
            const isProcessing = actionLoading === payment.id;
            const planColor = getPlanColor(payment.plan);
            const planInfo = PLANS[payment.plan];

            return (
              <Card key={payment.id} style={styles.paymentCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.vendorAvatar}>
                    <Text style={styles.vendorAvatarText}>
                      {(payment.vendorName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{payment.vendorName || 'Vendeur inconnu'}</Text>
                    <Text style={styles.paymentDate}>{formatDate(payment.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${PAYMENT_STATUS_COLORS[payment.status]}20` }]}>
                    <Text style={[styles.statusText, { color: PAYMENT_STATUS_COLORS[payment.status] }]}>
                      {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                    </Text>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.detailsGrid}>
                  <DetailRow icon="cube-outline" label="Plan" value={
                    <Text style={[styles.planBadgeText, { color: planColor }]}>
                      {planInfo?.name || payment.plan}
                    </Text>
                  } />
                  <DetailRow icon="cash-outline" label="Montant" value={
                    <Text style={styles.amountText}>{payment.amount} FCFA</Text>
                  } />
                  <DetailRow icon="phone-portrait-outline" label="Méthode" value={payment.method} />
                  <DetailRow icon="code-outline" label="Référence" value={
                    <Text style={styles.referenceText}>{payment.reference}</Text>
                  } />
                  <DetailRow icon="calendar-outline" label="Durée" value={`${planInfo?.duration || 30} jours`} />
                </View>

                {/* Actions */}
                {payment.status === 'pending' && (
                  <View style={styles.actionsRow}>
                    <Button
                      title={isProcessing ? '...' : 'Confirmer'}
                      onPress={() => handleConfirm(payment)}
                      loading={isProcessing}
                      size="sm"
                      style={[styles.actionBtn, styles.confirmBtn]}
                      icon={<Ionicons name="checkmark-circle-outline" size={16} color={colors.textInverse} />}
                    />
                    <Button
                      title="Rejeter"
                      onPress={() => handleRejectInit(payment)}
                      variant="danger"
                      size="sm"
                      disabled={isProcessing}
                      style={[styles.actionBtn, styles.rejectBtn]}
                      icon={<Ionicons name="close-circle-outline" size={16} color={colors.textInverse} />}
                    />
                  </View>
                )}

                {payment.status === 'rejected' && payment.rejectReason && (
                  <View style={styles.rejectReasonBox}>
                    <Text style={styles.rejectReasonLabel}>Raison du rejet:</Text>
                    <Text style={styles.rejectReasonText}>{payment.rejectReason}</Text>
                  </View>
                )}
              </Card>
            );
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Reject modal */}
      <Modal
        visible={rejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRejectModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Rejeter le paiement</Text>
            <Text style={styles.modalSubtitle}>
              Raison du rejet (optionnel – sera communiquée au vendeur):
            </Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: Montant incorrect, référence invalide..."
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                variant="outline"
                onPress={() => setRejectModal(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Rejeter"
                variant="danger"
                onPress={handleRejectConfirm}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} />
    <Text style={styles.detailLabel}>{label}:</Text>
    {typeof value === 'string'
      ? <Text style={styles.detailValue}>{value}</Text>
      : <View style={styles.detailValueNode}>{value}</View>
    }
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  paymentCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vendorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsGrid: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    width: 70,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  detailValueNode: {
    flex: 1,
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
  referenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  rejectBtn: {},
  rejectReasonBox: {
    backgroundColor: colors.errorBackground,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  rejectReasonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rejectReasonText: {
    fontSize: 13,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  rejectInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
  },
  bottomPadding: {
    height: 32,
  },
});

export default PaymentVerificationScreen;
