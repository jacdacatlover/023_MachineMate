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
import { RecognitionSettingsProvider } from './src/app/providers/RecognitionSettingsProvider';
import machinesDataRaw from './src/data/machines.json';
import { AuthStack, useSession } from './src/features/auth';
import { getMachines } from './src/features/library/services/machinesApi';
import { ErrorBoundary } from './src/shared/components/ErrorBoundary';
import PrimaryButton from './src/shared/components/PrimaryButton';
import { createLogger } from './src/shared/logger';
import { initMonitoring } from './src/shared/observability/monitoring';
import {
  initializePerformanceTracking,
  trackColdStart,
  markAppReady,
} from './src/shared/observability/performance';
import { theme, navigationTheme, colors } from './src/shared/theme';
import { MachineDefinition } from './src/types/machine';

// Import machine data

// Initialize monitoring and performance tracking (skip in test environments)
if (process.env.NODE_ENV !== 'test') {
  initMonitoring();
  initializePerformanceTracking();
}

const logger = createLogger('App');

/**
 * AppContent - Inner component that uses useSession hook
 * (must be inside PaperProvider and NavigationContainer)
 */
function AppContent({ machines }: { machines: MachineDefinition[] }) {
  const { user, isLoading: authLoading } = useSession();

  // Show loading indicator while checking auth state
  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  // Show AuthStack if not logged in, otherwise show main app
  return user ? <RootNavigator /> : <AuthStack />;
}

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

  const loadMachines = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let machinesData: MachineDefinition[];

      // Try to fetch from backend API first
      try {
        machinesData = await getMachines();
        logger.info('Loaded machines from backend API', { count: machinesData.length });
      } catch (backendError) {
        // Fall back to bundled JSON on network error
        logger.warn('Failed to fetch machines from backend, using bundled data', { backendError });
        machinesData = machinesDataRaw as MachineDefinition[];
      }

      // Validate and load machines
      if (!machinesData || !Array.isArray(machinesData)) {
        throw new Error('Invalid machines data format');
      }

      if (machinesData.length === 0) {
        throw new Error('No machines found in catalog');
      }

      const fallbackMachines = (machinesDataRaw as MachineDefinition[]) ?? [];
      const fallbackMap = new Map(fallbackMachines.map(machine => [machine.id, machine]));
      const fetchedMap = new Map(machinesData.map(machine => [machine.id, machine]));

      if (fetchedMap.size < fallbackMap.size) {
        logger.warn('Backend catalog missing machines found in fallback data', {
          backendCount: fetchedMap.size,
          fallbackCount: fallbackMap.size,
        });
      }

      const mergedIds = new Set([...fallbackMap.keys(), ...fetchedMap.keys()]);

      // Normalize machine entries while merging missing guide content from the bundled JSON
      const validated = Array.from(mergedIds).map(machineId => {
        const fallback = fallbackMap.get(machineId);
        const fetched = fetchedMap.get(machineId);
        const source = fetched ?? fallback;

        if (!source) {
          throw new Error(`Machine ${machineId} missing from both backend and fallback data`);
        }

        const normalized: MachineDefinition = {
          ...source,
          primaryMuscles: fetched?.primaryMuscles ?? fallback?.primaryMuscles ?? [],
          secondaryMuscles: fetched?.secondaryMuscles ?? fallback?.secondaryMuscles ?? [],
          setupSteps: fetched?.setupSteps ?? fallback?.setupSteps ?? [],
          howToSteps: fetched?.howToSteps ?? fallback?.howToSteps ?? [],
          commonMistakes: fetched?.commonMistakes ?? fallback?.commonMistakes ?? [],
          safetyTips: fetched?.safetyTips ?? fallback?.safetyTips ?? [],
          beginnerTips: fetched?.beginnerTips ?? fallback?.beginnerTips ?? [],
        };

        if (normalized.setupSteps.length === 0 || normalized.howToSteps.length === 0) {
          logger.warn('Machine missing guide content even after fallback', { machineId });
        }

        return normalized;
      });

      setMachines(validated);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error loading machines', { error: errorMessage });
      setError(`Failed to load machine data: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  // Track cold start when app is ready
  useEffect(() => {
    if (fontsLoaded && !isLoading && process.env.NODE_ENV !== 'test') {
      // Track cold start on first render
      trackColdStart();

      // Mark app as fully ready
      setTimeout(() => {
        markAppReady();
      }, 100); // Small delay to ensure navigation is complete
    }
  }, [fontsLoaded, isLoading]);

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
    <ErrorBoundary>
      <RecognitionSettingsProvider>
        <MachinesProvider machines={machines}>
          <PaperProvider theme={theme}>
            <NavigationContainer theme={navigationTheme}>
              <AppContent machines={machines} />
              <StatusBar style="light" />
            </NavigationContainer>
          </PaperProvider>
        </MachinesProvider>
      </RecognitionSettingsProvider>
    </ErrorBoundary>
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
