import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/fr';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { logoutUser } from '../../../services/authService';
import Header from '../../../components/common/Header';

moment.locale('fr');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const PLAN_META: Record<string, { label: string; color: string; icon: string }> = {
  free:    { label: 'Gratuit',  color: colors.planFree,    icon: 'gift-outline' },
  basic:   { label: 'Basique',  color: colors.planBasic,   icon: 'star-outline' },
  premium: { label: 'Premium',  color: colors.planPremium, icon: 'diamond-outline' },
};

const ROLE_META: Record<string, { label: string; color: string }> = {
  gerant:   { label: 'Gérant',   color: colors.primary },
  livreur:  { label: 'Livreur',  color: colors.accent },
  employe:  { label: 'Employé',  color: colors.secondary },
  client:   { label: 'Client',   color: colors.success },
};

// ─── SettingRow ───────────────────────────────────────────────────────────────

const SettingRow = ({
  icon,
  iconColor = colors.textSecondary,
  label,
  subtitle,
  subtitleColor,
  onPress,
  showArrow = true,
  danger = false,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  subtitle?: string;
  subtitleColor?: string;
  onPress: () => void;
  showArrow?: boolean;
  danger?: boolean;
}) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.rowIcon, { backgroundColor: danger ? `${colors.error}12` : `${iconColor}12` }]}>
      <Ionicons name={icon as any} size={19} color={danger ? colors.error : iconColor} />
    </View>
    <View style={styles.rowInfo}>
      <Text style={[styles.rowLabel, danger && { color: colors.error }]}>{label}</Text>
      {subtitle ? (
        <Text style={[styles.rowSub, subtitleColor && { color: subtitleColor }]}>{subtitle}</Text>
      ) : null}
    </View>
    {showArrow && (
      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    )}
  </TouchableOpacity>
);

// ─── Section ──────────────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const Divider = () => <View style={styles.divider} />;

// ─── Main ─────────────────────────────────────────────────────────────────────

const SettingsScreen = ({ navigation }) => {
  const { user, userProfile, subscription, getSubscriptionDaysLeft } = useAuth();
  const { store, clients, products } = useStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logoutUser();
            setLoggingOut(false);
          },
        },
      ]
    );
  };

  const plan     = PLAN_META[subscription?.plan] ?? { label: 'Inconnu', color: colors.textSecondary, icon: 'help-circle-outline' };
  const role     = ROLE_META[userProfile?.role]  ?? { label: userProfile?.role ?? 'Utilisateur', color: colors.textSecondary };
  const daysLeft = getSubscriptionDaysLeft();

  const subStatusLabel = (() => {
    if (!subscription) return 'Aucun abonnement';
    if (subscription.status === 'cancelled') return 'Annulé';
    if (daysLeft <= 0) return 'Expiré';
    if (daysLeft <= 7) return `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;
    return 'Actif';
  })();

  const subStatusColor = (() => {
    if (!subscription || subscription.status === 'cancelled') return colors.error;
    if (daysLeft <= 0) return colors.error;
    if (daysLeft <= 7) return colors.warning;
    return colors.success;
  })();

  const endDate = subscription?.endDate?.toDate
    ? subscription.endDate.toDate()
    : subscription?.endDate ? new Date(subscription.endDate) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Paramètres"
        onBack={() => navigation.goBack()}
        showShadow
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Carte profil ── */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {getInitials(userProfile?.name)}
              </Text>
            </View>

            <View style={styles.profileMeta}>
              <Text style={styles.profileName} numberOfLines={1}>{userProfile?.name || 'Utilisateur'}</Text>

              {user?.email ? (
                <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
              ) : user?.phoneNumber ? (
                <Text style={styles.profileEmail}>{user.phoneNumber}</Text>
              ) : null}

              <View style={styles.profileBadges}>
                {/* Role */}
                <View style={[styles.badge, { backgroundColor: `${role.color}15` }]}>
                  <View style={[styles.badgeDot, { backgroundColor: role.color }]} />
                  <Text style={[styles.badgeText, { color: role.color }]}>{role.label}</Text>
                </View>
                {/* Plan */}
                <View style={[styles.badge, { backgroundColor: `${plan.color}15` }]}>
                  <Ionicons name={plan.icon as any} size={10} color={plan.color} />
                  <Text style={[styles.badgeText, { color: plan.color }]}>{plan.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Store */}
          {store?.name && (
            <View style={styles.storeRow}>
              <Ionicons name="storefront-outline" size={14} color={colors.primary} />
              <Text style={styles.storeRowText}>{store.name}</Text>
            </View>
          )}
        </View>

        {/* ── Abonnement hero ── */}
        <TouchableOpacity
          style={[styles.subCard, { borderColor: `${plan.color}40` }]}
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.8}
        >
          <View style={styles.subCardLeft}>
            <View style={[styles.subCardIcon, { backgroundColor: `${plan.color}15` }]}>
              <Ionicons name={plan.icon as any} size={22} color={plan.color} />
            </View>
            <View>
              <Text style={styles.subCardTitle}>Plan {plan.label}</Text>
              <View style={styles.subCardStatusRow}>
                <View style={[styles.subStatusDot, { backgroundColor: subStatusColor }]} />
                <Text style={[styles.subCardStatus, { color: subStatusColor }]}>{subStatusLabel}</Text>
              </View>
              {endDate && daysLeft > 0 && (
                <Text style={styles.subCardDate}>
                  Jusqu'au {moment(endDate).format('D MMM YYYY')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.subCardRight}>
            <Text style={styles.subCardCta}>Gérer</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* ── Usage rapide ── */}
        <View style={styles.usageRow}>
          <View style={styles.usageStat}>
            <Text style={styles.usageValue}>{products.length}</Text>
            <Text style={styles.usageLabel}>Produits</Text>
          </View>
          <View style={styles.usageDivider} />
          <View style={styles.usageStat}>
            <Text style={styles.usageValue}>{clients.length}</Text>
            <Text style={styles.usageLabel}>Clients</Text>
          </View>
          <View style={styles.usageDivider} />
          <View style={styles.usageStat}>
            <Text style={[styles.usageValue, { color: subStatusColor }]}>{daysLeft > 0 ? daysLeft : 0}</Text>
            <Text style={styles.usageLabel}>Jours restants</Text>
          </View>
        </View>

        {/* ── Compte ── */}
        <Section title="Compte">
          <SettingRow
            icon="person-outline"
            iconColor={colors.primary}
            label="Mon profil"
            subtitle={userProfile?.name}
            onPress={() => Alert.alert('Profil', 'Fonctionnalité disponible bientôt.')}
          />
          <Divider />
          <SettingRow
            icon="storefront-outline"
            iconColor={colors.secondary}
            label="Ma boutique"
            subtitle={store?.name}
            onPress={() => Alert.alert('Boutique', 'Fonctionnalité disponible bientôt.')}
          />
          <Divider />
          <SettingRow
            icon="lock-closed-outline"
            iconColor={colors.warning}
            label="Changer le mot de passe"
            onPress={() => Alert.alert('Mot de passe', 'Fonctionnalité disponible bientôt.')}
          />
        </Section>

        {/* ── Paiement ── */}
        <Section title="Paiement">
          <SettingRow
            icon="card-outline"
            iconColor={colors.success}
            label="Modes de paiement"
            subtitle="Configurer vos méthodes"
            onPress={() => navigation.navigate('PaymentMethod')}
          />
        </Section>

        {/* ── Application ── */}
        <Section title="Application">
          <SettingRow
            icon="help-circle-outline"
            iconColor={colors.primary}
            label="Aide & Support"
            subtitle="support@stockmanager.com"
            onPress={() => Alert.alert('Support', 'Contactez-nous : support@stockmanager.com')}
          />
          <Divider />
          <SettingRow
            icon="document-text-outline"
            iconColor={colors.textSecondary}
            label="Conditions d'utilisation"
            onPress={() => Alert.alert('CGU', 'Fonctionnalité disponible bientôt.')}
          />
          <Divider />
          <SettingRow
            icon="information-circle-outline"
            iconColor={colors.accent}
            label="À propos"
            subtitle="Version 1.0.0"
            onPress={() => Alert.alert('StockManager', 'Version 1.0.0')}
            showArrow={false}
          />
        </Section>

        {/* ── Déconnexion ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>
            {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionFooter}>StockManager · v1.0.0</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Profile card
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: '800' },
  profileMeta: { flex: 1, gap: 2 },
  profileName: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  profileEmail: { fontSize: 12, color: colors.textSecondary },
  profileBadges: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Store row
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: `${colors.primary}08`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  storeRowText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Subscription hero card
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  subCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  subCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  subCardStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subStatusDot: { width: 7, height: 7, borderRadius: 4 },
  subCardStatus: { fontSize: 12, fontWeight: '600' },
  subCardDate: { fontSize: 11, color: colors.textDisabled, marginTop: 2 },
  subCardRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  subCardCta: { fontSize: 13, fontWeight: '700', color: colors.primary },

  // Usage row
  usageRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  usageStat: { flex: 1, alignItems: 'center', gap: 3 },
  usageValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  usageLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  usageDivider: { width: 1, backgroundColor: colors.divider, marginVertical: 4 },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  // Setting row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 62 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: `${colors.error}10`,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${colors.error}25`,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.error },

  // Footer
  versionFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textDisabled,
    marginBottom: 4,
  },
});

export default SettingsScreen;
