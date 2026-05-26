import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { addDebt } from '../../../services/financeService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';
import ClientPickerField from '../../../components/common/ClientPickerField';

// ── Quick date shortcuts ───────────────────────────────────────────
const DATE_SHORTCUTS = [
  { label: '7j',   days: 7 },
  { label: '15j',  days: 15 },
  { label: '1 mois', days: 30 },
  { label: '3 mois', days: 90 },
  { label: '6 mois', days: 180 },
];

// ── Quick amount chips ─────────────────────────────────────────────
const AMOUNT_CHIPS = [1000, 2000, 5000, 10000, 25000, 50000];

const toDateString = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/** Parse JJ/MM/AAAA → Date | null */
const parseLocalDate = (str: string): Date | null => {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2020) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (isNaN(d.getTime())) return null;
  return d;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

const AddDebtScreen = ({ navigation, route }) => {
  const { storeId, clients } = useStore();
  const initialClientId   = route.params?.clientId;
  const initialClientName = route.params?.clientName;

  const [form, setForm] = useState({
    type: 'receivable' as 'receivable' | 'payable',
    amount: '',
    description: '',
    clientId: initialClientId || '',
    clientName: initialClientName || '',
    supplierName: '',
    dueDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [selectedClientObj, setSelectedClientObj] = useState<any>(
    initialClientId ? clients.find((c) => c.id === initialClientId) || null : null
  );

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // ── Auto-format date input (JJ/MM/AAAA) ───────────────────────────
  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '/' + digits.slice(4, 8);
    updateField('dueDate', formatted);
  };

  const applyShortcut = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    updateField('dueDate', toDateString(d));
  };

  const clearDate = () => updateField('dueDate', '');

  // ── Amount chips ───────────────────────────────────────────────────
  const applyAmountChip = (value: number) => {
    const current = Number(form.amount) || 0;
    updateField('amount', String(current + value));
  };

  // ── Client picker ──────────────────────────────────────────────────
  const handleClientSelect = (client: any | null) => {
    setSelectedClientObj(client);
    if (client) {
      setForm(prev => ({ ...prev, clientId: client.id, clientName: client.name }));
      setErrors(prev => ({ ...prev, clientName: '' }));
    } else {
      setForm(prev => ({ ...prev, clientId: '', clientName: '' }));
    }
  };

  // ── Derived ────────────────────────────────────────────────────────
  const isReceivable = form.type === 'receivable';
  const parsedDate   = parseLocalDate(form.dueDate);
  const dueDateValid = !form.dueDate || !!parsedDate;
  const isPastDate   = parsedDate && parsedDate < new Date();
  const amountNum    = Number(form.amount) || 0;

  const summaryReady = useMemo(() => {
    const hasAmount = amountNum > 0;
    const hasParty  = isReceivable ? !!form.clientName.trim() : !!form.supplierName.trim();
    return hasAmount && hasParty;
  }, [amountNum, isReceivable, form.clientName, form.supplierName]);

  // ── Validate ──────────────────────────────────────────────────────
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.amount) {
      newErrors.amount = 'Le montant est requis';
    } else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      newErrors.amount = 'Montant invalide';
    }
    if (isReceivable && !form.clientName.trim()) {
      newErrors.clientName = 'Le nom du client est requis';
    }
    if (!isReceivable && !form.supplierName.trim()) {
      newErrors.supplierName = 'Le nom du fournisseur est requis';
    }
    if (form.dueDate && !parseLocalDate(form.dueDate)) {
      newErrors.dueDate = 'Date invalide (format JJ/MM/AAAA)';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const parsedDueDate = parseLocalDate(form.dueDate);
      const result = await addDebt(storeId, {
        ...form,
        amount: Number(form.amount),
        dueDate: parsedDueDate ? parsedDueDate.toISOString().split('T')[0] : '',
      });
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isReceivable ? 'Crédit client' : 'Dette fournisseur'}
        subtitle={isReceivable ? 'Argent à recevoir d\'un client' : 'Argent que vous devez payer'}
        onBack={() => navigation.goBack()}
        accentColor={isReceivable ? colors.warning : colors.error}
        showShadow
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Type selector ── */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeTab, isReceivable && styles.typeTabReceivable]}
              onPress={() => updateField('type', 'receivable')}
            >
              <Ionicons name="arrow-down-circle" size={20} color={isReceivable ? colors.textInverse : colors.textSecondary} />
              <Text style={[styles.typeTabText, isReceivable && styles.typeTabTextActive]}>À recevoir</Text>
              <Text style={[styles.typeTabSub, isReceivable && styles.typeTabSubActive]}>Le client vous doit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeTab, !isReceivable && styles.typeTabPayable]}
              onPress={() => updateField('type', 'payable')}
            >
              <Ionicons name="arrow-up-circle" size={20} color={!isReceivable ? colors.textInverse : colors.textSecondary} />
              <Text style={[styles.typeTabText, !isReceivable && styles.typeTabTextActive]}>À payer</Text>
              <Text style={[styles.typeTabSub, !isReceivable && styles.typeTabSubActive]}>Vous devez payer</Text>
            </TouchableOpacity>
          </View>

          {/* ── Montant ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={18} color={isReceivable ? colors.warning : colors.error} />
              <Text style={styles.sectionTitle}>Montant</Text>
            </View>

            {/* Amount chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {AMOUNT_CHIPS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.amountChip, { borderColor: isReceivable ? colors.warning : colors.error }]}
                  onPress={() => applyAmountChip(val)}
                >
                  <Text style={[styles.amountChipText, { color: isReceivable ? colors.warning : colors.error }]}>
                    +{val >= 1000 ? (val / 1000) + 'k' : val}
                  </Text>
                </TouchableOpacity>
              ))}
              {amountNum > 0 && (
                <TouchableOpacity
                  style={styles.amountChipClear}
                  onPress={() => updateField('amount', '')}
                >
                  <Ionicons name="close" size={13} color={colors.textSecondary} />
                  <Text style={styles.amountChipClearText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Amount input + preview */}
            <Input
              label="Montant (FCFA) *"
              value={form.amount}
              onChangeText={(t) => updateField('amount', t.replace(/\D/g, ''))}
              placeholder="0"
              keyboardType="numeric"
              error={errors.amount}
              leftIcon={<Ionicons name="cash-outline" size={20} color={colors.textSecondary} />}
            />
            {amountNum > 0 && (
              <View style={[styles.amountPreview, { backgroundColor: isReceivable ? `${colors.warning}12` : `${colors.error}12` }]}>
                <Ionicons name="checkmark-circle" size={15} color={isReceivable ? colors.warning : colors.error} />
                <Text style={[styles.amountPreviewText, { color: isReceivable ? colors.warning : colors.error }]}>
                  {fmt(amountNum)}
                </Text>
              </View>
            )}

            <Input
              label="Description"
              value={form.description}
              onChangeText={(t) => updateField('description', t)}
              placeholder={isReceivable ? 'ex : Crédit tissu wax, achat chaussures…' : 'ex : Achat marchandise, loyer…'}
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          {/* ── Échéance ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Échéance <Text style={styles.optional}>(optionnel)</Text></Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {DATE_SHORTCUTS.map((s) => (
                <TouchableOpacity key={s.days} style={styles.dateChip} onPress={() => applyShortcut(s.days)}>
                  <Text style={styles.dateChipText}>+{s.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[styles.dateInputWrapper, !dueDateValid && styles.dateInputWrapperError]}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={errors.dueDate ? colors.error : colors.textSecondary}
              />
              <TextInput
                style={styles.dateInput}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textDisabled}
                value={form.dueDate}
                onChangeText={handleDateChange}
                keyboardType="numeric"
                maxLength={10}
              />
              {form.dueDate ? (
                <TouchableOpacity onPress={clearDate}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {errors.dueDate ? (
              <Text style={styles.fieldError}>{errors.dueDate}</Text>
            ) : parsedDate ? (
              isPastDate ? (
                <View style={styles.pastDateWarning}>
                  <Ionicons name="warning-outline" size={14} color={colors.warning} />
                  <Text style={styles.pastDateWarningText}>
                    Cette date est déjà dépassée ({parsedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})
                  </Text>
                </View>
              ) : (
                <Text style={styles.datePreview}>
                  Échéance : {parsedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              )
            ) : null}
          </View>

          {/* ── Partie concernée ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={isReceivable ? 'person-outline' : 'business-outline'} size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {isReceivable ? 'Client concerné' : 'Fournisseur concerné'}
              </Text>
            </View>

            {isReceivable ? (
              <>
                {clients.length > 0 && (
                  <ClientPickerField
                    clients={clients}
                    selectedClient={selectedClientObj}
                    onSelect={handleClientSelect}
                    onClear={() => handleClientSelect(null)}
                    placeholder="Choisir un client enregistré"
                    label="Client enregistré"
                  />
                )}

                {/* Show manual input only when no client selected from picker */}
                {!selectedClientObj && (
                  <Input
                    label={clients.length > 0 ? 'Ou saisir un nom manuellement *' : 'Nom du client *'}
                    value={form.clientName}
                    onChangeText={(t) => updateField('clientName', t)}
                    placeholder="Nom du client"
                    autoCapitalize="words"
                    error={errors.clientName}
                    leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                  />
                )}

                {selectedClientObj && errors.clientName ? (
                  <Text style={styles.fieldError}>{errors.clientName}</Text>
                ) : null}
              </>
            ) : (
              <Input
                label="Nom du fournisseur *"
                value={form.supplierName}
                onChangeText={(t) => updateField('supplierName', t)}
                placeholder="Nom du fournisseur"
                autoCapitalize="words"
                error={errors.supplierName}
                leftIcon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
              />
            )}

            <Input
              label="Notes (optionnel)"
              value={form.notes}
              onChangeText={(t) => updateField('notes', t)}
              placeholder="Informations complémentaires..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          {/* ── Récapitulatif ── */}
          {summaryReady && (
            <View style={[styles.summaryCard, { borderColor: isReceivable ? `${colors.warning}40` : `${colors.error}40` }]}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={isReceivable ? colors.warning : colors.error}
                />
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <View style={[styles.summaryTypeBadge, { backgroundColor: isReceivable ? `${colors.warning}15` : `${colors.error}15` }]}>
                  <Text style={[styles.summaryTypeText, { color: isReceivable ? colors.warning : colors.error }]}>
                    {isReceivable ? '↙ À recevoir' : '↗ À payer'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {isReceivable ? 'Client' : 'Fournisseur'}
                </Text>
                <Text style={styles.summaryValue}>
                  {isReceivable ? form.clientName : form.supplierName}
                </Text>
              </View>

              {form.description ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Description</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{form.description}</Text>
                </View>
              ) : null}

              {parsedDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Échéance</Text>
                  <Text style={[styles.summaryValue, isPastDate && { color: colors.warning }]}>
                    {parsedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {isPastDate ? ' ⚠' : ''}
                  </Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>Montant</Text>
                <Text style={[styles.summaryAmount, { color: isReceivable ? colors.warning : colors.error }]}>
                  {fmt(amountNum)}
                </Text>
              </View>
            </View>
          )}

          <Button
            title={isReceivable ? 'Enregistrer le crédit' : 'Enregistrer la dette'}
            onPress={handleSubmit}
            loading={loading}
            style={[styles.submitButton, { backgroundColor: isReceivable ? colors.warning : colors.error }]}
          />
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Type selector
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  typeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 4,
  },
  typeTabReceivable: { backgroundColor: colors.warning },
  typeTabPayable: { backgroundColor: colors.error },
  typeTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  typeTabTextActive: { color: colors.textInverse },
  typeTabSub: { fontSize: 10, color: colors.textDisabled },
  typeTabSubActive: { color: 'rgba(255,255,255,0.75)' },

  // Section
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  optional: { fontSize: 12, fontWeight: '400', color: colors.textSecondary },

  // Amount chips
  chipsRow: { gap: 8, marginBottom: 12, paddingBottom: 2 },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  amountChipText: { fontSize: 12, fontWeight: '700' },
  amountChipClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  amountChipClearText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: -6,
    marginBottom: 10,
  },
  amountPreviewText: { fontSize: 15, fontWeight: '800' },

  // Date
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  dateChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  dateInputWrapperError: { borderColor: colors.error },
  dateInput: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 6, fontWeight: '500' },
  datePreview: { fontSize: 12, color: colors.success, marginTop: 7, fontWeight: '600' },
  pastDateWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    backgroundColor: `${colors.warning}12`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  pastDateWarningText: { fontSize: 12, color: colors.warning, fontWeight: '600', flex: 1 },

  // Summary card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryRowLast: { borderBottomWidth: 0, paddingBottom: 0, paddingTop: 12 },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  summaryTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryTypeText: { fontSize: 12, fontWeight: '700' },
  summaryAmount: { fontSize: 18, fontWeight: '800' },

  submitButton: { marginBottom: 8 },
});

export default AddDebtScreen;
