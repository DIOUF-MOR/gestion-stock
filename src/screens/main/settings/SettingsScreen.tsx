import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { useStore } from '../../../context/StoreContext';
import { logoutUser, updateUserProfile } from '../../../services/authService';
import Card from '../../../components/common/Card';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const SettingsScreen = ({ navigation }) => {
  const { user, userProfile, subscription, getSubscriptionDaysLeft } = useAuth();
  const { store, storeId } = useStore();
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

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getPlanName = () => {
    const plans = { free: 'Gratuit', basic: 'Basique', premium: 'Premium' };
    return plans[subscription?.plan] || 'Inconnu';
  };

  const getPlanColor = () => {
    const planColors = { free: colors.planFree, basic: colors.planBasic, premium: colors.planPremium };
    return planColors[subscription?.plan] || colors.textSecondary;
  };

  const getSubStatus = () => {
    if (!subscription) return { label: 'Aucun', color: colors.error };
    const daysLeft = getSubscriptionDaysLeft();
    if (subscription.status === 'cancelled') return { label: 'Annulé', color: colors.error };
    if (daysLeft <= 0) return { label: 'Expiré', color: colors.error };
    if (daysLeft <= 7) return { label: `Expire dans ${daysLeft}j`, color: colors.warning };
    return { label: 'Actif', color: colors.success };
  };

  const subStatus = getSubStatus();
  const endDate = subscription?.endDate?.toDate
    ? subscription.endDate.toDate()
    : subscription?.endDate ? new Date(subscription.endDate) : null;

  const settingsSections = [
    {
      title: 'Compte',
      items: [
        {
          icon: 'person-circle-outline',
          label: 'Mon profil',
          subtitle: userProfile?.name,
          onPress: () => Alert.alert('Profil', 'Fonctionnalité disponible bientôt.'),
          showArrow: true,
        },
        {
          icon: 'storefront-outline',
          label: 'Ma boutique',
          subtitle: store?.name,
          onPress: () => Alert.alert('Boutique', 'Fonctionnalité disponible bientôt.'),
          showArrow: true,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Changer le mot de passe',
          onPress: () => Alert.alert('Mot de passe', 'Fonctionnalité disponible bientôt.'),
          showArrow: true,
        },
      ],
    },
    {
      title: 'Abonnement',
      items: [
        {
          icon: 'diamond-outline',
          label: 'Mon abonnement',
          subtitle: `Plan ${getPlanName()} · ${subStatus.label}`,
          subtitleColor: subStatus.color,
          onPress: () => navigation.navigate('Subscription'),
          showArrow: true,
          highlight: true,
        },
      ],
    },
    {
      title: 'Application',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'À propos',
          subtitle: 'Version 1.0.0',
          onPress: () => Alert.alert('StockManager', 'Version 1.0.0\nDéveloppé avec ❤️'),
          showArrow: false,
        },
        {
          icon: 'help-circle-outline',
          label: 'Aide & Support',
          onPress: () => Alert.alert('Support', 'Contactez-nous: support@stockmanager.com'),
          showArrow: true,
        },
        {
          icon: 'document-text-outline',
          label: 'Conditions d\'utilisation',
          onPress: () => Alert.alert('CGU', 'Fonctionnalité disponible bientôt.'),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Paramètres</Text>

        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userProfile?.name)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile?.name}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.profileBadge}>
                <View style={[styles.planDot, { backgroundColor: getPlanColor() }]} />
                <Text style={[styles.planBadgeText, { color: getPlanColor() }]}>
                  Plan {getPlanName()}
                </Text>
              </View>
            </View>
          </View>

          {/* Subscription info */}
          {endDate && (
            <View style={styles.subInfo}>
              <Ionicons name="calendar-outline" size={14} color={subStatus.color} />
              <Text style={[styles.subInfoText, { color: subStatus.color }]}>
                {subStatus.label} · Expire le {moment(endDate).format('D MMM YYYY')}
              </Text>
            </View>
          )}
        </Card>

        {/* Settings sections */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Card style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={[
                      styles.settingItem,
                      item.highlight && styles.settingItemHighlight,
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={[
                      styles.settingIcon,
                      { backgroundColor: item.highlight ? `${colors.primary}15` : colors.surfaceVariant },
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.highlight ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={[
                        styles.settingLabel,
                        item.highlight && styles.settingLabelHighlight,
                      ]}>
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={[
                          styles.settingSubtitle,
                          item.subtitleColor && { color: item.subtitleColor },
                        ]}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    {item.showArrow && (
                      <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                    )}
                  </TouchableOpacity>
                  {index < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>
            {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  profileCard: {
    padding: 16,
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  subInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemHighlight: {
    backgroundColor: `${colors.primary}05`,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingLabelHighlight: {
    color: colors.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 70,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorBackground,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  bottomPadding: {
    height: 24,
  },
});

export default SettingsScreen;
