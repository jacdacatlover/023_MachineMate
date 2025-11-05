// Home screen: Main entry point with "Identify Machine" button and recent history

import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../../types/navigation';
import { useMachines } from '../../../app/providers/MachinesProvider';
import { getRecentHistory } from '../../../services/storage/historyStorage';
import { getFavorites } from '../../../services/storage/favoritesStorage';
import { RecentHistoryItem } from '../../../types/history';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import MachineListItem from '../../../shared/components/MachineListItem';
import { IdentificationResult } from '../../../types/identification';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const machines = useMachines();
  const [recentHistory, setRecentHistory] = useState<RecentHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load recent history and favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const history = await getRecentHistory();
    const favs = await getFavorites();
    setRecentHistory(history.slice(0, 5)); // Show only last 5
    setFavorites(favs);
  };

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
    .filter(Boolean);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroSection}>
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
              key={machine!.id}
              machine={machine!}
              isFavorite={favorites.includes(machine!.id)}
              onPress={() => handleMachinePress(machine!.id)}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  recentSection: {
    paddingTop: 16,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#999',
    textAlign: 'center',
  },
});
