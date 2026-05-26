import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { addProduct, updateProduct } from '../../../services/stockService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const UNITS = ['unité', 'kg', 'g', 'litre', 'ml', 'boîte', 'carton', 'sac', 'pièce', 'mètre', 'paquet'];
const CATEGORIES = ['Alimentation', 'Boissons', 'Vêtements', 'Électronique', 'Cosmétiques', 'Fournitures', 'Matériaux', 'Autre'];

const AddProductScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const editProduct = route.params?.product;
  const isEditing = !!editProduct;

  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    costPrice: '',
    quantity: '',
    minQuantity: '5',
    unit: 'unité',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editProduct) {
      setForm({
        name: editProduct.name || '',
        category: editProduct.category || '',
        price: editProduct.price?.toString() || '',
        costPrice: editProduct.costPrice?.toString() || '',
        quantity: editProduct.quantity?.toString() || '',
        minQuantity: editProduct.minQuantity?.toString() || '5',
        unit: editProduct.unit || 'unité',
        description: editProduct.description || '',
      });
    }
  }, [editProduct]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.price) newErrors.price = 'Le prix de vente est requis';
    else if (isNaN(Number(form.price)) || Number(form.price) < 0) {
      newErrors.price = 'Prix invalide';
    }
    if (form.costPrice && (isNaN(Number(form.costPrice)) || Number(form.costPrice) < 0)) {
      newErrors.costPrice = 'Prix d\'achat invalide';
    }
    if (!form.quantity) newErrors.quantity = 'La quantité est requise';
    else if (isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
      newErrors.quantity = 'Quantité invalide';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!storeId) {
      Alert.alert(
        'Boutique introuvable',
        'Votre profil de boutique n\'est pas encore chargé. Déconnectez-vous et reconnectez-vous.'
      );
      return;
    }

    setLoading(true);
    try {
      const productData = {
        name: form.name.trim(),
        category: form.category.trim() || 'Général',
        price: Number(form.price),
        costPrice: Number(form.costPrice) || 0,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity) || 5,
        unit: form.unit,
        description: form.description.trim(),
      };

      let result;
      if (isEditing) {
        result = await updateProduct(storeId, editProduct.id, productData);
      } else {
        result = await addProduct(storeId, productData);
      }

      if (result.success) {
        navigation.goBack();
      } else {
        console.error('addProduct failed:', result.error);
        Alert.alert('Erreur', result.error || 'Impossible d\'enregistrer le produit.');
      }
    } catch (error) {
      console.error('handleSubmit error:', error);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
        subtitle={isEditing ? 'Mettre à jour les informations' : 'Ajouter au catalogue'}
        onBack={() => navigation.goBack()}
        accentColor={colors.primary}
        showShadow
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Product info section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations produit</Text>

            <Input
              label="Nom du produit *"
              value={form.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="ex: Farine de blé"
              autoCapitalize="sentences"
              error={errors.name}
              leftIcon={
                <Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Input
              label="Catégorie"
              value={form.category}
              onChangeText={(text) => updateField('category', text)}
              placeholder="ex: Alimentation"
              autoCapitalize="sentences"
              leftIcon={
                <Ionicons name="folder-outline" size={20} color={colors.textSecondary} />
              }
            />

            <Text style={styles.fieldLabel}>Catégories suggérées:</Text>
            <View style={styles.chipList}>
              {CATEGORIES.map((cat) => (
                <TouchableChip
                  key={cat}
                  label={cat}
                  selected={form.category === cat}
                  onPress={() => updateField('category', cat)}
                />
              ))}
            </View>

            <Input
              label="Description (optionnel)"
              value={form.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="Description du produit..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={
                <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
              }
            />
          </View>

          {/* Pricing section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prix</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Prix de vente *"
                  value={form.price}
                  onChangeText={(text) => updateField('price', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  error={errors.price}
                  leftIcon={
                    <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                  }
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Prix d'achat"
                  value={form.costPrice}
                  onChangeText={(text) => updateField('costPrice', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  error={errors.costPrice}
                  leftIcon={
                    <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
                  }
                />
              </View>
            </View>

            {form.price && form.costPrice && (
              <View style={styles.marginInfo}>
                <Ionicons name="trending-up" size={16} color={colors.success} />
                <Text style={styles.marginText}>
                  Marge: {((Number(form.price) - Number(form.costPrice)) / Math.max(Number(form.price), 1) * 100).toFixed(1)}%
                  ({(Number(form.price) - Number(form.costPrice)).toFixed(0)} FCFA)
                </Text>
              </View>
            )}
          </View>

          {/* Stock section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Input
                  label="Quantité *"
                  value={form.quantity}
                  onChangeText={(text) => updateField('quantity', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  error={errors.quantity}
                  leftIcon={
                    <Ionicons name="layers-outline" size={20} color={colors.textSecondary} />
                  }
                />
              </View>
              <View style={styles.halfField}>
                <Input
                  label="Seuil d'alerte"
                  value={form.minQuantity}
                  onChangeText={(text) => updateField('minQuantity', text)}
                  placeholder="5"
                  keyboardType="numeric"
                  leftIcon={
                    <Ionicons name="alert-circle-outline" size={20} color={colors.textSecondary} />
                  }
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Unité de mesure:</Text>
            <View style={styles.chipList}>
              {UNITS.map((unit) => (
                <TouchableChip
                  key={unit}
                  label={unit}
                  selected={form.unit === unit}
                  onPress={() => updateField('unit', unit)}
                />
              ))}
            </View>
          </View>

          <Button
            title={isEditing ? 'Enregistrer les modifications' : 'Ajouter le produit'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const TouchableChip = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[chipStyles.chip, selected && chipStyles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[chipStyles.chipText, selected && chipStyles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: -4,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  marginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: 10,
    padding: 10,
    marginTop: -4,
  },
  marginText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  submitButton: {
    marginBottom: 8,
  },
  bottomPadding: {
    height: 24,
  },
});

export default AddProductScreen;
