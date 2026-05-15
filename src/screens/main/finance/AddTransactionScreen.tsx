import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { addTransaction, getTransactionCategories } from '../../../services/financeService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Virement bancaire', 'Chèque', 'Carte bancaire'];

const AddTransactionScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const initialType = route.params?.type || 'revenue';
  const categories = getTransactionCategories();

  const [form, setForm] = useState({
    type: initialType,
    amount: '',
    description: '',
    category: '',
    paymentMethod: 'Espèces',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.amount) newErrors.amount = 'Le montant est requis';
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      newErrors.amount = 'Montant invalide (doit être positif)';
    }
    if (!form.description.trim() && !form.category) {
      newErrors.description = 'La description ou catégorie est requise';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await addTransaction(storeId, {
        ...form,
        amount: Number(form.amount),
        date: form.date,
        description: form.description || form.category,
      });

      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = categories[form.type] || [];
  const isRevenue = form.type === 'revenue';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Nouvelle transaction"
        onBack={() => navigation.goBack()}
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
          {/* Type selector */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeTab,
                isRevenue && styles.typeTabRevenue,
              ]}
              onPress={() => updateField('type', 'revenue')}
            >
              <Ionicons
                name="trending-up"
                size={20}
                color={isRevenue ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.typeTabText, isRevenue && styles.typeTabTextActive]}>
                Revenu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeTab,
                !isRevenue && styles.typeTabExpense,
              ]}
              onPress={() => updateField('type', 'expense')}
            >
              <Ionicons
                name="trending-down"
                size={20}
                color={!isRevenue ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.typeTabText, !isRevenue && styles.typeTabTextActive]}>
                Dépense
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={[styles.amountCard, { borderColor: isRevenue ? colors.success : colors.error }]}>
            <Text style={styles.amountLabel}>Montant (FCFA)</Text>
            <Input
              value={form.amount}
              onChangeText={(text) => updateField('amount', text)}
              placeholder="0"
              keyboardType="numeric"
              error={errors.amount}
              inputStyle={[styles.amountInput, { color: isRevenue ? colors.success : colors.error }]}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails</Text>

            <Input
              label="Description"
              value={form.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="ex: Vente de produits alimentaires"
              autoCapitalize="sentences"
              error={errors.description}
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />

            <Text style={styles.fieldLabel}>Catégorie:</Text>
            <View style={styles.chipList}>
              {currentCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    form.category === cat && (isRevenue ? styles.chipRevenue : styles.chipExpense),
                  ]}
                  onPress={() => updateField('category', cat)}
                >
                  <Text style={[
                    styles.chipText,
                    form.category === cat && styles.chipTextSelected,
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Date"
              value={form.date}
              onChangeText={(text) => updateField('date', text)}
              placeholder="AAAA-MM-JJ"
              leftIcon={<Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiement</Text>

            <Text style={styles.fieldLabel}>Mode de paiement:</Text>
            <View style={styles.chipList}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.chip,
                    form.paymentMethod === method && styles.chipPayment,
                  ]}
                  onPress={() => updateField('paymentMethod', method)}
                >
                  <Text style={[
                    styles.chipText,
                    form.paymentMethod === method && styles.chipTextSelected,
                  ]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Notes (optionnel)"
              value={form.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Notes supplémentaires..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          <Button
            title="Enregistrer la transaction"
            onPress={handleSubmit}
            loading={loading}
            style={[styles.submitButton, { backgroundColor: isRevenue ? colors.success : colors.error }]}
          />

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  typeTabRevenue: {
    backgroundColor: colors.success,
  },
  typeTabExpense: {
    backgroundColor: colors.error,
  },
  typeTabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeTabTextActive: {
    color: colors.textInverse,
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
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
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipRevenue: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  chipExpense: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  chipPayment: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  submitButton: {
    marginBottom: 8,
  },
  bottomPadding: {
    height: 24,
  },
});

export default AddTransactionScreen;
