// Home screen: Main entry point with "Identify Machine" button and recent history

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useCallback } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Text, Divider } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';
import { getFavorites, setFavorites as saveFavorites } from '@shared/services/favoritesStorage';
import { getRecentHistory } from '@shared/services/historyStorage';
import { filterValidMachineIds } from '@shared/services/validation';
import MachineListItem from '@features/library/components/MachineListItem';
import PrimaryButton from '@shared/components/PrimaryButton';
import { RecentHistoryItem } from 'src/types/history';
import { IdentificationResult } from 'src/types/identification';
import { MachineDefinition } from 'src/types/machine';
import { HomeStackParamList } from 'src/types/navigation';

import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const machines = useMachines();
  const [recentHistory, setRecentHistory] = useState<RecentHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    const history = await getRecentHistory();
    const favs = await getFavorites();

    // Validate and clean up invalid machine IDs
    const validFavs = filterValidMachineIds(favs, machines);
    if (validFavs.length !== favs.length) {
      // Save cleaned favorites back to storage
      await saveFavorites(validFavs).catch(err =>
        console.error('Failed to save cleaned favorites:', err)
      );
    }

    setRecentHistory(history.slice(0, 5)); // Show only last 5
    setFavorites(validFavs);
  }, [machines]);

  // Load recent history and favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroSection}>
        <Image source={require('../../../../assets/icon.png')} style={styles.logo} />
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

      {recentMachines.length > 0 && (
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

      {recentMachines.length === 0 && (
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
