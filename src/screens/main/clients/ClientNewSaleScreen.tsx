import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';

import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { createSale, SaleItem } from '../../../services/salesService';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

moment.locale('fr');

type CartItem = SaleItem & { maxStock: number };

const PAYMENT_METHODS = [
  { key: 'Espèces', icon: 'cash-outline' },
  { key: 'Mobile Money', icon: 'phone-portrait-outline' },
  { key: 'Virement', icon: 'swap-horizontal-outline' },
  { key: 'Crédit', icon: 'time-outline' },
];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const ClientNewSaleScreen = ({ navigation, route }) => {
  const client = route.params?.client;
  const { products, storeId } = useStore();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);

  // Only show products that are in stock
  const availableProducts = useMemo(
    () => products.filter((p) => (p.quantity ?? 0) > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return availableProducts;
    const q = search.toLowerCase();
    return availableProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [availableProducts, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [cart]
  );
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - discountAmt;

  // ─── Cart helpers ──────────────────────────────────────────────

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          Alert.alert(
            'Stock insuffisant',
            `Maximum disponible : ${existing.maxStock} ${existing.unit}`
          );
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          unit: product.unit || 'unité',
          maxStock: product.quantity,
        },
      ];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const next = item.quantity + delta;
          if (next <= 0) return null as any;
          if (next > item.maxStock) {
            Alert.alert('Stock insuffisant', `Maximum : ${item.maxStock} ${item.unit}`);
            return item;
          }
          return { ...item, quantity: next };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId));

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez au moins un produit avant de valider.');
      return;
    }

    setLoading(true);
    try {
      const result = await createSale(storeId, {
        items: cart.map(({ productId, productName, quantity, unitPrice, unit }) => ({
          productId,
          productName,
          quantity,
          unitPrice,
          unit,
        })),
        total,
        discount: discountAmt,
        clientId: client.id,
        clientName: client.name,
        paymentMethod,
        notes: '',
      });

      if (result.success) {
        Alert.alert(
          'Vente enregistrée',
          `Montant : ${fmt(total)}\nClient : ${client.name}\nStock mis à jour automatiquement.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Erreur', result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`Vente — ${client?.name ?? '...'}`} onBack={() => navigation.goBack()} />

      {/* Running total bar */}
      <View style={styles.totalBar}>
        <View style={styles.totalBarLeft}>
          <Ionicons name="cart-outline" size={18} color={colors.textInverse} />
          <Text style={styles.totalBarCount}>
            {cart.length} article{cart.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.totalBarAmount}>{fmt(total)}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── CLIENT BADGE (non-removable) ──────────────────── */}
          <View style={styles.clientSection}>
            <Ionicons name="person-circle" size={18} color={colors.primary} />
            <Text style={styles.clientBadgeText}>{client?.name}</Text>
            <View style={styles.clientFixedBadge}>
              <Text style={styles.clientFixedBadgeText}>Pré-sélectionné</Text>
            </View>
          </View>

          {/* ── CART ─────────────────────────────────────────── */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Panier</Text>
              {cart.map((item) => (
                <View key={item.productId} style={styles.cartRow}>
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.cartUnit}>
                      {fmt(item.unitPrice)} / {item.unit}
                    </Text>
                  </View>

                  <View style={styles.cartQty}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => changeQty(item.productId, -1)}
                    >
                      <Ionicons name="remove" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => changeQty(item.productId, 1)}
                    >
                      <Ionicons name="add" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartSubtotal}>
                    {fmt(item.unitPrice * item.quantity)}
                  </Text>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeFromCart(item.productId)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── PRODUCT PICKER ───────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ajouter un article</Text>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un produit..."
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

            {filteredProducts.length === 0 ? (
              <Text style={styles.emptyText}>
                {availableProducts.length === 0
                  ? 'Aucun produit en stock'
                  : 'Aucun résultat'}
              </Text>
            ) : (
              filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id);
                const outOfStock = (product.quantity ?? 0) === 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productRow,
                      outOfStock && styles.productRowDisabled,
                    ]}
                    onPress={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.productStock}>
                        Stock : {product.quantity} {product.unit}
                        {product.category ? ` · ${product.category}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>{fmt(product.price)}</Text>
                    <View style={[styles.addBtn, inCart && styles.addBtnActive]}>
                      <Ionicons
                        name={inCart ? 'checkmark' : 'add'}
                        size={16}
                        color={inCart ? colors.textInverse : colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── PAYMENT METHOD ───────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mode de paiement</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_METHODS.map(({ key, icon }) => {
                const active = paymentMethod === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.paymentCard, active && styles.paymentCardActive]}
                    onPress={() => setPaymentMethod(key)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={active ? colors.textInverse : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.paymentLabel,
                        active && styles.paymentLabelActive,
                      ]}
                    >
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentMethod === 'Crédit' && (
              <View style={styles.creditNote}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.warning}
                />
                <Text style={styles.creditNoteText}>
                  Une dette sera créée automatiquement pour {client?.name}.
                </Text>
              </View>
            )}
          </View>

          {/* ── SUMMARY ──────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Client</Text>
              <View style={styles.clientInlineBadge}>
                <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
                <Text style={styles.clientInlineName}>{client?.name}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total</Text>
              <Text style={styles.summaryValue}>{fmt(subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remise</Text>
              <View style={styles.discountField}>
                <TextInput
                  style={styles.discountInput}
                  value={discount}
                  onChangeText={setDiscount}
                  placeholder="0"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numeric"
                />
                <Text style={styles.discountUnit}>FCFA</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL À PAYER</Text>
              <Text style={styles.totalValue}>{fmt(total)}</Text>
            </View>
          </View>

          {/* ── SUBMIT ───────────────────────────────────────── */}
          <Button
            title={cart.length === 0 ? 'Ajoutez des articles' : `Valider — ${fmt(total)}`}
            onPress={handleSubmit}
            loading={loading}
            disabled={cart.length === 0}
            style={styles.submitBtn}
          />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Total bar
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  totalBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalBarCount: { fontSize: 14, color: colors.textInverse, fontWeight: '600' },
  totalBarAmount: { fontSize: 18, fontWeight: '800', color: colors.textInverse },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },

  // Client badge (top)
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}12`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  clientBadgeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  clientFixedBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clientFixedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },

  // Sections
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // Cart
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  cartInfo: { flex: 1 },
  cartName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  cartUnit: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cartQty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: { padding: 6 },
  qtyVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  cartSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    minWidth: 80,
    textAlign: 'right',
  },
  removeBtn: { padding: 4 },

  // Product picker
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  productRowDisabled: { opacity: 0.4 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  productStock: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '700', color: colors.primary },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: { backgroundColor: colors.success },

  // Payment method
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentCard: {
    flex: 1,
    minWidth: '44%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 6,
  },
  paymentCardActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  paymentLabelActive: { color: colors.textInverse },
  creditNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningBackground,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  creditNoteText: { flex: 1, fontSize: 13, color: colors.warning, lineHeight: 18 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  clientInlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}12`,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clientInlineName: { fontSize: 13, fontWeight: '600', color: colors.primary },
  discountField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountInput: {
    fontSize: 14,
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'right',
  },
  discountUnit: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.secondary },

  submitBtn: { marginTop: 4 },
});

export default ClientNewSaleScreen;
