// Library stack navigator: Library -> MachineDetail

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LibraryStackParamList } from '../../types/navigation';

// Import screens (will be created next)
import LibraryScreen from '../../features/library/screens/LibraryScreen';
import MachineDetailScreen from '../../features/library/screens/MachineDetailScreen';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6200ee' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: 'Machine Library' }}
      />
      <Stack.Screen
        name="MachineDetail"
        component={MachineDetailScreen}
        options={{ title: 'Machine Guide' }}
      />
    </Stack.Navigator>
  );
}
