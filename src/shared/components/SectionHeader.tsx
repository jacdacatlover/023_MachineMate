// Reusable section header component for machine detail screens

import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { styles } from './SectionHeader.styles';

interface SectionHeaderProps {
  title: string;
  icon?: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
    </View>
  );
}
