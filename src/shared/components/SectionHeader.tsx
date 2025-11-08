// Reusable section header component for machine detail screens

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '@shared/theme';

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

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
