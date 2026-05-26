import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

// Sales screens
import NewSaleScreen from '../screens/main/sales/NewSaleScreen';
import SalesHistoryScreen from '../screens/main/sales/SalesHistoryScreen';

// Stock screens
import StockScreen from '../screens/main/stock/StockScreen';
import AddProductScreen from '../screens/main/stock/AddProductScreen';
import ProductDetailScreen from '../screens/main/stock/ProductDetailScreen';

// Finance / Transactions screens
import TransactionsScreen from '../screens/main/finance/TransactionsScreen';
import AddTransactionScreen from '../screens/main/finance/AddTransactionScreen';
import FinanceScreen from '../screens/main/finance/FinanceScreen';

// Employee profile
import EmployeeProfileScreen from '../screens/employee/EmployeeProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stacks ────────────────────────────────────────────────────────────────────

const VentesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NewSaleMain" component={NewSaleScreen} />
    <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
  </Stack.Navigator>
);

const StockStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StockMain" component={StockScreen} />
    <Stack.Screen name="AddProduct" component={AddProductScreen} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
  </Stack.Navigator>
);

const TransactionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransactionsMain" component={TransactionsScreen} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
  </Stack.Navigator>
);

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FinanceMain" component={FinanceScreen} />
  </Stack.Navigator>
);

const ProfilStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeeProfileMain" component={EmployeeProfileScreen} />
  </Stack.Navigator>
);

// ── Tab icon helper ───────────────────────────────────────────────────────────

const TabIcon = ({
  name,
  focused,
  color,
}: {
  name: string;
  focused: boolean;
  color: string;
}) => (
  <Ionicons
    name={(focused ? name : `${name}-outline`) as any}
    size={24}
    color={color}
  />
);

// ── Tab configs per role ──────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  label: string;
  icon: string;
  component: React.ComponentType<any>;
};

const ALL_TABS: Record<string, TabConfig> = {
  Ventes: {
    name: 'Ventes',
    label: 'Ventes',
    icon: 'cart',
    component: VentesStack,
  },
  Stock: {
    name: 'Stock',
    label: 'Stock',
    icon: 'cube',
    component: StockStack,
  },
  Transactions: {
    name: 'Transactions',
    label: 'Transactions',
    icon: 'list',
    component: TransactionsStack,
  },
  Finance: {
    name: 'Finance',
    label: 'Finance',
    icon: 'bar-chart',
    component: FinanceStack,
  },
  Profil: {
    name: 'Profil',
    label: 'Profil',
    icon: 'person',
    component: ProfilStack,
  },
};

const ROLE_TABS: Record<string, string[]> = {
  vendeur: ['Ventes', 'Stock', 'Profil'],
  caissier: ['Ventes', 'Transactions', 'Profil'],
  magasinier: ['Stock', 'Profil'],
  gérant: ['Ventes', 'Stock', 'Transactions', 'Finance', 'Profil'],
  gerant: ['Ventes', 'Stock', 'Transactions', 'Finance', 'Profil'],
  comptable: ['Transactions', 'Finance', 'Profil'],
};

// Default: show at minimum Profil so the employee can log out
const DEFAULT_TABS: string[] = ['Profil'];

// ── Navigator ─────────────────────────────────────────────────────────────────

const EmployeeNavigator = () => {
  const { userProfile } = useAuth() as { userProfile: any };
  const employeeRole: string = userProfile?.employeeRole || '';
  const tabKeys = ROLE_TABS[employeeRole] ?? DEFAULT_TABS;
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
          const tab = ALL_TABS[route.name];
          return (
            <TabIcon
              name={tab?.icon || 'ellipse'}
              focused={focused}
              color={color}
            />
          );
        },
      })}
    >
      {tabKeys.map((key) => {
        const tab = ALL_TABS[key];
        if (!tab) return null;
        return (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={tab.component}
            options={{ tabBarLabel: tab.label }}
          />
        );
      })}
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

export default EmployeeNavigator;
