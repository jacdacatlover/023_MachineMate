// Library screen: Browse and search all machines

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Searchbar, Chip, Text } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LibraryStackParamList } from '../types/navigation';
import { useMachines } from '../../App';
import { MachineDefinition, MachineCategory } from '../types/machine';
import { getFavorites } from '../logic/favoritesStorage';
import MachineListItem from '../components/MachineListItem';

type LibraryScreenNavigationProp = NativeStackNavigationProp<LibraryStackParamList, 'Library'>;

const CATEGORIES: (MachineCategory | 'All')[] = [
  'All',
  'Upper Body',
  'Lower Body',
  'Back',
  'Chest',
  'Shoulders',
  'Arms',
  'Core',
];

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const machines = useMachines();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MachineCategory | 'All'>('All');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  // Filter machines based on search and category
  const filteredMachines = machines.filter(machine => {
    // Category filter
    if (selectedCategory !== 'All' && machine.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        machine.name.toLowerCase().includes(query) ||
        machine.primaryMuscles.some(muscle => muscle.toLowerCase().includes(query)) ||
        machine.category.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleMachinePress = (machineId: string) => {
    navigation.navigate('MachineDetail', { machineId });
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <Searchbar
        placeholder="Search machines or muscles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Category filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Chip
              mode={selectedCategory === item ? 'flat' : 'outlined'}
              selected={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              style={styles.categoryChip}
              textStyle={styles.categoryChipText}
            >
              {item}
            </Chip>
          )}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Machine list */}
      <FlatList
        data={filteredMachines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MachineListItem
            machine={item}
            isFavorite={favorites.includes(item.id)}
            onPress={() => handleMachinePress(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No machines found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
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
