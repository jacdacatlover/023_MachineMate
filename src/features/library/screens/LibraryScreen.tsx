// Library screen: Browse and search all machines

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useCallback, useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { Searchbar, Chip, Text } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';
import { getFavorites } from '@shared/services/favoritesStorage';
import MachineListItem from '@features/library/components/MachineListItem';
import { MachineCategory, MachineDefinition } from 'src/types/machine';
import { LibraryStackParamList } from 'src/types/navigation';

import { styles } from './LibraryScreen.styles';

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
  'Cardio',
  'Full Body',
];

const UPPER_BODY_GROUP: readonly MachineCategory[] = ['Back', 'Chest', 'Shoulders', 'Arms'];

function matchesCategorySelection(machineCategory: MachineCategory, selected: MachineCategory | 'All'): boolean {
  if (selected === 'All') {
    return true;
  }

  if (selected === 'Upper Body') {
    return UPPER_BODY_GROUP.includes(machineCategory);
  }

  if (selected === 'Lower Body') {
    return machineCategory === 'Lower Body';
  }

  return machineCategory === selected;
}

// Memoized category chip component for better performance
const CategoryChip = React.memo(
  ({
    category,
    isSelected,
    onPress,
  }: {
    category: MachineCategory | 'All';
    isSelected: boolean;
    onPress: (category: MachineCategory | 'All') => void;
  }) => (
    <Chip
      mode={isSelected ? 'flat' : 'outlined'}
      selected={isSelected}
      onPress={() => onPress(category)}
      style={styles.categoryChip}
      textStyle={styles.categoryChipText}
    >
      {category}
    </Chip>
  )
);

CategoryChip.displayName = 'CategoryChip';

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

  const loadFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  }, []);

  // Filter machines based on search and category (memoized for performance)
  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      // Category filter
      if (!matchesCategorySelection(machine.category, selectedCategory)) {
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
  }, [machines, selectedCategory, searchQuery]);

  const handleMachinePress = useCallback(
    (machineId: string) => {
      navigation.navigate('MachineDetail', { machineId });
    },
    [navigation]
  );

  // Memoized render functions for FlatLists
  const renderCategoryChip = useCallback(
    ({ item }: { item: MachineCategory | 'All' }) => (
      <CategoryChip category={item} isSelected={selectedCategory === item} onPress={setSelectedCategory} />
    ),
    [selectedCategory]
  );

  const renderMachineItem = useCallback(
    ({ item }: { item: MachineDefinition }) => (
      <MachineListItem
        machine={item}
        isFavorite={favorites.includes(item.id)}
        onPress={() => handleMachinePress(item.id)}
      />
    ),
    [favorites, handleMachinePress]
  );

  const keyExtractorMachine = useCallback((item: MachineDefinition) => item.id, []);
  const keyExtractorCategory = useCallback((item: MachineCategory | 'All') => item, []);

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
          keyExtractor={keyExtractorCategory}
          renderItem={renderCategoryChip}
          contentContainerStyle={styles.filtersContent}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
        />
      </View>

      {/* Machine list */}
      <FlatList
        data={filteredMachines}
        keyExtractor={keyExtractorMachine}
        renderItem={renderMachineItem}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        removeClippedSubviews={true}
        initialNumToRender={10}
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
