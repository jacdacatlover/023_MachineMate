/**
 * AuthStack Navigator
 *
 * Navigation stack for authentication flows (Login/Signup)
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { colors } from '@shared/theme';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false, // Login screen has its own hero section
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          headerShown: false, // Signup screen has its own hero section
          presentation: 'modal', // Make signup feel like a modal
        }}
      />
    </Stack.Navigator>
  );
}
