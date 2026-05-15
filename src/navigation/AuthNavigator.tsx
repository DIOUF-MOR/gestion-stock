import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="PhoneAuth"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
