// Home stack navigator: Home -> Camera -> MachineResult

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../types/navigation';
import { colors } from '../../shared/theme';

// Import screens (will be created next)
import HomeScreen from '../../features/home/screens/HomeScreen';
import CameraScreen from '../../features/identification/screens/CameraScreen';
import MachineResultScreen from '../../features/identification/screens/MachineResultScreen';

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
