import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useDelivery } from '../context/DeliveryContext';

// Main screens
import DashboardScreen from '../screens/main/DashboardScreen';

// Stock screens
import StockScreen from '../screens/main/stock/StockScreen';
import AddProductScreen from '../screens/main/stock/AddProductScreen';
import ProductDetailScreen from '../screens/main/stock/ProductDetailScreen';

// Client screens
import ClientsScreen from '../screens/main/clients/ClientsScreen';
import AddClientScreen from '../screens/main/clients/AddClientScreen';
import ClientPortalScreen from '../screens/main/clients/ClientPortalScreen';
import ClientNewSaleScreen from '../screens/main/clients/ClientNewSaleScreen';

// Finance screens
import FinanceScreen from '../screens/main/finance/FinanceScreen';
import TransactionsScreen from '../screens/main/finance/TransactionsScreen';
import AddTransactionScreen from '../screens/main/finance/AddTransactionScreen';
import DebtsScreen from '../screens/main/finance/DebtsScreen';
import AddDebtScreen from '../screens/main/finance/AddDebtScreen';
import NewSaleScreen from '../screens/main/sales/NewSaleScreen';
import SalesHistoryScreen from '../screens/main/sales/SalesHistoryScreen';

// Plus / More screens
import MoreMenuScreen from '../screens/main/MoreMenuScreen';

// Employee screens
import EmployeesScreen from '../screens/main/employees/EmployeesScreen';
import AddEmployeeScreen from '../screens/main/employees/AddEmployeeScreen';
import EmployeeDetailScreen from '../screens/main/employees/EmployeeDetailScreen';

// Order screens (vendor side)
import OrdersManagementScreen from '../screens/main/orders/OrdersManagementScreen';
import OrderDetailVendorScreen from '../screens/main/orders/OrderDetailVendorScreen';

// Delivery screens (vendor side)
import DeliveriesManagementScreen from '../screens/main/delivery/DeliveriesManagementScreen';
import CreateDeliveryScreen from '../screens/main/delivery/CreateDeliveryScreen';
import LivreursManagementScreen from '../screens/main/delivery/LivreursManagementScreen';
import AddLivreurScreen from '../screens/main/delivery/AddLivreurScreen';
import LivraisonDetailScreen from '../screens/main/delivery/LivraisonDetailScreen';

// Reports screen
import ReportsScreen from '../screens/main/reports/ReportsScreen';

// Settings screens
import SettingsScreen from '../screens/main/settings/SettingsScreen';
import SubscriptionScreen from '../screens/main/settings/SubscriptionScreen';
import PaymentMethodScreen from '../screens/main/settings/PaymentMethodScreen';
import SubscriptionUpgradeScreen from '../screens/subscription/SubscriptionUpgradeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ─── Stack navigators ────────────────────────────────────────────────────────

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
    <Stack.Screen name="ClientPortal" component={ClientPortalScreen} />
    <Stack.Screen name="ClientNewSale" component={ClientNewSaleScreen} />
  </Stack.Navigator>
);

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FinanceMain" component={FinanceScreen} />
    <Stack.Screen name="NewSale" component={NewSaleScreen} />
    <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
    <Stack.Screen name="Transactions" component={TransactionsScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    <Stack.Screen name="Debts" component={DebtsScreen} />
    <Stack.Screen name="AddDebt" component={AddDebtScreen} />
  </Stack.Navigator>
);

/**
 * "Plus" stack — root is MoreMenuScreen, all secondary modules live here.
 * MoreMenuScreen navigates to sibling screens by name (e.g. 'EmployeesMain'),
 * so every destination must be registered in this same stack.
 */
const MoreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Root */}
    <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />

    {/* Employees */}
    <Stack.Screen name="EmployeesMain" component={EmployeesScreen} />
    <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
    <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />

    {/* Deliveries */}
    <Stack.Screen name="DeliveriesMain" component={DeliveriesManagementScreen} />
    <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <Stack.Screen name="LivreursManagement" component={LivreursManagementScreen} />
    <Stack.Screen name="AddLivreur" component={AddLivreurScreen} />
    <Stack.Screen name="LivraisonDetail" component={LivraisonDetailScreen} />

    {/* Orders */}
    <Stack.Screen name="OrdersMain" component={OrdersManagementScreen} />
    <Stack.Screen name="OrderDetail" component={OrderDetailVendorScreen} />

    {/* Reports */}
    <Stack.Screen name="ReportsMain" component={ReportsScreen} />

    {/* Settings */}
    <Stack.Screen name="SettingsMain" component={SettingsScreen} />
    <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
    <Stack.Screen name="SubscriptionUpgrade" component={SubscriptionUpgradeScreen} />
  </Stack.Navigator>
);

// ─── Tab icon ────────────────────────────────────────────────────────────────

const TabIcon = ({
  name,
  focused,
  color,
  badge,
}: {
  name: string;
  focused: boolean;
  color: string;
  badge?: number;
}) => (
  <View style={styles.tabIconContainer}>
    <Ionicons
      name={(focused ? name : `${name}-outline`) as any}
      size={24}
      color={color}
    />
    {badge != null && badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

// ─── Main navigator ───────────────────────────────────────────────────────────

const MainNavigator = () => {
  const { activeDeliveries } = useDelivery();
  const moreBadge = activeDeliveries.length;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: [styles.tabBar, {
          height: 65 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        }],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stock"
        component={StockStack}
        options={{
          tabBarLabel: 'Stock',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="cube" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{
          tabBarLabel: 'Clients',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="people" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceStack}
        options={{
          tabBarLabel: 'Finance',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="bar-chart" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Plus"
        component={MoreStack}
        options={{
          tabBarLabel: 'Plus',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name="grid"
              focused={focused}
              color={color}
              badge={moreBadge}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

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
