import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import SubscribersScreen from '../screens/admin/SubscribersScreen';
import SubscriberDetailScreen from '../screens/admin/SubscriberDetailScreen';
import PlansScreen from '../screens/admin/PlansScreen';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import PaymentVerificationScreen from '../screens/admin/PaymentVerificationScreen';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Subscribers" component={SubscribersScreen} />
      <Stack.Screen name="SubscriberDetail" component={SubscriberDetailScreen} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="PaymentVerification" component={PaymentVerificationScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
