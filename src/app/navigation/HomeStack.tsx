// Home stack navigator: Home -> Camera -> MachineResult

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from '@features/home';
import { CameraScreen, MachineResultScreen } from '@features/identification';

import { colors } from '@shared/theme';

import { HomeStackParamList } from '@typings/navigation';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'MachineMate' }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: 'Identify Machine' }}
      />
      <Stack.Screen
        name="MachineResult"
        component={MachineResultScreen}
        options={{ title: 'Machine Guide' }}
      />
    </Stack.Navigator>
  );
}
