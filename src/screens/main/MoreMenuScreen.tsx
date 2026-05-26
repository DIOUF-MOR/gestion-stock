import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { useDelivery } from '../../context/DeliveryContext';

const MENU_ITEMS = [
  {
    key: 'employees',
    label: 'Équipe',
    description: 'Employés & salaires',
    icon: 'people',
    color: colors.secondary,
    screen: 'EmployeesMain',
  },
  {
    key: 'deliveries',
    label: 'Livraisons',
    description: 'Livraisons & livreurs',
    icon: 'bicycle',
    color: colors.accent,
    screen: 'DeliveriesMain',
  },
  {
    key: 'orders',
    label: 'Commandes',
    description: 'Commandes clients',
    icon: 'receipt',
    color: colors.primary,
    screen: 'OrdersMain',
  },
  {
    key: 'reports',
    label: 'Rapports',
    description: 'Exports & analyses',
    icon: 'document-text',
    color: colors.success,
    screen: 'ReportsMain',
  },
  {
    key: 'settings',
    label: 'Paramètres',
    description: 'Compte & abonnement',
    icon: 'settings',
    color: colors.textSecondary,
    screen: 'SettingsMain',
  },
];

const MoreMenuScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const { employees } = useStore();
  const { activeDeliveries } = useDelivery();

  const getBadge = (key: string): number => {
    if (key === 'deliveries') return activeDeliveries.length;
    return 0;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plus</Text>
        <Text style={styles.headerSubtitle}>
          {userProfile?.name?.split(' ')[0] || 'Vendeur'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Grid menu */}
        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => {
            const badge = getBadge(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.card}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={28} color={item.color} />
                  {badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    </View>
                  )}
                </View>

                {/* Label */}
                <Text style={styles.cardLabel}>{item.label}</Text>
                <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>

                {/* Arrow */}
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textDisabled}
                  style={styles.arrow}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{employees.length}</Text>
            <Text style={styles.statLabel}>Employé(s)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {activeDeliveries.length}
            </Text>
            <Text style={styles.statLabel}>Livraison(s) actives</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textInverse,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  arrow: {
    position: 'absolute',
    top: 18,
    right: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
});

export default MoreMenuScreen;
