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
import { addEmployee, updateEmployee } from '../../../services/employeeService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const ROLES = ['Gérant', 'Vendeur', 'Caissier', 'Magasinier', 'Livreur', 'Comptable', 'Agent de sécurité', 'Nettoyeur'];

const AddEmployeeScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const editEmployee = route.params?.employee;
  const isEditing = !!editEmployee;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
    salary: '',
    startDate: new Date().toISOString().split('T')[0],
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editEmployee) {
      setForm({
        name: editEmployee.name || '',
        phone: editEmployee.phone || '',
        email: editEmployee.email || '',
        role: editEmployee.role || '',
        salary: editEmployee.salary?.toString() || '',
        startDate: editEmployee.startDate
          ? (typeof editEmployee.startDate === 'string'
            ? editEmployee.startDate.split('T')[0]
            : new Date(editEmployee.startDate).toISOString().split('T')[0])
          : new Date().toISOString().split('T')[0],
        address: editEmployee.address || '',
        notes: editEmployee.notes || '',
      });
    }
  }, [editEmployee]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (form.salary && (isNaN(Number(form.salary)) || Number(form.salary) < 0)) {
      newErrors.salary = 'Salaire invalide';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await updateEmployee(storeId, editEmployee.id, form);
      } else {
        result = await addEmployee(storeId, form);
      }

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isEditing ? 'Modifier l\'employé' : 'Nouvel employé'}
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>

            <Input
              label="Nom complet *"
              value={form.name}
              onChangeText={(text) => updateField('name', text)}
              placeholder="Jean Dupont"
              autoCapitalize="words"
              error={errors.name}
              leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Téléphone"
              value={form.phone}
              onChangeText={(text) => updateField('phone', text)}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Email"
              value={form.email}
              onChangeText={(text) => updateField('email', text)}
              placeholder="jean@exemple.com"
              keyboardType="email-address"
              leftIcon={<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Adresse"
              value={form.address}
              onChangeText={(text) => updateField('address', text)}
              placeholder="Adresse de l'employé"
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="location-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations professionnelles</Text>

            <Input
              label="Poste / Rôle"
              value={form.role}
              onChangeText={(text) => updateField('role', text)}
              placeholder="ex: Vendeur"
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="briefcase-outline" size={20} color={colors.textSecondary} />}
            />

            <Text style={styles.fieldLabel}>Rôles suggérés:</Text>
            <View style={styles.chipList}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.chip,
                    form.role === role && styles.chipSelected,
                  ]}
                  onPress={() => updateField('role', role)}
                >
                  <Text style={[styles.chipText, form.role === role && styles.chipTextSelected]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Salaire mensuel (FCFA)"
              value={form.salary}
              onChangeText={(text) => updateField('salary', text)}
              placeholder="0"
              keyboardType="numeric"
              error={errors.salary}
              leftIcon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Date d'embauche"
              value={form.startDate}
              onChangeText={(text) => updateField('startDate', text)}
              placeholder="AAAA-MM-JJ"
              leftIcon={<Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />}
            />

            <Input
              label="Notes"
              value={form.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Notes sur cet employé..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          <Button
            title={isEditing ? 'Enregistrer les modifications' : 'Ajouter l\'employé'}
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
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  submitButton: {
    marginBottom: 8,
  },
  bottomPadding: {
    height: 24,
  },
});

export default AddEmployeeScreen;
