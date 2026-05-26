import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { createOrder } from '../../services/orderService';

const PlaceOrderScreen = ({ route, navigation }) => {
  const { items, totalAmount, onOrderPlaced } = route.params;
  const { userProfile } = useAuth();

  const [address, setAddress] = useState(userProfile?.address || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const storeId = userProfile?.storeId;
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

  const handleConfirmOrder = async () => {
    if (!address.trim()) {
      return Alert.alert('Adresse requise', 'Veuillez indiquer votre adresse de livraison.');
    }
    if (!storeId) return;

    setLoading(true);
    const result = await createOrder(storeId, {
      clientId: userProfile.id,
      clientName: userProfile.name,
      clientPhone: userProfile.phone || '',
      clientAddress: address.trim(),
      items,
      totalAmount,
      discount: 0,
      notes: notes.trim(),
    });
    setLoading(false);

    if (result.success) {
      if (onOrderPlaced) onOrderPlaced();
      Alert.alert(
        'Commande envoyée !',
        'Votre commande a été transmise au vendeur. Vous serez notifié de son évolution.',
        [
          {
            text: 'Voir mes commandes',
            onPress: () => {
              navigation.navigate('MesCommandes');
            },
          },
        ]
      );
    } else {
      Alert.alert('Erreur', result.error || 'Une erreur est survenue');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmer la commande</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Items recap */}
        <Section title={`Articles (${items.length})`} icon="cube-outline">
          <View style={styles.card}>
            {items.map((item: any, idx: number) => (
              <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                <Ionicons name="cube-outline" size={14} color={colors.secondary} />
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>{fmt(item.subtotal)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{fmt(totalAmount)}</Text>
            </View>
          </View>
        </Section>

        {/* Client info */}
        <Section title="Vos informations" icon="person-outline">
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom" value={userProfile?.name} />
            <InfoRow icon="call-outline" label="Tél." value={userProfile?.phone} />
          </View>
        </Section>

        {/* Delivery address */}
        <Section title="Adresse de livraison *" icon="location-outline">
          <TextInput
            style={styles.addressInput}
            placeholder="Entrez votre adresse complète..."
            placeholderTextColor={colors.textDisabled}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        {/* Notes */}
        <Section title="Instructions (optionnel)" icon="document-text-outline">
          <TextInput
            style={styles.notesInput}
            placeholder="Heure préférée, instructions particulières..."
            placeholderTextColor={colors.textDisabled}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total</Text>
            <Text style={styles.summaryValue}>{fmt(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Livraison</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>Gratuite</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalAmount}>{fmt(totalAmount)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={styles.infoText}>
            Le paiement se fait à la livraison. Le vendeur confirmera votre commande prochainement.
          </Text>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirmOrder}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={22} color={colors.textInverse} />
          <Text style={styles.confirmBtnText}>
            {loading ? 'Envoi en cours...' : 'Passer la commande'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({ title, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon} size={16} color={colors.secondary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} style={{ width: 20 }} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
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
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  content: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  itemQty: { fontSize: 13, color: colors.textSecondary, width: 28 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: colors.secondary },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: colors.divider,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalAmount: { fontSize: 17, fontWeight: '800', color: colors.secondary },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 8,
  },
  infoLabel: { width: 40, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  addressInput: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, padding: 14, fontSize: 14, color: colors.textPrimary,
    minHeight: 80,
  },
  notesInput: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, padding: 14, fontSize: 14, color: colors.textPrimary,
    minHeight: 70,
  },
  summaryBox: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  summaryTotal: { borderBottomWidth: 0, paddingTop: 12 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  summaryTotalAmount: { fontSize: 18, fontWeight: '800', color: colors.secondary },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${colors.info}10`, borderRadius: 10, padding: 12, marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.secondary, borderRadius: 14, padding: 18, gap: 10,
    shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
});

export default PlaceOrderScreen;
