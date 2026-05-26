import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useStore } from '../../../context/StoreContext';
import { addTransaction, getTransactionCategories } from '../../../services/financeService';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Header from '../../../components/common/Header';

// ── Constants ──────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: { label: string; icon: string }[] = [
  { label: 'Espèces',        icon: 'cash-outline' },
  { label: 'Mobile Money',   icon: 'phone-portrait-outline' },
  { label: 'Virement',       icon: 'swap-horizontal-outline' },
  { label: 'Chèque',         icon: 'document-outline' },
  { label: 'Carte bancaire', icon: 'card-outline' },
];

const CATEGORY_ICONS: Record<string, string> = {
  'Vente de produits':     'cart-outline',
  'Prestation de service': 'construct-outline',
  'Remboursement':         'return-down-back-outline',
  'Autre revenu':          'add-circle-outline',
  'Achat de stock':        'cube-outline',
  'Salaires':              'people-outline',
  'Loyer':                 'home-outline',
  'Électricité/Eau':       'flash-outline',
  'Transport':             'car-outline',
  'Marketing':             'megaphone-outline',
  'Entretien':             'hammer-outline',
  'Taxes':                 'receipt-outline',
  'Autre dépense':         'remove-circle-outline',
};

const AMOUNT_CHIPS = [1000, 2000, 5000, 10000, 25000, 50000];

// ── Date helpers ───────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split('T')[0];

const isoToDisplay = (iso: string) => {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const displayToISO = (display: string): string | null => {
  const parts = display.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2020) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';

// ── Component ──────────────────────────────────────────────────────────────────

const AddTransactionScreen = ({ navigation, route }) => {
  const { storeId } = useStore();
  const initialType = route.params?.type || 'revenue';
  const categories = getTransactionCategories();

  const [type, setType]             = useState<'revenue' | 'expense'>(initialType);
  const [amount, setAmount]         = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Espèces');
  const [displayDate, setDisplayDate] = useState(isoToDisplay(todayISO()));
  const [notes, setNotes]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [saved, setSaved]           = useState(false);
  const scaleAnim = useState(new Animated.Value(0))[0];

  // Reset category when type changes
  useEffect(() => { setCategory(''); }, [type]);

  useEffect(() => {
    if (saved) {
      Animated.spring(scaleAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 8,
      }).start();
      const t = setTimeout(() => navigation.goBack(), 1600);
      return () => clearTimeout(t);
    }
  }, [saved]);

  // ── Derived ────────────────────────────────────────────────────────
  const isRevenue   = type === 'revenue';
  const accentColor = isRevenue ? colors.success : colors.error;
  const amountNum   = Number(amount) || 0;
  const isoDate     = displayToISO(displayDate);
  const dateValid   = !displayDate || !!isoDate;
  const currentCategories = categories[type] || [];

  const summaryReady = useMemo(
    () => amountNum > 0 && (description.trim() || category),
    [amountNum, description, category]
  );

  // ── Handlers ───────────────────────────────────────────────────────

  const clearError = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  const applyAmountChip = (val: number) => {
    setAmount(prev => String((Number(prev) || 0) + val));
    clearError('amount');
  };

  const handleDateChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    let f = digits;
    if (digits.length > 2) f = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) f = f.slice(0, 5) + '/' + digits.slice(4, 8);
    setDisplayDate(f);
    clearError('date');
  };

  const setDateToday = () => setDisplayDate(isoToDisplay(todayISO()));
  const setDateYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDisplayDate(isoToDisplay(d.toISOString().split('T')[0]));
  };

  // ── Validation ─────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {};
    if (!amount) {
      e.amount = 'Le montant est requis';
    } else if (isNaN(Number(amount)) || Number(amount) <= 0) {
      e.amount = 'Montant invalide (doit être positif)';
    }
    if (!description.trim() && !category) {
      e.description = 'La description ou la catégorie est requise';
    }
    if (displayDate && !isoDate) {
      e.date = 'Date invalide (format JJ/MM/AAAA)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await addTransaction(storeId, {
        type,
        amount: Number(amount),
        description: description.trim() || category,
        category,
        paymentMethod,
        date: isoDate || todayISO(),
        notes: notes.trim(),
      });
      if (result.success) {
        setSaved(true);
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isRevenue ? 'Nouveau revenu' : 'Nouvelle dépense'}
        subtitle={isRevenue ? 'Enregistrer un encaissement' : 'Enregistrer une sortie de caisse'}
        onBack={() => navigation.goBack()}
        accentColor={isRevenue ? colors.success : colors.error}
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
              style={[styles.typeTab, isRevenue && styles.typeTabRevenue]}
              onPress={() => setType('revenue')}
            >
              <Ionicons name="trending-up" size={20} color={isRevenue ? colors.textInverse : colors.textSecondary} />
              <View>
                <Text style={[styles.typeTabText, isRevenue && styles.typeTabTextActive]}>Revenu</Text>
                <Text style={[styles.typeTabSub, isRevenue && styles.typeTabSubActive]}>Argent entrant</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeTab, !isRevenue && styles.typeTabExpense]}
              onPress={() => setType('expense')}
            >
              <Ionicons name="trending-down" size={20} color={!isRevenue ? colors.textInverse : colors.textSecondary} />
              <View>
                <Text style={[styles.typeTabText, !isRevenue && styles.typeTabTextActive]}>Dépense</Text>
                <Text style={[styles.typeTabSub, !isRevenue && styles.typeTabSubActive]}>Argent sortant</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Montant ── */}
          <View style={[styles.section, styles.amountSection, { borderColor: `${accentColor}50` }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={18} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: accentColor }]}>Montant</Text>
            </View>

            {/* Quick amount chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {AMOUNT_CHIPS.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.amountChip, { borderColor: accentColor }]}
                  onPress={() => applyAmountChip(val)}
                >
                  <Text style={[styles.amountChipText, { color: accentColor }]}>
                    +{val >= 1000 ? (val / 1000) + 'k' : val}
                  </Text>
                </TouchableOpacity>
              ))}
              {amountNum > 0 && (
                <TouchableOpacity
                  style={styles.amountChipClear}
                  onPress={() => { setAmount(''); clearError('amount'); }}
                >
                  <Ionicons name="close" size={13} color={colors.textSecondary} />
                  <Text style={styles.amountChipClearText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Big amount input */}
            <View style={[styles.amountInputWrapper, { borderColor: errors.amount ? colors.error : `${accentColor}40` }]}>
              <Text style={[styles.amountSign, { color: accentColor }]}>
                {isRevenue ? '+' : '-'}
              </Text>
              <TextInput
                style={[styles.amountInput, { color: accentColor }]}
                value={amount}
                onChangeText={(t) => { setAmount(t.replace(/\D/g, '')); clearError('amount'); }}
                placeholder="0"
                placeholderTextColor={`${accentColor}40`}
                keyboardType="numeric"
              />
              <Text style={[styles.amountCurrency, { color: `${accentColor}80` }]}>FCFA</Text>
            </View>
            {errors.amount ? (
              <Text style={styles.fieldError}>{errors.amount}</Text>
            ) : amountNum > 0 ? (
              <View style={[styles.amountPreview, { backgroundColor: `${accentColor}10` }]}>
                <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                <Text style={[styles.amountPreviewText, { color: accentColor }]}>{fmt(amountNum)}</Text>
              </View>
            ) : null}
          </View>

          {/* ── Détails ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Détails</Text>
            </View>

            {/* Category chips */}
            <Text style={styles.fieldLabel}>Catégorie</Text>
            <View style={styles.categoryGrid}>
              {currentCategories.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      selected && { backgroundColor: accentColor, borderColor: accentColor },
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      if (!description.trim()) clearError('description');
                    }}
                  >
                    <Ionicons
                      name={(CATEGORY_ICONS[cat] || 'ellipse-outline') as any}
                      size={14}
                      color={selected ? colors.textInverse : colors.textSecondary}
                    />
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Description"
              value={description}
              onChangeText={(t) => { setDescription(t); clearError('description'); }}
              placeholder={category ? `Précisions sur "${category}"…` : 'ex: Vente de produits alimentaires'}
              autoCapitalize="sentences"
              error={errors.description}
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          {/* ── Date ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Date</Text>
            </View>

            {/* Quick date shortcuts */}
            <View style={styles.dateShortcuts}>
              <TouchableOpacity style={styles.dateShortcutBtn} onPress={setDateToday}>
                <Ionicons name="today-outline" size={14} color={colors.primary} />
                <Text style={styles.dateShortcutText}>Aujourd'hui</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateShortcutBtn} onPress={setDateYesterday}>
                <Ionicons name="arrow-back-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.dateShortcutText}>Hier</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateInputWrapper, !dateValid && styles.dateInputWrapperError]}>
              <Ionicons name="calendar-outline" size={18} color={errors.date ? colors.error : colors.textSecondary} />
              <TextInput
                style={styles.dateInput}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textDisabled}
                value={displayDate}
                onChangeText={handleDateChange}
                keyboardType="numeric"
                maxLength={10}
              />
              {displayDate ? (
                <TouchableOpacity onPress={() => setDisplayDate('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
            {errors.date ? (
              <Text style={styles.fieldError}>{errors.date}</Text>
            ) : isoDate ? (
              <Text style={styles.datePreview}>
                {new Date(isoDate + 'T12:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            ) : null}
          </View>

          {/* ── Paiement ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Mode de paiement</Text>
            </View>

            <View style={styles.paymentGrid}>
              {PAYMENT_METHODS.map(({ label, icon }) => {
                const selected = paymentMethod === label;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.paymentBtn, selected && styles.paymentBtnActive]}
                    onPress={() => setPaymentMethod(label)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={18}
                      color={selected ? colors.textInverse : colors.textSecondary}
                    />
                    <Text style={[styles.paymentBtnText, selected && styles.paymentBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Notes (optionnel)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Informations complémentaires..."
              multiline
              numberOfLines={3}
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />}
            />
          </View>

          {/* ── Récapitulatif ── */}
          {summaryReady && (
            <View style={[styles.summaryCard, { borderColor: `${accentColor}40` }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="checkmark-circle" size={17} color={accentColor} />
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <View style={[styles.summaryTypeBadge, { backgroundColor: `${accentColor}15` }]}>
                  <Text style={[styles.summaryTypeText, { color: accentColor }]}>
                    {isRevenue ? '↑ Revenu' : '↓ Dépense'}
                  </Text>
                </View>
              </View>

              {(category || description.trim()) ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {category ? 'Catégorie' : 'Description'}
                  </Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {category || description.trim()}
                  </Text>
                </View>
              ) : null}

              {category && description.trim() ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Description</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{description.trim()}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Mode</Text>
                <View style={styles.summaryPaymentRow}>
                  <Ionicons
                    name={(PAYMENT_METHODS.find(p => p.label === paymentMethod)?.icon || 'cash-outline') as any}
                    size={13}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.summaryValue}>{paymentMethod}</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>
                  {isoDate
                    ? new Date(isoDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "Aujourd'hui"}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryRowLast]}>
                <Text style={styles.summaryLabel}>Montant</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>
                  {isRevenue ? '+' : '-'}{fmt(amountNum)}
                </Text>
              </View>
            </View>
          )}

          <Button
            title={isRevenue ? 'Enregistrer le revenu' : 'Enregistrer la dépense'}
            onPress={handleSubmit}
            loading={loading}
            style={[styles.submitButton, { backgroundColor: accentColor }]}
          />

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Success overlay ── */}
      {saved && (
        <View style={styles.overlay}>
          <Animated.View style={[styles.overlayCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.overlayIcon, { backgroundColor: accentColor }]}>
              <Ionicons name="checkmark" size={40} color={colors.textInverse} />
            </View>
            <Text style={styles.overlayTitle}>
              {isRevenue ? 'Revenu enregistré !' : 'Dépense enregistrée !'}
            </Text>
            <Text style={[styles.overlayAmount, { color: accentColor }]}>
              {isRevenue ? '+' : '-'}{fmt(amountNum)}
            </Text>
            <Text style={styles.overlayHint}>Retour automatique…</Text>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  typeTabRevenue: { backgroundColor: colors.success },
  typeTabExpense: { backgroundColor: colors.error },
  typeTabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  typeTabTextActive: { color: colors.textInverse },
  typeTabSub: { fontSize: 10, color: colors.textDisabled, marginTop: 1 },
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
  amountSection: {
    borderWidth: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },

  // Amount chips
  chipsRow: { gap: 8, marginBottom: 12, paddingBottom: 2 },
  amountChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
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

  // Amount input
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  amountSign: { fontSize: 28, fontWeight: '800', lineHeight: 40 },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
  },
  amountCurrency: { fontSize: 14, fontWeight: '600', alignSelf: 'flex-end', paddingBottom: 4 },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
  },
  amountPreviewText: { fontSize: 14, fontWeight: '800' },
  fieldError: { fontSize: 12, color: colors.error, marginTop: 6, fontWeight: '500' },

  // Category
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  categoryChipTextActive: { color: colors.textInverse, fontWeight: '700' },

  // Date
  dateShortcuts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dateShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  dateShortcutText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
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
  datePreview: { fontSize: 12, color: colors.success, marginTop: 7, fontWeight: '600' },

  // Payment methods
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  paymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceVariant,
  },
  paymentBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  paymentBtnTextActive: { color: colors.textInverse },

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
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  summaryTypeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  summaryTypeText: { fontSize: 12, fontWeight: '700' },
  summaryPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  summaryAmount: { fontSize: 18, fontWeight: '800' },

  // Submit
  submitButton: { marginBottom: 8 },

  // Success overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  overlayCard: {
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
  overlayIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  overlayAmount: { fontSize: 26, fontWeight: '800', marginBottom: 10 },
  overlayHint: { fontSize: 13, color: colors.textDisabled },
});

export default AddTransactionScreen;
