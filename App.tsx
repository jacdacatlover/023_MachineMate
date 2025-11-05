// Main App component with machine data context and navigation

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider, MD3LightTheme, Text } from 'react-native-paper';
import { MachineDefinition } from './src/types/machine';
import RootNavigator from './src/app/navigation/RootNavigator';
import { MachinesProvider } from './src/app/providers/MachinesProvider';

// Import machine data
import machinesData from './src/data/machines.json';

// Custom theme based on React Native Paper
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
  },
};

export default function App() {
  const [machines, setMachines] = useState<MachineDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      // In a real app, this could be an async fetch
      // For now, we're using the imported JSON directly
      // Simulate a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Validate and load machines
      if (!machinesData || !Array.isArray(machinesData)) {
        throw new Error('Invalid machines data format');
      }

      setMachines(machinesData as MachineDefinition[]);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading machines:', err);
      setError('Failed to load machine data. Please restart the app.');
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading MachineMate...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }

  return (
    <MachinesProvider machines={machines}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
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
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
