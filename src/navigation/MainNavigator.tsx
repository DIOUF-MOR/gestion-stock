import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';

// Stock screens
import StockScreen from '../screens/main/stock/StockScreen';
import AddProductScreen from '../screens/main/stock/AddProductScreen';
import ProductDetailScreen from '../screens/main/stock/ProductDetailScreen';

// Client screens
import ClientsScreen from '../screens/main/clients/ClientsScreen';
import AddClientScreen from '../screens/main/clients/AddClientScreen';
import ClientDetailScreen from '../screens/main/clients/ClientDetailScreen';

// Employee screens
import EmployeesScreen from '../screens/main/employees/EmployeesScreen';
import AddEmployeeScreen from '../screens/main/employees/AddEmployeeScreen';
import EmployeeDetailScreen from '../screens/main/employees/EmployeeDetailScreen';

// Finance screens
import FinanceScreen from '../screens/main/finance/FinanceScreen';
import TransactionsScreen from '../screens/main/finance/TransactionsScreen';
import AddTransactionScreen from '../screens/main/finance/AddTransactionScreen';
import DebtsScreen from '../screens/main/finance/DebtsScreen';
import AddDebtScreen from '../screens/main/finance/AddDebtScreen';

// Reports screen
import ReportsScreen from '../screens/main/reports/ReportsScreen';

// Settings screens
import SettingsScreen from '../screens/main/settings/SettingsScreen';
import SubscriptionScreen from '../screens/main/settings/SubscriptionScreen';
import PaymentMethodScreen from '../screens/main/settings/PaymentMethodScreen';
import SubscriptionUpgradeScreen from '../screens/subscription/SubscriptionUpgradeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigators for each tab
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={DashboardScreen} />
  </Stack.Navigator>
);

const StockStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StockMain" component={StockScreen} />
    <Stack.Screen name="AddProduct" component={AddProductScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
  </Stack.Navigator>
);

const ClientsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientsMain" component={ClientsScreen} />
    <Stack.Screen name="AddClient" component={AddClientScreen} />
    <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
  </Stack.Navigator>
);

const EmployeesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeesMain" component={EmployeesScreen} />
    <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
    <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
  </Stack.Navigator>
);

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FinanceMain" component={FinanceScreen} />
    <Stack.Screen name="Transactions" component={TransactionsScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    <Stack.Screen name="Debts" component={DebtsScreen} />
    <Stack.Screen name="AddDebt" component={AddDebtScreen} />
  </Stack.Navigator>
);

const ReportsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ReportsMain" component={ReportsScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SettingsMain" component={SettingsScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
    <Stack.Screen name="SubscriptionUpgrade" component={SubscriptionUpgradeScreen} />
  </Stack.Navigator>
);

// Tab bar icon component
const TabIcon = ({ name, focused, color, badge }) => (
  <View style={styles.tabIconContainer}>
    <Ionicons
      name={focused ? name : `${name}-outline`}
      size={24}
      color={color}
    />
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: 'home',
            Stock: 'cube',
            Clients: 'people',
            Employees: 'person',
            Finance: 'bar-chart',
            Rapports: 'document-text',
            Paramètres: 'settings',
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
        name="Dashboard"
        component={DashboardStack}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="Stock"
        component={StockStack}
        options={{ tabBarLabel: 'Stock' }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{ tabBarLabel: 'Clients' }}
      />
      <Tab.Screen
        name="Employees"
        component={EmployeesStack}
        options={{
          tabBarLabel: 'Équipe',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="person" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceStack}
        options={{ tabBarLabel: 'Finance' }}
      />
      <Tab.Screen
        name="Rapports"
        component={ReportsStack}
        options={{ tabBarLabel: 'Rapports' }}
      />
      <Tab.Screen
        name="Paramètres"
        component={SettingsStack}
        options={{ tabBarLabel: 'Plus' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    paddingBottom: 8,
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
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MainNavigator;
