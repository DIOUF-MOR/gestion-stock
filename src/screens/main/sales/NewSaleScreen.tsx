import React, { useState, useMemo, useEffect } from 'react';
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
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { useDelivery } from '../../../context/DeliveryContext';
import { useAuth } from '../../../context/AuthContext';
import { createSale, SaleItem } from '../../../services/salesService';
import { createDelivery } from '../../../services/deliveryService';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';
import ClientPickerField from '../../../components/common/ClientPickerField';

type DeliveryMode = 'none' | 'direct' | 'livreur';

type CartItem = SaleItem & { maxStock: number };

const PAYMENT_METHODS = [
  { key: 'Espèces', icon: 'cash-outline' },
  { key: 'Mobile Money', icon: 'phone-portrait-outline' },
  { key: 'Virement', icon: 'swap-horizontal-outline' },
  { key: 'Crédit', icon: 'time-outline' },
];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const NewSaleScreen = ({ navigation }) => {
  const { products, clients, storeId } = useStore();
  const { livreurs } = useDelivery();
  const { isEmployee, getEmployeeRole } = useAuth();
  const isGerant = isEmployee() && getEmployeeRole() === 'gérant';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [discount, setDiscount] = useState('');
  const [acompte, setAcompte] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ total: number; resteDu: number; deliveryMode: DeliveryMode; livreurName?: string } | null>(null);
  const scaleAnim = useMemo(() => new Animated.Value(0), []);

  // Delivery
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('none');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [selectedLivreur, setSelectedLivreur] = useState<any>(null);
  const [showLivreurModal, setShowLivreurModal] = useState(false);

  const activeLivreurs = useMemo(() => livreurs.filter(l => l.isActive !== false), [livreurs]);

  useEffect(() => {
    if (successData) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
      const timer = setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // Root screen (employee portal) — reset form for next sale
          setCart([]);
          setSelectedClient(null);
          setPaymentMethod('Espèces');
          setDiscount('');
          setAcompte('');
          setDeliveryMode('none');
          setDeliveryAddress('');
          setDeliveryNotes('');
          setSelectedLivreur(null);
          setSuccessData(null);
          scaleAnim.setValue(0);
        }
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [successData]);

  // Only show products that are in stock
  const availableProducts = useMemo(
    () => products.filter(p => (p.quantity ?? 0) > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return availableProducts;
    const q = search.toLowerCase();
    return availableProducts.filter(
      p =>
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

  const showAcompte = selectedClient && paymentMethod !== 'Crédit';
  const acompteAmt = showAcompte ? Math.min(Math.max(Number(acompte) || 0, 0), total) : total;
  const resteDu = showAcompte ? total - acompteAmt : 0;

  // ─── Cart helpers ──────────────────────────────────────────────

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          Alert.alert('Stock insuffisant', `Maximum disponible : ${existing.maxStock} ${existing.unit}`);
          return prev;
        }
        return prev.map(i =>
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
    setCart(prev =>
      prev
        .map(item => {
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
    setCart(prev => prev.filter(i => i.productId !== productId));

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setAcompte('');
    if (client?.address && deliveryMode !== 'none') {
      setDeliveryAddress(client.address);
    }
  };

  const handleDeliveryMode = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
    if (mode !== 'none' && selectedClient?.address && !deliveryAddress) {
      setDeliveryAddress(selectedClient.address);
    }
    if (mode !== 'livreur') setSelectedLivreur(null);
  };

  const handleSelectPayment = (method: string) => {
    setPaymentMethod(method);
    setAcompte('');
  };

  // ─── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez au moins un produit avant de valider.');
      return;
    }
    if (paymentMethod === 'Crédit' && !selectedClient) {
      Alert.alert('Client requis', 'Sélectionnez un client pour enregistrer une vente à crédit.');
      return;
    }
    if (deliveryMode !== 'none' && !deliveryAddress.trim()) {
      Alert.alert('Adresse requise', 'Entrez l\'adresse de livraison.');
      return;
    }
    if (deliveryMode === 'livreur' && !selectedLivreur) {
      Alert.alert('Livreur requis', 'Sélectionnez un livreur ou choisissez "Directe".');
      return;
    }
    setLoading(true);
    try {
      const result = await createSale(storeId, {
        items: cart.map(({ productId, productName, quantity, unitPrice, unit }) => ({
          productId, productName, quantity, unitPrice, unit,
        })),
        total,
        discount: discountAmt,
        clientId: selectedClient?.id ?? null,
        clientName: selectedClient?.name ?? null,
        paymentMethod,
        notes: '',
        amountPaid: showAcompte && acompteAmt < total ? acompteAmt : undefined,
      });

      if (!result.success) {
        Alert.alert('Erreur', result.error);
        return;
      }

      // Create linked delivery if requested
      if (deliveryMode !== 'none') {
        await createDelivery(storeId, {
          clientId: selectedClient?.id,
          clientName: selectedClient?.name ?? 'Anonyme',
          clientPhone: selectedClient?.phone ?? '',
          clientAddress: deliveryAddress.trim(),
          products: cart.map(item => ({
            productId: item.productId,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          totalAmount: total,
          status: deliveryMode === 'livreur' ? 'assigned' : 'pending',
          assignedTo: deliveryMode === 'livreur' ? selectedLivreur?.id : undefined,
          assignedToName: deliveryMode === 'livreur' ? selectedLivreur?.name : undefined,
          notes: deliveryNotes.trim(),
          saleId: result.saleId,
        } as any);
      }

      setSuccessData({ total, resteDu, deliveryMode, livreurName: selectedLivreur?.name });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Nouvelle vente" onBack={isGerant ? undefined : () => navigation.goBack()} />

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

          {/* ── CART ─────────────────────────────────────────── */}
          {cart.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Panier</Text>
              {cart.map(item => (
                <View key={item.productId} style={styles.cartRow}>
                  <View style={styles.cartInfo}>
                    <Text style={styles.cartName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.cartUnit}>{fmt(item.unitPrice)} / {item.unit}</Text>
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

                  <Text style={styles.cartSubtotal}>{fmt(item.unitPrice * item.quantity)}</Text>

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

            {/* Search */}
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
              filteredProducts.map(product => {
                const inCart = cart.find(i => i.productId === product.id);
                const outOfStock = (product.quantity ?? 0) === 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productRow, outOfStock && styles.productRowDisabled]}
                    onPress={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
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

          {/* ── CLIENT ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client (optionnel)</Text>
            <ClientPickerField
              clients={clients}
              selectedClient={selectedClient}
              onSelect={handleSelectClient}
              onClear={() => handleSelectClient(null)}
              placeholder="Choisir un client (optionnel)"
              allowAnonymous
            />
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
                    onPress={() => handleSelectPayment(key)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={active ? colors.textInverse : colors.textSecondary}
                    />
                    <Text style={[styles.paymentLabel, active && styles.paymentLabelActive]}>
                      {key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentMethod === 'Crédit' && (
              <View style={styles.creditNote}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.creditNoteText}>
                  Une dette sera créée automatiquement pour le client sélectionné.
                </Text>
              </View>
            )}
          </View>

          {/* ── SUMMARY ──────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récapitulatif</Text>

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

            {showAcompte && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Acompte versé</Text>
                  <View style={styles.discountField}>
                    <TextInput
                      style={styles.discountInput}
                      value={acompte}
                      onChangeText={setAcompte}
                      placeholder={String(total)}
                      placeholderTextColor={colors.textDisabled}
                      keyboardType="numeric"
                    />
                    <Text style={styles.discountUnit}>FCFA</Text>
                  </View>
                </View>

                {resteDu > 0 && (
                  <View style={styles.resteDuRow}>
                    <Ionicons name="time-outline" size={14} color={colors.warning} />
                    <Text style={styles.resteDuText}>
                      Reste dû : {fmt(resteDu)} — une dette sera créée
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL À PAYER</Text>
              <Text style={styles.totalValue}>{fmt(total)}</Text>
            </View>
            {resteDu > 0 && (
              <View style={[styles.totalRow, { marginTop: 6 }]}>
                <Text style={[styles.totalLabel, { fontSize: 13, color: colors.textSecondary }]}>Payé maintenant</Text>
                <Text style={[styles.totalValue, { fontSize: 16, color: colors.success }]}>{fmt(acompteAmt)}</Text>
              </View>
            )}

            {selectedClient && (
              <View style={styles.clientBadge}>
                <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.clientBadgeText}>{selectedClient.name}</Text>
                <TouchableOpacity onPress={() => setSelectedClient(null)}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── LIVRAISON ────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Livraison</Text>

            {/* Mode tabs */}
            <View style={styles.deliveryTabs}>
              {([
                { key: 'none',    label: 'Aucune',  icon: 'close-circle-outline' },
                { key: 'direct',  label: 'Directe', icon: 'storefront-outline' },
                { key: 'livreur', label: 'Livreur',  icon: 'bicycle-outline' },
              ] as { key: DeliveryMode; label: string; icon: string }[]).map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.deliveryTab, deliveryMode === key && styles.deliveryTabActive]}
                  onPress={() => handleDeliveryMode(key)}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={deliveryMode === key ? colors.textInverse : colors.textSecondary}
                  />
                  <Text style={[styles.deliveryTabText, deliveryMode === key && styles.deliveryTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {deliveryMode !== 'none' && (
              <>
                {/* Livreur picker */}
                {deliveryMode === 'livreur' && (
                  <TouchableOpacity
                    style={[styles.livreurPicker, selectedLivreur && styles.livreurPickerSelected]}
                    onPress={() => setShowLivreurModal(true)}
                  >
                    <Ionicons
                      name={selectedLivreur ? 'checkmark-circle' : 'person-add-outline'}
                      size={20}
                      color={selectedLivreur ? colors.success : colors.primary}
                    />
                    <Text style={[styles.livreurPickerText, selectedLivreur && { color: colors.success }]}>
                      {selectedLivreur ? selectedLivreur.name : 'Choisir un livreur'}
                    </Text>
                    {selectedLivreur && (
                      <TouchableOpacity onPress={() => setSelectedLivreur(null)}>
                        <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}

                {/* Address */}
                <View style={styles.inputRow}>
                  <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="Adresse de livraison *"
                    placeholderTextColor={colors.textDisabled}
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                    multiline
                  />
                </View>

                {/* Notes */}
                <View style={styles.inputRow}>
                  <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="Instructions (optionnel)"
                    placeholderTextColor={colors.textDisabled}
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                  />
                </View>
              </>
            )}
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

      {/* ── SUCCESS OVERLAY ─────────────────────────────────── */}
      {successData && (
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={44} color={colors.textInverse} />
            </View>
            <Text style={styles.successTitle}>Vente enregistrée !</Text>
            <Text style={styles.successAmount}>{fmt(successData.total)}</Text>
            {successData.resteDu > 0 && (
              <View style={styles.successBadge}>
                <Ionicons name="time-outline" size={13} color={colors.warning} />
                <Text style={styles.successBadgeText}>Reste dû : {fmt(successData.resteDu)}</Text>
              </View>
            )}
            {successData.deliveryMode === 'direct' && (
              <View style={[styles.successBadge, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="storefront-outline" size={13} color={colors.primary} />
                <Text style={[styles.successBadgeText, { color: colors.primary }]}>Livraison directe créée</Text>
              </View>
            )}
            {successData.deliveryMode === 'livreur' && (
              <View style={[styles.successBadge, { backgroundColor: `${colors.accent}15` }]}>
                <Ionicons name="bicycle-outline" size={13} color={colors.accent} />
                <Text style={[styles.successBadgeText, { color: colors.accent }]}>
                  Assigné à {successData.livreurName}
                </Text>
              </View>
            )}
            <Text style={styles.successHint}>Retour automatique…</Text>
          </Animated.View>
        </View>
      )}

      {/* ── LIVREUR PICKER MODAL ─────────────────────────── */}
      <Modal visible={showLivreurModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un livreur</Text>
              <TouchableOpacity onPress={() => setShowLivreurModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {activeLivreurs.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="bicycle-outline" size={40} color={colors.textDisabled} />
                <Text style={styles.modalEmptyText}>Aucun livreur actif disponible</Text>
              </View>
            ) : (
              <FlatList
                data={activeLivreurs}
                keyExtractor={(l) => l.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => { setSelectedLivreur(item); setShowLivreurModal(false); }}
                  >
                    <View style={styles.livreurAvatar}>
                      <Text style={styles.livreurAvatarText}>
                        {item.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{item.name}</Text>
                      <Text style={styles.modalItemSub}>{item.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
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

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  totalBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalBarCount: { fontSize: 14, color: colors.textInverse, fontWeight: '600' },
  totalBarAmount: { fontSize: 18, fontWeight: '800', color: colors.textInverse },

  scroll: { paddingHorizontal: 16, paddingTop: 12 },

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
  qtyVal: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, minWidth: 24, textAlign: 'center' },
  cartSubtotal: { fontSize: 13, fontWeight: '700', color: colors.primary, minWidth: 80, textAlign: 'right' },
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
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
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
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnActive: { backgroundColor: colors.success },

  // Client + Payment chips
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse },

  // Payment method grid
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentCard: {
    flex: 1, minWidth: '44%',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background, gap: 6,
  },
  paymentCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  paymentLabelActive: { color: colors.textInverse },
  creditNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.warningBackground,
    borderRadius: 10, padding: 10, marginTop: 10, gap: 8,
  },
  creditNoteText: { flex: 1, fontSize: 13, color: colors.warning, lineHeight: 18 },
  resteDuRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.warningBackground,
    borderRadius: 8, padding: 8, marginTop: 6, gap: 6,
  },
  resteDuText: { flex: 1, fontSize: 12, color: colors.warning, lineHeight: 17 },

  // Summary
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  discountField: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  discountInput: { fontSize: 14, color: colors.textPrimary, minWidth: 60, textAlign: 'right' },
  discountUnit: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  clientBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${colors.primary}12`,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    marginTop: 12, gap: 6, alignSelf: 'flex-start',
  },
  clientBadgeText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  submitBtn: { marginTop: 4 },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '78%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.success,
    marginBottom: 12,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 8,
  },
  successBadgeText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  successHint: {
    fontSize: 13,
    color: colors.textDisabled,
    marginTop: 4,
  },

  // Delivery section
  deliveryTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  deliveryTabActive: { backgroundColor: colors.primary },
  deliveryTabText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  deliveryTabTextActive: { color: colors.textInverse },
  livreurPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 10,
  },
  livreurPickerSelected: { borderColor: colors.success, backgroundColor: `${colors.success}08` },
  livreurPickerText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  inputIcon: { marginTop: 2 },
  inlineInput: { flex: 1, fontSize: 14, color: colors.textPrimary, minHeight: 22 },

  // Livreur picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 12,
  },
  modalItemTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  modalItemSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  modalEmpty: { padding: 40, alignItems: 'center', gap: 10 },
  modalEmptyText: { fontSize: 14, color: colors.textSecondary },
  livreurAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center',
  },
  livreurAvatarText: { fontSize: 15, fontWeight: '800', color: colors.accent },
});

export default NewSaleScreen;
