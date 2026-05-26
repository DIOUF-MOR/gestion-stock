import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/authService';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import AdminNavigator from './AdminNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SubscriptionScreen from '../screens/main/settings/SubscriptionScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

// Screen shown when subscription is expired
const ExpiredSubscriptionScreen = ({ navigation }) => {
  return (
    <View style={styles.expiredContainer}>
      <View style={styles.expiredIconContainer}>
        <Ionicons name="lock-closed" size={80} color={colors.warning} />
      </View>
      <Text style={styles.expiredTitle}>Abonnement Expiré</Text>
      <Text style={styles.expiredMessage}>
        Votre abonnement a expiré. Veuillez contacter l'administrateur pour
        renouveler votre abonnement et continuer à utiliser l'application.
      </Text>
      <TouchableOpacity
        style={styles.contactButton}
        onPress={() => navigation.navigate('Subscription')}
      >
        <Text style={styles.contactButtonText}>Voir les offres</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await logoutUser();
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
};

const AppNavigator = () => {
  const { user, userProfile, loading, isAdmin, isEmployee, hasActiveSubscription } = useAuth() as any;

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen
        message="Chargement de l'application..."
      />
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        // Not logged in
        <AuthNavigator />
      ) : isAdmin() ? (
        // Admin user
        <AdminNavigator />
      ) : isEmployee() ? (
        // Employee portal
        <EmployeeNavigator />
      ) : hasActiveSubscription() ? (
        // Vendor with active subscription
        <MainNavigator />
      ) : (
        // Vendor with expired/no subscription
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="ExpiredSubscription"
            component={ExpiredSubscriptionScreen}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  expiredContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  expiredIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: `${colors.warning}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  expiredTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  expiredMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  contactButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  contactButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  logoutText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
});

export default AppNavigator;
