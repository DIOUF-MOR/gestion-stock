import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import DeliveryDashboardScreen from '../screens/delivery/DeliveryDashboardScreen';
import DeliveriesListScreen from '../screens/delivery/DeliveriesListScreen';
import DeliveryDetailScreen from '../screens/delivery/DeliveryDetailScreen';
import DeliveryHistoryScreen from '../screens/delivery/DeliveryHistoryScreen';
import DeliveryProfileScreen from '../screens/delivery/DeliveryProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeliveryDashboardMain" component={DeliveryDashboardScreen} />
    <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
  </Stack.Navigator>
);

const DeliveriesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeliveriesListMain" component={DeliveriesListScreen} />
    <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
  </Stack.Navigator>
);

const HistoryStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeliveryHistoryMain" component={DeliveryHistoryScreen} />
    <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DeliveryProfileMain" component={DeliveryProfileScreen} />
  </Stack.Navigator>
);

const TabIcon = ({ name, focused, color }) => (
  <Ionicons
    name={focused ? name : `${name}-outline`}
    size={24}
    color={color}
  />
);

const DeliveryNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: [styles.tabBar, {
          height: 65 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        }],
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = {
            DeliveryDashboard: 'home',
            MesLivraisons: 'bicycle',
            Historique: 'time',
            MonProfil: 'person',
          };
          return (
            <TabIcon
              name={icons[route.name] || 'ellipse'}
              focused={focused}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="DeliveryDashboard"
        component={DashboardStack}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="MesLivraisons"
        component={DeliveriesStack}
        options={{ tabBarLabel: 'Livraisons' }}
      />
      <Tab.Screen
        name="Historique"
        component={HistoryStack}
        options={{ tabBarLabel: 'Historique' }}
      />
      <Tab.Screen
        name="MonProfil"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default DeliveryNavigator;
