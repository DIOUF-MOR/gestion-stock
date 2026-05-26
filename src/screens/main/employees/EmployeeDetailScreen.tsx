import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { deleteEmployee, toggleEmployeeStatus, updateEmployee } from '../../../services/employeeService';
import { registerEmployee, resetEmployeePassword } from '../../../services/authService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';

moment.locale('fr');

const APP_ROLES: { label: string; key: string; icon: string; perms: string }[] = [
  { label: 'Gérant',     key: 'gérant',     icon: 'briefcase-outline',  perms: 'Ventes, stock, transactions, finances' },
  { label: 'Vendeur',    key: 'vendeur',    icon: 'cart-outline',       perms: 'Faire des ventes, consulter le stock' },
  { label: 'Caissier',   key: 'caissier',   icon: 'cash-outline',       perms: 'Faire des ventes, consulter les transactions' },
  { label: 'Magasinier', key: 'magasinier', icon: 'cube-outline',       perms: 'Gérer le stock et les produits' },
  { label: 'Comptable',  key: 'comptable',  icon: 'bar-chart-outline',  perms: 'Transactions et finances uniquement' },
];

const EmployeeDetailScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const [employee, setEmployee] = useState(route.params?.employee);

  // App access activation state
  const [showActivate, setShowActivate]     = useState(false);
  const [appRole, setAppRole]               = useState('');
  const [appPassword, setAppPassword]       = useState('');
  const [appPasswordConfirm, setAppPasswordConfirm] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [activating, setActivating]         = useState(false);

  // Password reset state
  const [showReset, setShowReset]           = useState(false);
  const [newPassword, setNewPassword]       = useState('');
  const [resetting, setResetting]           = useState(false);

  if (!employee) { navigation.goBack(); return null; }

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';
  const getInitials = (name: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const startDate   = employee.startDate
    ? moment(typeof employee.startDate === 'string' ? employee.startDate : employee.startDate)
    : null;
  const monthsWorked = startDate ? moment().diff(startDate, 'months') : 0;
  const isActive    = employee.isActive !== false;
  const hasAppAccess = !!employee.userId;
  const selectedRole = APP_ROLES.find((r) => r.key === appRole);

  // ── Handlers ────────────────────────────────────────────────────────

  const handleCall = () => {
    if (employee.phone) Linking.openURL(`tel:${employee.phone}`);
  };

  const handleToggleStatus = () => {
    const newStatus = !isActive;
    Alert.alert(
      newStatus ? 'Réactiver l\'employé' : 'Désactiver l\'employé',
      `Voulez-vous ${newStatus ? 'réactiver' : 'désactiver'} ${employee.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const result = await toggleEmployeeStatus(storeId, employee.id, newStatus);
            if (!result.success) Alert.alert('Erreur', result.error);
            else setEmployee((prev) => ({ ...prev, isActive: newStatus }));
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'employé',
      `Voulez-vous vraiment supprimer "${employee.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEmployee(storeId, employee.id);
            if (result.success) navigation.goBack();
            else Alert.alert('Erreur', result.error);
          },
        },
      ]
    );
  };

  const handleActivate = async () => {
    if (!appRole) return Alert.alert('Erreur', 'Sélectionnez le rôle application.');
    if (!employee.phone?.trim()) return Alert.alert('Erreur', 'Le numéro de téléphone est requis pour activer l\'accès.');
    if (appPassword.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
    if (appPassword !== appPasswordConfirm) return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');

    setActivating(true);
    try {
      const authResult = await registerEmployee({
        name: employee.name,
        phone: employee.phone,
        password: appPassword,
        storeId,
        employeeRole: appRole,
      });
      if (!authResult.success) {
        Alert.alert('Erreur', authResult.error);
        return;
      }
      await updateEmployee(storeId, employee.id, { userId: authResult.employeeId, employeeRole: appRole });
      setEmployee((prev) => ({ ...prev, userId: authResult.employeeId, employeeRole: appRole }));
      setShowActivate(false);
      setAppPassword('');
      setAppPasswordConfirm('');
      Alert.alert('Succès', `${employee.name} peut maintenant se connecter à l'application.`);
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setActivating(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
    setResetting(true);
    try {
      const result = await resetEmployeePassword(employee.userId, employee.phone, newPassword);
      if (!result.success) Alert.alert('Erreur', result.error);
      else {
        setShowReset(false);
        setNewPassword('');
        Alert.alert('Succès', 'Le mot de passe a été réinitialisé.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setResetting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Fiche employé"
        subtitle={employee?.name || ''}
        onBack={() => navigation.goBack()}
        accentColor={colors.secondary}
        showShadow
        rightActions={[{
          icon: 'create-outline',
          onPress: () => navigation.navigate('AddEmployee', { employee }),
          color: colors.primary,
        }]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar / name / role */}
        <View style={styles.employeeHeader}>
          <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
            <Text style={styles.avatarText}>{getInitials(employee.name)}</Text>
          </View>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{employee.role || 'Employé'}</Text>
          </View>
          {!isActive && (
            <View style={styles.inactiveBanner}>
              <Ionicons name="pause-circle" size={16} color={colors.textSecondary} />
              <Text style={styles.inactiveText}>Employé inactif</Text>
            </View>
          )}
          <View style={styles.quickActions}>
            {employee.phone && (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: `${colors.success}15` }]} onPress={handleCall}>
                <Ionicons name="call" size={22} color={colors.success} />
                <Text style={[styles.quickActionLabel, { color: colors.success }]}>Appeler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: isActive ? `${colors.warning}15` : `${colors.success}15` }]}
              onPress={handleToggleStatus}
            >
              <Ionicons
                name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={isActive ? colors.warning : colors.success}
              />
              <Text style={[styles.quickActionLabel, { color: isActive ? colors.warning : colors.success }]}>
                {isActive ? 'Désactiver' : 'Réactiver'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Infos */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          {employee.phone && <InfoRow icon="call-outline" label="Téléphone" value={employee.phone} />}
          {employee.email && <InfoRow icon="mail-outline" label="Email" value={employee.email} />}
          {employee.address && <InfoRow icon="location-outline" label="Adresse" value={employee.address} />}
          {startDate && <InfoRow icon="calendar-outline" label="Date d'embauche" value={startDate.format('D MMMM YYYY')} />}
          <InfoRow icon="time-outline" label="Ancienneté" value={`${monthsWorked} mois`} />
        </Card>

        {/* Salary */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Rémunération</Text>
          <View style={styles.salaryRow}>
            <View style={styles.salaryItem}>
              <Text style={styles.salaryAmount}>{fmt(employee.salary || 0)}</Text>
              <Text style={styles.salaryLabel}>Salaire mensuel</Text>
            </View>
            <View style={styles.salaryDivider} />
            <View style={styles.salaryItem}>
              <Text style={styles.salaryAmount}>{fmt((employee.salary || 0) * 12)}</Text>
              <Text style={styles.salaryLabel}>Coût annuel</Text>
            </View>
          </View>
        </Card>

        {/* Notes */}
        {employee.notes && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{employee.notes}</Text>
          </Card>
        )}

        {/* ── App access card ─────────────────────────────────────────── */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Accès application</Text>

          {hasAppAccess ? (
            /* ── Already has access ── */
            <>
              <View style={styles.accessActiveRow}>
                <View style={styles.accessActiveDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.accessActiveTitle}>Accès actif</Text>
                  {employee.employeeRole && (
                    <Text style={styles.accessActiveRole}>
                      Rôle : {APP_ROLES.find((r) => r.key === employee.employeeRole)?.label || employee.employeeRole}
                    </Text>
                  )}
                </View>
                <Ionicons name="phone-portrait" size={20} color={colors.success} />
              </View>

              {/* Reset password toggle */}
              <TouchableOpacity
                style={styles.resetToggleBtn}
                onPress={() => { setShowReset(!showReset); setNewPassword(''); }}
              >
                <Ionicons name="key-outline" size={16} color={colors.primary} />
                <Text style={styles.resetToggleText}>
                  {showReset ? 'Annuler' : 'Réinitialiser le mot de passe'}
                </Text>
              </TouchableOpacity>

              {showReset && (
                <View style={styles.resetForm}>
                  <Input
                    label="Nouveau mot de passe *"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 6 caractères"
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    }
                  />
                  <Button
                    title="Enregistrer le nouveau mot de passe"
                    onPress={handleResetPassword}
                    loading={resetting}
                    style={{ backgroundColor: colors.primary }}
                  />
                </View>
              )}
            </>
          ) : (
            /* ── No access yet ── */
            <>
              {/* Toggle button */}
              <TouchableOpacity
                style={[styles.accessToggle, showActivate && styles.accessToggleActive]}
                onPress={() => setShowActivate(!showActivate)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, showActivate && styles.checkboxActive]}>
                  {showActivate && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accessToggleTitle, showActivate && styles.accessToggleTitleActive]}>
                    Activer l'accès application
                  </Text>
                  <Text style={styles.accessToggleSub}>
                    {showActivate
                      ? 'Remplissez les champs ci-dessous'
                      : 'Cet employé ne peut pas encore se connecter'}
                  </Text>
                </View>
                <Ionicons
                  name={showActivate ? 'phone-portrait' : 'phone-portrait-outline'}
                  size={22}
                  color={showActivate ? colors.primary : colors.textDisabled}
                />
              </TouchableOpacity>

              {showActivate && (
                <>
                  {/* Role picker */}
                  <Text style={styles.fieldLabel}>Rôle dans l'application *</Text>
                  <View style={styles.appRoleGrid}>
                    {APP_ROLES.map(({ label, key, icon }) => (
                      <TouchableOpacity
                        key={key}
                        style={[styles.appRoleCard, appRole === key && styles.appRoleCardActive]}
                        onPress={() => setAppRole(key)}
                      >
                        <Ionicons name={icon as any} size={18} color={appRole === key ? colors.textInverse : colors.textSecondary} />
                        <Text style={[styles.appRoleText, appRole === key && styles.appRoleTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedRole && (
                    <View style={styles.rolePermBox}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.info} />
                      <Text style={styles.rolePermText}>{selectedRole.perms}</Text>
                    </View>
                  )}

                  {!employee.phone && (
                    <View style={styles.warningBox}>
                      <Ionicons name="warning-outline" size={14} color={colors.warning} />
                      <Text style={styles.warningText}>
                        Aucun numéro de téléphone enregistré. Modifiez la fiche d'abord.
                      </Text>
                    </View>
                  )}

                  <Input
                    label="Mot de passe *"
                    value={appPassword}
                    onChangeText={setAppPassword}
                    placeholder="Minimum 6 caractères"
                    secureTextEntry={!showPassword}
                    leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                    rightIcon={
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} />
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

                  <Button
                    title="Activer l'accès"
                    onPress={handleActivate}
                    loading={activating}
                    style={{ backgroundColor: colors.primary }}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* Bottom actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('AddEmployee', { employee })}
          >
            <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={infoRowStyles.container}>
    <Ionicons name={icon as any} size={18} color={colors.textSecondary} style={infoRowStyles.icon} />
    <View style={infoRowStyles.content}>
      <Text style={infoRowStyles.label}>{label}</Text>
      <Text style={infoRowStyles.value}>{value}</Text>
    </View>
  </View>
);

const infoRowStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  icon: { marginRight: 12, marginTop: 2, width: 24 },
  content: { flex: 1 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  value: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  employeeHeader: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: `${colors.accent}20`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  avatarInactive: { opacity: 0.5 },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.accent },
  employeeName: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  roleBadge: {
    backgroundColor: `${colors.accent}15`, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8,
  },
  roleText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  inactiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inactiveText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  quickAction: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 4 },
  quickActionLabel: { fontSize: 11, fontWeight: '600' },

  // Cards
  card: { marginBottom: 16, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
  salaryRow: { flexDirection: 'row', alignItems: 'center' },
  salaryItem: { flex: 1, alignItems: 'center' },
  salaryAmount: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  salaryLabel: { fontSize: 12, color: colors.textSecondary },
  salaryDivider: { width: 1, height: 50, backgroundColor: colors.divider, marginHorizontal: 16 },
  notesText: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },

  // App access — active state
  accessActiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: `${colors.success}10`,
    borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: `${colors.success}30`,
  },
  accessActiveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success,
  },
  accessActiveTitle: { fontSize: 14, fontWeight: '700', color: colors.success },
  accessActiveRole: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resetToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: `${colors.primary}40`,
    backgroundColor: `${colors.primary}08`,
  },
  resetToggleText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  resetForm: { marginTop: 14, gap: 4 },

  // App access — toggle / activate
  accessToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.background,
    borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    padding: 14, marginBottom: 16,
  },
  accessToggleActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  checkbox: {
    width: 26, height: 26, borderRadius: 8,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  accessToggleTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  accessToggleTitleActive: { color: colors.primary },
  accessToggleSub: { fontSize: 12, color: colors.textDisabled, marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  appRoleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  appRoleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  appRoleCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  appRoleText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  appRoleTextActive: { color: colors.textInverse },
  rolePermBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: `${colors.info}12`, borderRadius: 10,
    padding: 10, marginBottom: 12,
  },
  rolePermText: { flex: 1, fontSize: 12, color: colors.textPrimary, lineHeight: 18 },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: `${colors.warning}12`, borderRadius: 10,
    padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: `${colors.warning}30`,
  },
  warningText: { flex: 1, fontSize: 12, color: colors.warning, lineHeight: 18, fontWeight: '600' },

  // Bottom actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  editButton: { backgroundColor: colors.primary },
  deleteButton: { backgroundColor: colors.error },
  actionButtonText: { fontSize: 15, fontWeight: '700', color: colors.textInverse },
});

export default EmployeeDetailScreen;
