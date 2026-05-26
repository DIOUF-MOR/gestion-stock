import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import Header from '../../../components/common/Header';
import Card from '../../../components/common/Card';
import {
  generateStockReport,
  generateFinancialReport,
  generateClientReport,
  generateEmployeeReport,
} from '../../../services/pdfService';
// Data comes from StoreContext (real-time cached)

moment.locale('fr');

const PERIODS = [
  { label: 'Cette semaine', value: 'week' },
  { label: 'Ce mois', value: 'month' },
  { label: 'Cette année', value: 'year' },
  { label: '3 derniers mois', value: '3months' },
  { label: '6 derniers mois', value: '6months' },
];

const getPeriodDates = (period) => {
  const now = new Date();
  let start, end;
  end = now;

  switch (period) {
    case 'week':
      start = moment().startOf('week').toDate();
      break;
    case 'month':
      start = moment().startOf('month').toDate();
      break;
    case 'year':
      start = moment().startOf('year').toDate();
      break;
    case '3months':
      start = moment().subtract(3, 'months').startOf('day').toDate();
      break;
    case '6months':
      start = moment().subtract(6, 'months').startOf('day').toDate();
      break;
    default:
      start = moment().startOf('month').toDate();
  }
  return { start, end };
};

const getPeriodLabel = (period) => {
  const found = PERIODS.find(p => p.value === period);
  return found ? found.label : 'Ce mois';
};

const ReportCard = ({ icon, iconBg, title, description, onPress, loading }) => (
  <Card style={styles.reportCard} onPress={!loading ? onPress : undefined}>
    <View style={styles.reportCardInner}>
      <View style={[styles.reportIconContainer, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <Ionicons name={icon} size={26} color={colors.textInverse} />
        )}
      </View>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportDescription}>{description}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={loading ? colors.textDisabled : colors.textSecondary}
      />
    </View>
  </Card>
);

const ReportsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { products, clients, employees, transactions, debts } = useStore();
  const [loadingType, setLoadingType] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const storeName = userProfile?.storeName || userProfile?.name || 'Ma Boutique';

  const handleStockReport = async () => {
    setLoadingType('stock');
    try {
      const pdfResult = await generateStockReport(products, storeName);
      if (!pdfResult.success) throw new Error(pdfResult.error);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de générer le rapport');
    } finally {
      setLoadingType(null);
    }
  };

  const handleFinancialReport = async () => {
    setLoadingType('finance');
    try {
      const { start, end } = getPeriodDates(selectedPeriod);
      const filtered = transactions.filter(t => {
        const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
        return d >= start && d <= end;
      });
      const periodLabel = `Période: ${moment(start).format('DD/MM/YYYY')} – ${moment(end).format('DD/MM/YYYY')}`;
      const pdfResult = await generateFinancialReport(filtered, debts, periodLabel, storeName);
      if (!pdfResult.success) throw new Error(pdfResult.error);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de générer le rapport');
    } finally {
      setLoadingType(null);
    }
  };

  const handleClientReport = async () => {
    setLoadingType('clients');
    try {
      const pdfResult = await generateClientReport(clients, storeName);
      if (!pdfResult.success) throw new Error(pdfResult.error);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de générer le rapport');
    } finally {
      setLoadingType(null);
    }
  };

  const handleEmployeeReport = async () => {
    setLoadingType('employees');
    try {
      const pdfResult = await generateEmployeeReport(employees, storeName);
      if (!pdfResult.success) throw new Error(pdfResult.error);
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de générer le rapport');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Rapports PDF"
        subtitle="Générer et partager des rapports"
        onBack={() => navigation.goBack()}
        accentColor={colors.primary}
        showShadow
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={styles.infoBannerText}>
            Les rapports sont générés au format PDF et peuvent être partagés par email, WhatsApp, etc.
          </Text>
        </View>

        {/* Stock Report */}
        <Text style={styles.sectionTitle}>Inventaire</Text>
        <ReportCard
          icon="cube-outline"
          iconBg={colors.primary}
          title="Rapport de Stock"
          description="Inventaire complet avec valeurs, catégories et alertes de stock bas"
          onPress={handleStockReport}
          loading={loadingType === 'stock'}
        />

        {/* Financial Report */}
        <Text style={styles.sectionTitle}>Finances</Text>

        {/* Period selector */}
        <TouchableOpacity
          style={styles.periodSelector}
          onPress={() => setShowPeriodModal(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={styles.periodLabel}>Période: {getPeriodLabel(selectedPeriod)}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>

        <ReportCard
          icon="bar-chart-outline"
          iconBg={colors.success}
          title="Rapport Financier"
          description={`Revenus, dépenses et bénéfices – ${getPeriodLabel(selectedPeriod).toLowerCase()}`}
          onPress={handleFinancialReport}
          loading={loadingType === 'finance'}
        />

        {/* Clients Report */}
        <Text style={styles.sectionTitle}>Clients</Text>
        <ReportCard
          icon="people-outline"
          iconBg={colors.secondary}
          title="Rapport Clients"
          description="Liste complète des clients avec leurs dettes en cours"
          onPress={handleClientReport}
          loading={loadingType === 'clients'}
        />

        {/* Employees Report */}
        <Text style={styles.sectionTitle}>Équipe</Text>
        <ReportCard
          icon="person-outline"
          iconBg={colors.accent}
          title="Rapport Employés"
          description="Liste des employés avec postes, salaires et masse salariale totale"
          onPress={handleEmployeeReport}
          loading={loadingType === 'employees'}
        />

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Period selection modal */}
      <Modal
        visible={showPeriodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sélectionner la période</Text>
            {PERIODS.map(period => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodOption,
                  selectedPeriod === period.value && styles.periodOptionSelected,
                ]}
                onPress={() => {
                  setSelectedPeriod(period.value);
                  setShowPeriodModal(false);
                }}
              >
                <Text
                  style={[
                    styles.periodOptionText,
                    selectedPeriod === period.value && styles.periodOptionTextSelected,
                  ]}
                >
                  {period.label}
                </Text>
                {selectedPeriod === period.value && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoBackground,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.info,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  reportCard: {
    marginBottom: 14,
    padding: 16,
  },
  reportCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reportIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 3,
  },
  reportDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}12`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  periodLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomPadding: {
    height: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  periodOptionSelected: {
    backgroundColor: `${colors.primary}12`,
  },
  periodOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  periodOptionTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default ReportsScreen;
