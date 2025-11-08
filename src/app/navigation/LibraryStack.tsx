// Library stack navigator: Library -> MachineDetail

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { LibraryScreen, MachineDetailScreen } from '@features/library';

import { colors } from '@shared/theme';

import { LibraryStackParamList } from '@typings/navigation';

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
