import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import ClientHomeScreen from '../screens/client/ClientHomeScreen';
import PlaceOrderScreen from '../screens/client/PlaceOrderScreen';
import ClientOrdersScreen from '../screens/client/ClientOrdersScreen';
import OrderTrackingScreen from '../screens/client/OrderTrackingScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientHomeMain" component={ClientHomeScreen} />
    <Stack.Screen name="PlaceOrder" component={PlaceOrderScreen} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientOrdersMain" component={ClientOrdersScreen} />
    <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientProfileMain" component={ClientProfileScreen} />
  </Stack.Navigator>
);

const TAB_ICONS: Record<string, string> = {
  ClientHome: 'storefront',
  MesCommandes: 'receipt',
  ClientProfil: 'person',
};

const ClientTabIcon = ({
  routeName,
  focused,
  color,
}: {
  routeName: string;
  focused: boolean;
  color: string;
}) => {
  const name = TAB_ICONS[routeName] || 'ellipse';
  return (
    <View style={[styles.tabIconWrap, focused && { backgroundColor: `${color}18` }]}>
      <Ionicons
        name={(focused ? name : `${name}-outline`) as any}
        size={22}
        color={color}
      />
    </View>
  );
};

const ClientNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => (
          <ClientTabIcon routeName={route.name} focused={focused} color={color} />
        ),
      })}
    >
      <Tab.Screen
        name="ClientHome"
        component={HomeStack}
        options={{ tabBarLabel: 'Boutique' }}
      />
      <Tab.Screen
        name="MesCommandes"
        component={OrdersStack}
        options={{ tabBarLabel: 'Commandes' }}
      />
      <Tab.Screen
        name="ClientProfil"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  tabIconWrap: {
    width: 52,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ClientNavigator;
