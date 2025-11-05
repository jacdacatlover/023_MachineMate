// Reusable list item component for displaying a machine in a list

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, IconButton, Chip } from 'react-native-paper';
import { MachineDefinition } from '../../types/machine';

interface MachineListItemProps {
  machine: MachineDefinition;
  isFavorite: boolean;
  onPress: () => void;
  onFavoriteToggle?: () => void;
}

export default function MachineListItem({
  machine,
  isFavorite,
  onPress,
  onFavoriteToggle,
}: MachineListItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text variant="titleMedium" style={styles.name}>
            {machine.name}
          </Text>
          <Chip
            mode="outlined"
            compact
            style={styles.chip}
            textStyle={styles.chipText}
          >
            {machine.category}
          </Chip>
        </View>
        {onFavoriteToggle && (
          <IconButton
            icon={isFavorite ? 'star' : 'star-outline'}
            iconColor={isFavorite ? '#FFD700' : '#666'}
            size={24}
            onPress={onFavoriteToggle}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    height: 24,
  },
  chipText: {
    fontSize: 12,
    marginVertical: 0,
  },
});
