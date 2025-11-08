// Main App component with machine data context and navigation

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { PaperProvider, Text } from 'react-native-paper';

import RootNavigator from './src/app/navigation/RootNavigator';
import { MachinesProvider } from './src/app/providers/MachinesProvider';
import machinesData from './src/data/machines.json';
import PrimaryButton from './src/shared/components/PrimaryButton';
import { theme, navigationTheme, colors } from './src/shared/theme';
import { MachineDefinition } from './src/types/machine';


// Import machine data

export default function App() {
  const [machines, setMachines] = useState<MachineDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate and load machines
      if (!machinesData || !Array.isArray(machinesData)) {
        throw new Error('Invalid machines data format');
      }

      if (machinesData.length === 0) {
        throw new Error('No machines found in catalog');
      }

      // Validate that each machine has required fields
      const validated = machinesData.map((machine: any) => ({
        ...machine,
        primaryMuscles: machine.primaryMuscles ?? [],
        setupSteps: machine.setupSteps ?? [],
      }));

      setMachines(validated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error loading machines:', errorMessage);
      setError(`Failed to load machine data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Loading state (fonts or data)
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading MachineMate...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <PrimaryButton
          label="Try Again"
          icon="refresh"
          onPress={loadMachines}
          mode="contained"
        />
      </View>
    );
  }

  return (
    <MachinesProvider machines={machines}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </PaperProvider>
    </MachinesProvider>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 24,
  },
});
