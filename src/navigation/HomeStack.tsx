// Home stack navigator: Home -> Camera -> MachineResult

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types/navigation';

// Import screens (will be created next)
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import MachineResultScreen from '../screens/MachineResultScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6200ee' },
        headerTintColor: '#fff',
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
