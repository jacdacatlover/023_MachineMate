// Reusable list item component for displaying a machine in a list

import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text, IconButton, Chip } from 'react-native-paper';

import { colors } from '@shared/theme';
import { MachineDefinition } from 'src/types/machine';

import { styles } from './MachineListItem.styles';

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
            iconColor={isFavorite ? colors.warning : colors.textSecondary}
            size={24}
            onPress={onFavoriteToggle}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
