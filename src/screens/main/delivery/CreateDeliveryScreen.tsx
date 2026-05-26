import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { useDelivery } from '../../../context/DeliveryContext';
import { createDelivery, assignDelivery } from '../../../services/deliveryService';

const CreateDeliveryScreen = ({ navigation }) => {
  const { storeId, clients, products } = useStore();
  const { livreurs } = useDelivery();

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLivreur, setSelectedLivreur] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLivreurModal, setShowLivreurModal] = useState(false);

  const totalAmount = selectedProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSelectClient = (client) => {
    setClientName(client.name);
    setClientPhone(client.phone || '');
    setClientAddress(client.address || '');
    setShowClientModal(false);
  };

  const handleAddProduct = (product) => {
    const existing = selectedProducts.find((p) => p.productId === product.id);
    if (existing) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p.productId === product.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          price: product.price || 0,
        },
      ]);
    }
    setShowProductModal(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId));
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setSelectedProducts(
      selectedProducts
        .map((p) =>
          p.productId === productId ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
        )
        .filter((p) => p.quantity > 0)
    );
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      return Alert.alert('Erreur', 'Veuillez entrer le nom du client.');
    }
    if (!clientAddress.trim()) {
      return Alert.alert('Erreur', 'Veuillez entrer l\'adresse de livraison.');
    }
    if (selectedProducts.length === 0) {
      return Alert.alert('Erreur', 'Veuillez ajouter au moins un article.');
    }
    if (!storeId) return;

    setLoading(true);
    const deliveryData = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientAddress: clientAddress.trim(),
      products: selectedProducts,
      totalAmount,
      status: 'pending' as const,
      notes: notes.trim(),
      assignedTo: selectedLivreur?.id || null,
      assignedToName: selectedLivreur?.name || null,
    };

    const result = await createDelivery(storeId, deliveryData);
    setLoading(false);

    if (result.success) {
      Alert.alert('Succès', 'Livraison créée avec succès !', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('Erreur', result.error || 'Une erreur est survenue');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle livraison</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Client section */}
        <SectionTitle title="Client" icon="person-outline" />

        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowClientModal(true)}
        >
          <Ionicons name="search-outline" size={18} color={colors.primary} />
          <Text style={styles.selectBtnText}>Sélectionner un client existant</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nom du client *"
          placeholderTextColor={colors.textDisabled}
          value={clientName}
          onChangeText={setClientName}
        />
        <TextInput
          style={styles.input}
          placeholder="Téléphone"
          placeholderTextColor={colors.textDisabled}
          value={clientPhone}
          onChangeText={setClientPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          placeholder="Adresse de livraison *"
          placeholderTextColor={colors.textDisabled}
          value={clientAddress}
          onChangeText={setClientAddress}
          multiline
        />

        {/* Products section */}
        <SectionTitle title={`Articles (${selectedProducts.length})`} icon="cube-outline" />

        {selectedProducts.map((p) => (
          <View key={p.productId} style={styles.productRow}>
            <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleQtyChange(p.productId, -1)}
              >
                <Ionicons name="remove" size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{p.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleQtyChange(p.productId, 1)}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.productPrice}>
              {new Intl.NumberFormat('fr-FR').format(p.price * p.quantity)} FCFA
            </Text>
            <TouchableOpacity onPress={() => handleRemoveProduct(p.productId)}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addProductBtn}
          onPress={() => setShowProductModal(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addProductBtnText}>Ajouter un article</Text>
        </TouchableOpacity>

        {selectedProducts.length > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant total</Text>
            <Text style={styles.totalAmount}>
              {new Intl.NumberFormat('fr-FR').format(totalAmount)} FCFA
            </Text>
          </View>
        )}

        {/* Livreur assignment */}
        <SectionTitle title="Livreur (optionnel)" icon="bicycle-outline" />
        <TouchableOpacity
          style={styles.livreurSelect}
          onPress={() => setShowLivreurModal(true)}
        >
          <Ionicons
            name={selectedLivreur ? 'checkmark-circle' : 'person-add-outline'}
            size={20}
            color={selectedLivreur ? colors.success : colors.primary}
          />
          <Text style={[styles.livreurSelectText, selectedLivreur && { color: colors.success }]}>
            {selectedLivreur ? selectedLivreur.name : 'Assigner un livreur'}
          </Text>
          {selectedLivreur && (
            <TouchableOpacity onPress={() => setSelectedLivreur(null)}>
              <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Notes */}
        <SectionTitle title="Instructions" icon="document-text-outline" />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Instructions pour le livreur (optionnel)..."
          placeholderTextColor={colors.textDisabled}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Ionicons name="bicycle" size={20} color={colors.textInverse} />
          <Text style={styles.submitBtnText}>
            {loading ? 'Création...' : 'Créer la livraison'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Client selection modal */}
      <SelectionModal
        visible={showClientModal}
        title="Sélectionner un client"
        data={clients}
        keyExtractor={(c) => c.id}
        renderItem={(c) => (
          <View>
            <Text style={styles.modalItemTitle}>{c.name}</Text>
            <Text style={styles.modalItemSub}>{c.phone} — {c.address || 'Pas d\'adresse'}</Text>
          </View>
        )}
        onSelect={handleSelectClient}
        onClose={() => setShowClientModal(false)}
        emptyMessage="Aucun client enregistré"
      />

      {/* Product selection modal */}
      <SelectionModal
        visible={showProductModal}
        title="Ajouter un article"
        data={products.filter((p) => p.quantity > 0)}
        keyExtractor={(p) => p.id}
        renderItem={(p) => (
          <View>
            <Text style={styles.modalItemTitle}>{p.name}</Text>
            <Text style={styles.modalItemSub}>
              Stock: {p.quantity} — {new Intl.NumberFormat('fr-FR').format(p.price || 0)} FCFA
            </Text>
          </View>
        )}
        onSelect={handleAddProduct}
        onClose={() => setShowProductModal(false)}
        emptyMessage="Aucun produit disponible"
      />

      {/* Livreur selection modal */}
      <SelectionModal
        visible={showLivreurModal}
        title="Assigner un livreur"
        data={livreurs.filter((l) => l.isActive !== false)}
        keyExtractor={(l) => l.id}
        renderItem={(l) => (
          <View>
            <Text style={styles.modalItemTitle}>{l.name}</Text>
            <Text style={styles.modalItemSub}>{l.phone}</Text>
          </View>
        )}
        onSelect={(l) => { setSelectedLivreur(l); setShowLivreurModal(false); }}
        onClose={() => setShowLivreurModal(false)}
        emptyMessage="Aucun livreur disponible"
      />
    </SafeAreaView>
  );
};

const SectionTitle = ({ title, icon }) => (
  <View style={styles.sectionTitleRow}>
    <Ionicons name={icon} size={16} color={colors.primary} />
    <Text style={styles.sectionTitleText}>{title}</Text>
  </View>
);

const SelectionModal = ({ visible, title, data, keyExtractor, renderItem, onSelect, onClose, emptyMessage }) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {data.length === 0 ? (
          <View style={styles.modalEmpty}>
            <Text style={styles.modalEmptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => onSelect(item)}>
                {renderItem(item)}
                <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  </Modal>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  content: { padding: 16 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 16,
  },
  sectionTitleText: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  selectBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  textArea: { minHeight: 90 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
    paddingHorizontal: 6,
  },
  qtyBtn: { padding: 4 },
  qtyText: { fontSize: 14, fontWeight: '700', color: colors.primary, minWidth: 20, textAlign: 'center' },
  productPrice: { fontSize: 13, fontWeight: '700', color: colors.success },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  addProductBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  totalAmount: { fontSize: 17, fontWeight: '800', color: colors.primary },
  livreurSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  livreurSelectText: { flex: 1, fontSize: 14, color: colors.primary, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
    gap: 10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: colors.textInverse },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
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
    gap: 10,
  },
  modalItemTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  modalItemSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  modalEmpty: { padding: 32, alignItems: 'center' },
  modalEmptyText: { fontSize: 14, color: colors.textSecondary },
});

export default CreateDeliveryScreen;
