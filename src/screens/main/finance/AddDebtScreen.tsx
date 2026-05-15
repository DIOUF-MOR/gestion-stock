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
import { addDebt } from '../../../services/financeService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const AddDebtScreen = ({ navigation, route }) => {
  const { storeId, clients } = useStore();
  const initialClientId = route.params?.clientId;
  const initialClientName = route.params?.clientName;

  const [form, setForm] = useState({
    type: 'receivable',
    amount: '',
    description: '',
    clientId: initialClientId || '',
    clientName: initialClientName || '',
    supplierName: '',
    dueDate: '',
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
      newErrors.amount = 'Montant invalide';
    }
    if (form.type === 'receivable' && !form.clientName.trim()) {
      newErrors.clientName = 'Le nom du client est requis';
    }
    if (form.type === 'payable' && !form.supplierName.trim()) {
      newErrors.supplierName = 'Le nom du fournisseur est requis';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await addDebt(storeId, {
        ...form,
        amount: Number(form.amount),
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

  const isReceivable = form.type === 'receivable';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Nouvelle dette"
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
              style={[styles.typeTab, isReceivable && styles.typeTabReceivable]}
              onPress={() => updateField('type', 'receivable')}
            >
              <Ionicons
                name="arrow-down-circle"
                size={20}
                color={isReceivable ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.typeTabText, isReceivable && styles.typeTabTextActive]}>
                À recevoir (client doit)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeTab, !isReceivable && styles.typeTabPayable]}
              onPress={() => updateField('type', 'payable')}
            >
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={!isReceivable ? colors.textInverse : colors.textSecondary}
              />
              <Text style={[styles.typeTabText, !isReceivable && styles.typeTabTextActive]}>
                À payer (je dois)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Montant et description</Text>

            <Input
              label="Montant (FCFA) *"
              value={form.amount}
              onChangeText={(text) => updateField('amount', text)}
              placeholder="0"
              keyboardType="numeric"
              error={errors.amount}
              leftIcon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Description"
              value={form.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="ex: Crédit pour achat de vêtements"
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Date d'échéance (optionnel)"
              value={form.dueDate}
              onChangeText={(text) => updateField('dueDate', text)}
              placeholder="AAAA-MM-JJ"
              leftIcon={<Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isReceivable ? 'Client concerné' : 'Fournisseur concerné'}
            </Text>

            {isReceivable ? (
              <>
                <Input
                  label="Nom du client *"
                  value={form.clientName}
                  onChangeText={(text) => updateField('clientName', text)}
                  placeholder="Nom du client"
                  autoCapitalize="words"
                  error={errors.clientName}
                  leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                />

                {/* Quick select from clients list */}
                {clients.length > 0 && (
                  <>
                    <Text style={styles.fieldLabel}>Sélectionner un client:</Text>
                    <View style={styles.chipList}>
                      {clients.slice(0, 8).map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.chip,
                            form.clientId === c.id && styles.chipSelected,
                          ]}
                          onPress={() => {
                            updateField('clientId', c.id);
                            updateField('clientName', c.name);
                          }}
                        >
                          <Text style={[
                            styles.chipText,
                            form.clientId === c.id && styles.chipTextSelected,
                          ]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            ) : (
              <Input
                label="Nom du fournisseur *"
                value={form.supplierName}
                onChangeText={(text) => updateField('supplierName', text)}
                placeholder="Nom du fournisseur"
                autoCapitalize="words"
                error={errors.supplierName}
                leftIcon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
              />
            )}

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
            title="Enregistrer la dette"
            onPress={handleSubmit}
            loading={loading}
            style={[
              styles.submitButton,
              { backgroundColor: isReceivable ? colors.warning : colors.error },
            ]}
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
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 4,
  },
  typeTabReceivable: {
    backgroundColor: colors.warning,
    marginBottom: 0,
  },
  typeTabPayable: {
    backgroundColor: colors.error,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  typeTabTextActive: {
    color: colors.textInverse,
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
  chipSelected: {
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

export default AddDebtScreen;
