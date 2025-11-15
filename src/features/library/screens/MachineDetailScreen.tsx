// Machine Detail screen: Full guide for a machine (accessed from Library)

import { useRoute, RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';

import { useFavorites } from '@features/library/hooks/useFavorites';
import { useRecentHistory } from '@features/library/hooks/useRecentHistory';

import { AnimatedBodyHighlighter } from '@shared/components/AnimatedBodyHighlighter';
import SectionHeader from '@shared/components/SectionHeader';
import { createLogger } from '@shared/logger';
import { colors } from '@shared/theme';

import { LibraryStackParamList } from '@typings/navigation';

import { styles } from './MachineDetailScreen.styles';

type MachineDetailScreenRouteProp = RouteProp<LibraryStackParamList, 'MachineDetail'>;

const logger = createLogger('MachineDetailScreen');

export default function MachineDetailScreen() {
  const route = useRoute<MachineDetailScreenRouteProp>();
  const { machineId } = route.params;
  const machines = useMachines();

  // Use hooks for favorites and history tracking
  const { isFavorite: checkIsFavorite, toggleFavorite } = useFavorites();
  const { addToHistory } = useRecentHistory();

  const isFavorite = checkIsFavorite(machineId);
  const machine = machines.find(m => m.id === machineId);

  // Add to history when screen loads
  useEffect(() => {
    addToHistory(machineId).catch((error) => {
      logger.error('Failed to add to history', error);
    });
  }, [machineId, addToHistory]);

  const handleToggleFavorite = async () => {
    try {
      await toggleFavorite(machineId);
    } catch (error) {
      logger.error('Failed to toggle favorite', error);
    }
  };

  if (!machine) {
    return (
      <View style={styles.errorContainer}>
        <Text>Machine not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Machine info header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={styles.machineName}>
              {machine.name}
            </Text>
            <IconButton
              icon={isFavorite ? 'star' : 'star-outline'}
              iconColor={isFavorite ? colors.warning : colors.textSecondary}
              size={28}
              onPress={handleToggleFavorite}
            />
          </View>
          <Chip mode="outlined" style={styles.categoryChip}>
            {machine.category}
          </Chip>
          <View style={styles.muscleRow}>
            <Text variant="bodyMedium" style={styles.muscleLabel}>
              Primary:{' '}
            </Text>
            <Text variant="bodyMedium" style={styles.muscleText}>
              {machine.primaryMuscles.join(', ')}
            </Text>
          </View>
          {machine.secondaryMuscles && machine.secondaryMuscles.length > 0 && (
            <View style={styles.muscleRow}>
              <Text variant="bodyMedium" style={styles.muscleLabel}>
                Secondary:{' '}
              </Text>
              <Text variant="bodyMedium" style={styles.muscleText}>
                {machine.secondaryMuscles.join(', ')}
              </Text>
            </View>
          )}
          <Chip
            mode="flat"
            textStyle={styles.difficultyText}
            style={[
              styles.difficultyChip,
              machine.difficulty === 'Beginner' && styles.beginnerChip,
              machine.difficulty === 'Intermediate' && styles.intermediateChip,
            ]}
          >
            {machine.difficulty}
          </Chip>
        </View>
      </View>

      {/* Professional Muscle Diagram with Animated Highlighting */}
      <View style={styles.diagramSection}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Muscles Worked
        </Text>
        <AnimatedBodyHighlighter
          primaryMuscles={machine.primaryMuscles}
          secondaryMuscles={machine.secondaryMuscles}
          cycleDuration={3000}
        />
      </View>

      <Divider />

      {/* Setup Steps */}
      <SectionHeader title="Setup" />
      <View style={styles.section}>
        {machine.setupSteps.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{index + 1}.</Text>
            <Text variant="bodyMedium" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      {/* How to Use */}
      <SectionHeader title="How to Use" />
      <View style={styles.section}>
        {machine.howToSteps.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{index + 1}.</Text>
            <Text variant="bodyMedium" style={styles.stepText}>
              {step}
            </Text>
          </View>
        ))}
      </View>

      {/* Common Mistakes */}
      <SectionHeader title="Common Mistakes" />
      <View style={styles.section}>
        {machine.commonMistakes.map((mistake, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text variant="bodyMedium" style={styles.bulletText}>
              {mistake}
            </Text>
          </View>
        ))}
      </View>

      {/* Safety Tips */}
      <SectionHeader title="Safety Tips" />
      <View style={styles.section}>
        {machine.safetyTips.map((tip, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>⚠️</Text>
            <Text variant="bodyMedium" style={styles.bulletText}>
              {tip}
            </Text>
          </View>
        ))}
      </View>

      {/* Beginner Tips */}
      <SectionHeader title="Beginner Tips" />
      <View style={styles.section}>
        {machine.beginnerTips.map((tip, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>💡</Text>
            <Text variant="bodyMedium" style={styles.bulletText}>
              {tip}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
