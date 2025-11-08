// Library stack navigator: Library -> MachineDetail

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import LibraryScreen from '@features/library/screens/LibraryScreen';
import MachineDetailScreen from '@features/library/screens/MachineDetailScreen';
import { colors } from '@shared/theme';
import { LibraryStackParamList } from 'src/types/navigation';

const Stack = createNativeStackNavigator<LibraryStackParamList>();

export default function LibraryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
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
