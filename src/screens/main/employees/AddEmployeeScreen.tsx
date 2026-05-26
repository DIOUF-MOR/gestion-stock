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
import { registerEmployee } from '../../../services/authService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

const ROLES = ['Gérant', 'Vendeur', 'Caissier', 'Magasinier', 'Livreur', 'Comptable', 'Agent de sécurité', 'Nettoyeur'];

// Roles that can have app access + their employeeRole key
const APP_ROLES: { label: string; key: string; icon: string }[] = [
  { label: 'Gérant',      key: 'gérant',     icon: 'briefcase-outline' },
  { label: 'Vendeur',     key: 'vendeur',    icon: 'cart-outline' },
  { label: 'Caissier',    key: 'caissier',   icon: 'cash-outline' },
  { label: 'Magasinier',  key: 'magasinier', icon: 'cube-outline' },
  { label: 'Comptable',   key: 'comptable',  icon: 'bar-chart-outline' },
];

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

  // App access
  const [enableAppAccess, setEnableAppAccess] = useState(false);
  const [appRole, setAppRole] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [appPasswordConfirm, setAppPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

    if (!isEditing && enableAppAccess) {
      if (!appRole) return Alert.alert('Erreur', 'Sélectionnez le rôle application.');
      if (!form.phone.trim()) return Alert.alert('Erreur', 'Le numéro de téléphone est requis pour l\'accès application.');
      if (appPassword.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      if (appPassword !== appPasswordConfirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
    }

    setLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await updateEmployee(storeId, editEmployee.id, form);
      } else {
        result = await addEmployee(storeId, form);
      }

      if (!result.success) {
        Alert.alert('Erreur', result.error);
        return;
      }

      // Create app account if requested (new employee only)
      if (!isEditing && enableAppAccess) {
        const authResult = await registerEmployee({
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: appPassword,
          storeId,
          employeeRole: appRole,
        });
        if (!authResult.success) {
          Alert.alert(
            'Employé créé',
            `L'employé a été ajouté mais la création du compte application a échoué : ${authResult.error}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
        // Store the auth UID on the HR record so vendor can reset password later
        if (result.id) {
          await updateEmployee(storeId, result.id, { userId: authResult.employeeId });
        }
      }

      navigation.goBack();
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
        subtitle={isEditing ? 'Mettre à jour le profil' : 'Ajouter à l\'équipe'}
        onBack={() => navigation.goBack()}
        accentColor={colors.secondary}
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

          {/* App access section — new employees only */}
          {!isEditing && (
            <View style={styles.section}>
              {/* Toggle button */}
              <TouchableOpacity
                style={[styles.accessToggle, enableAppAccess && styles.accessToggleActive]}
                onPress={() => setEnableAppAccess(!enableAppAccess)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, enableAppAccess && styles.checkboxActive]}>
                  {enableAppAccess && (
                    <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                  )}
                </View>
                <View style={styles.accessToggleInfo}>
                  <Text style={[styles.accessToggleTitle, enableAppAccess && styles.accessToggleTitleActive]}>
                    Accès à l'application
                  </Text>
                  <Text style={styles.accessToggleSub}>
                    {enableAppAccess
                      ? 'Cet employé pourra se connecter avec son téléphone'
                      : 'Appuyer pour activer la connexion'}
                  </Text>
                </View>
                <Ionicons
                  name={enableAppAccess ? 'phone-portrait' : 'phone-portrait-outline'}
                  size={22}
                  color={enableAppAccess ? colors.primary : colors.textDisabled}
                />
              </TouchableOpacity>

              {enableAppAccess && (
                <>
                  <Text style={styles.fieldLabel}>Rôle dans l'application :</Text>
                  <View style={styles.appRoleGrid}>
                    {APP_ROLES.map(({ label, key, icon }) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.appRoleCard, appRole === key && styles.appRoleCardActive]}
                        onPress={() => setAppRole(key)}
                      >
                        <Ionicons
                          name={icon as any}
                          size={20}
                          color={appRole === key ? colors.textInverse : colors.textSecondary}
                        />
                        <Text style={[styles.appRoleText, appRole === key && styles.appRoleTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {appRole ? (
                    <View style={styles.rolePermissionsBox}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.info} />
                      <Text style={styles.rolePermissionsText}>
                        {appRole === 'gérant' && 'Accès : ventes, stock, transactions, finances'}
                        {appRole === 'vendeur' && 'Accès : faire des ventes, consulter le stock'}
                        {appRole === 'caissier' && 'Accès : faire des ventes, consulter les transactions'}
                        {appRole === 'magasinier' && 'Accès : gérer le stock et les produits'}
                        {appRole === 'comptable' && 'Accès : transactions et finances uniquement'}
                      </Text>
                    </View>
                  ) : null}

                  <Input
                    label="Mot de passe *"
                    value={appPassword}
                    onChangeText={setAppPassword}
                    placeholder="Minimum 6 caractères"
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    }
                  />

                  <Input
                    label="Confirmer le mot de passe *"
                    value={appPasswordConfirm}
                    onChangeText={setAppPasswordConfirm}
                    placeholder="Répéter le mot de passe"
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                    rightIcon={
                      appPasswordConfirm.length > 0 ? (
                        <Ionicons
                          name={appPassword === appPasswordConfirm ? 'checkmark-circle' : 'close-circle'}
                          size={20}
                          color={appPassword === appPasswordConfirm ? colors.success : colors.error}
                        />
                      ) : undefined
                    }
                  />
                </>
              )}
            </View>
          )}

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
  // Access toggle button
  accessToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
  },
  accessToggleActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  accessToggleInfo: { flex: 1 },
  accessToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  accessToggleTitleActive: {
    color: colors.primary,
  },
  accessToggleSub: {
    fontSize: 12,
    color: colors.textDisabled,
    marginTop: 2,
  },
  appRoleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  appRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  appRoleCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  appRoleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  appRoleTextActive: { color: colors.textInverse },
  rolePermissionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: `${colors.info}12`,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  rolePermissionsText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});

export default AddEmployeeScreen;
