// Machine Detail screen: Full guide for a machine (accessed from Library)

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LibraryStackParamList } from '../../../types/navigation';
import { useMachines } from '../../../app/providers/MachinesProvider';
import { toggleFavorite, isFavorite as checkIsFavorite } from '../../../services/storage/favoritesStorage';
import { addToRecentHistory } from '../../../services/storage/historyStorage';
import SectionHeader from '../../../shared/components/SectionHeader';
import { AnimatedBodyHighlighter } from '../../../shared/components/AnimatedBodyHighlighter';

type MachineDetailScreenRouteProp = RouteProp<LibraryStackParamList, 'MachineDetail'>;

export default function MachineDetailScreen() {
  const route = useRoute<MachineDetailScreenRouteProp>();
  const { machineId } = route.params;
  const machines = useMachines();
  const [isFavorite, setIsFavorite] = useState(false);

  const machine = machines.find(m => m.id === machineId);

  useEffect(() => {
    loadFavoriteStatus();
    addMachineToHistory();
  }, []);

  const loadFavoriteStatus = async () => {
    const favStatus = await checkIsFavorite(machineId);
    setIsFavorite(favStatus);
  };

  const addMachineToHistory = async () => {
    await addToRecentHistory(machineId);
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(machineId);
    setIsFavorite(!isFavorite);
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
              iconColor={isFavorite ? '#FFD700' : '#666'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
  },
  headerContent: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineName: {
    flex: 1,
    fontWeight: 'bold',
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  muscleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muscleLabel: {
    fontWeight: '600',
  },
  muscleText: {
    color: '#666',
  },
  difficultyChip: {
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
  },
  beginnerChip: {
    backgroundColor: '#e8f5e9',
  },
  intermediateChip: {
    backgroundColor: '#fff3e0',
  },
  diagramSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    marginRight: 8,
    minWidth: 24,
  },
  bulletText: {
    flex: 1,
  },
  bottomPadding: {
    height: 32,
  },
});
