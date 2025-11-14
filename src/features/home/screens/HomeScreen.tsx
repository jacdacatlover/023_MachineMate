// Home screen: Main entry point with "Identify Machine" button and recent history

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Image, ScrollView, View, ActivityIndicator } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';

import MachineListItem from '@features/library/components/MachineListItem';
import { useFavorites } from '@features/library/hooks/useFavorites';
import { useRecentHistory } from '@features/library/hooks/useRecentHistory';

import PrimaryButton from '@shared/components/PrimaryButton';
import { colors } from '@shared/theme';

import { IdentificationResult } from '@typings/identification';
import { MachineDefinition } from '@typings/machine';
import { HomeStackParamList } from '@typings/navigation';

import { styles } from './HomeScreen.styles';
import heroLogo from '../../../../assets/icon.png';


type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const machines = useMachines();

  // Use hooks for favorites and history - they handle sync automatically
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const { history, isLoading: historyLoading } = useRecentHistory();

  const isLoading = favoritesLoading || historyLoading;

  // Show only last 5 history items on home screen
  const recentHistory = history.slice(0, 5);

  const handleIdentifyMachine = () => {
    navigation.navigate('Camera');
  };

  const handleMachinePress = (machineId: string) => {
    const result: IdentificationResult = {
      kind: 'catalog',
      machineId,
      candidates: [machineId],
      confidence: null,
      lowConfidence: false,
      source: 'manual',
    };
    navigation.navigate('MachineResult', {
      result,
    });
  };

  // Get machine objects from IDs in recent history
  const recentMachines = recentHistory
    .map(item => machines.find((m) => m.id === item.machineId))
    .filter((machine): machine is MachineDefinition => machine !== undefined);

  // Get machine objects from favorite IDs
  const favoriteMachines = favorites
    .map(id => machines.find((m) => m.id === id))
    .filter((machine): machine is MachineDefinition => machine !== undefined);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroSection}>
        <Image source={heroLogo} style={styles.logo} />
        <Text variant="headlineSmall" style={styles.title}>
          Welcome to MachineMate
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Take a photo of a gym machine to learn how to use it safely and correctly.
        </Text>
        <PrimaryButton
          label="Identify a Machine"
          icon="camera"
          onPress={handleIdentifyMachine}
        />
      </View>

      <Divider />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading your data...
          </Text>
        </View>
      )}

      {!isLoading && favoriteMachines.length > 0 && (
        <View style={styles.recentSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Favorite Machines
          </Text>
          {favoriteMachines.map((machine) => (
            <MachineListItem
              key={machine.id}
              machine={machine}
              isFavorite={true}
              onPress={() => handleMachinePress(machine.id)}
            />
          ))}
        </View>
      )}

      {!isLoading && favoriteMachines.length > 0 && recentMachines.length > 0 && <Divider />}

      {!isLoading && recentMachines.length > 0 && (
        <View style={styles.recentSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Recent Machines
          </Text>
          {recentMachines.map((machine) => (
            <MachineListItem
              key={machine.id}
              machine={machine}
              isFavorite={favorites.includes(machine.id)}
              onPress={() => handleMachinePress(machine.id)}
            />
          ))}
        </View>
      )}

      {!isLoading && recentMachines.length === 0 && favoriteMachines.length === 0 && (
        <View style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No recent machines yet.
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Start by identifying a machine or browsing the library!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
