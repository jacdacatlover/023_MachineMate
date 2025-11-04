// Machine Result screen: Shows identified machine with photo and alternatives

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../types/navigation';
import { useMachines } from '../../App';
import { MachineDefinition } from '../types/machine';
import { toggleFavorite, isFavorite as checkIsFavorite } from '../logic/favoritesStorage';
import { addToRecentHistory } from '../logic/historyStorage';
import SectionHeader from '../components/SectionHeader';
import PrimaryButton from '../components/PrimaryButton';
import MachinePickerModal from '../components/MachinePickerModal';

type MachineResultScreenRouteProp = RouteProp<HomeStackParamList, 'MachineResult'>;

export default function MachineResultScreen() {
  const route = useRoute<MachineResultScreenRouteProp>();
  const { photoUri, primaryMachineId, candidateIds, confidence, lowConfidence, source } =
    route.params;
  const machines = useMachines();

  const [currentMachineId, setCurrentMachineId] = useState(primaryMachineId);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(lowConfidence ?? false);

  const currentMachine = machines.find(m => m.id === currentMachineId);
  const candidates = candidateIds
    .map(id => machines.find(m => m.id === id))
    .filter(Boolean) as MachineDefinition[];

  useEffect(() => {
    loadFavoriteStatus();
    addMachineToHistory();
  }, [currentMachineId]);

  useEffect(() => {
    if (lowConfidence) {
      setIsPickerVisible(true);
    }
  }, [lowConfidence]);

  const loadFavoriteStatus = async () => {
    const favStatus = await checkIsFavorite(currentMachineId);
    setIsFavorite(favStatus);
  };

  const addMachineToHistory = async () => {
    await addToRecentHistory(currentMachineId);
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(currentMachineId);
    setIsFavorite(!isFavorite);
  };

  const handleCandidatePress = (machineId: string) => {
    setCurrentMachineId(machineId);
  };

  if (!currentMachine) {
    return (
      <View style={styles.errorContainer}>
        <Text>Machine not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Photo thumbnail */}
      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
      )}

      {/* Machine info header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={styles.machineName}>
              {currentMachine.name}
            </Text>
            <IconButton
              icon={isFavorite ? 'star' : 'star-outline'}
              iconColor={isFavorite ? '#FFD700' : '#666'}
              size={28}
              onPress={handleToggleFavorite}
            />
          </View>
          <Chip mode="outlined" style={styles.categoryChip}>
            {currentMachine.category}
          </Chip>
          <View style={styles.muscleRow}>
            <Text variant="bodyMedium" style={styles.muscleLabel}>
              Primary:{' '}
            </Text>
            <Text variant="bodyMedium" style={styles.muscleText}>
              {currentMachine.primaryMuscles.join(', ')}
            </Text>
          </View>
          <Chip
            mode="flat"
            textStyle={styles.difficultyText}
            style={[
              styles.difficultyChip,
              currentMachine.difficulty === 'Beginner' && styles.beginnerChip,
              currentMachine.difficulty === 'Intermediate' && styles.intermediateChip,
            ]}
          >
            {currentMachine.difficulty}
          </Chip>
        </View>
      </View>

      {/* Muscle diagram */}
      {currentMachine.muscleDiagramImage && (
        <View style={styles.diagramContainer}>
          <Text variant="titleSmall" style={styles.diagramTitle}>
            Muscles Worked
          </Text>
          <Text variant="bodySmall" style={styles.diagramNote}>
            (Placeholder - diagram would appear here)
          </Text>
        </View>
      )}

      {/* Candidates */}
      <View style={styles.candidatesContainer}>
        <Text variant="bodyMedium" style={styles.candidatesLabel}>
          {lowConfidence
            ? 'We were not confident in this match. Please confirm or choose the correct machine:'
            : 'Not correct? Choose another machine:'}
        </Text>
        {typeof confidence === 'number' && (
          <Text variant="bodySmall" style={styles.confidenceText}>
            Confidence: {(confidence * 100).toFixed(0)}% {source === 'fallback' ? '(fallback)' : ''}
          </Text>
        )}
        <View style={styles.candidatesChips}>
          {candidates.map(candidate => (
            <Chip
              key={candidate.id}
              mode="outlined"
              onPress={() => handleCandidatePress(candidate.id)}
              style={styles.candidateChip}
            >
              {candidate.name}
            </Chip>
          ))}
        </View>
        <PrimaryButton
          label="Pick from full list"
          mode="outlined"
          icon="magnify"
          onPress={() => setIsPickerVisible(true)}
        />
      </View>

      <Divider />

      {/* Setup Steps */}
      <SectionHeader title="Setup" />
      <View style={styles.section}>
        {currentMachine.setupSteps.map((step, index) => (
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
        {currentMachine.howToSteps.map((step, index) => (
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
        {currentMachine.commonMistakes.map((mistake, index) => (
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
        {currentMachine.safetyTips.map((tip, index) => (
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
        {currentMachine.beginnerTips.map((tip, index) => (
          <View key={index} style={styles.bulletRow}>
            <Text style={styles.bullet}>💡</Text>
            <Text variant="bodyMedium" style={styles.bulletText}>
              {tip}
            </Text>
          </View>
        ))}
      </View>

      <MachinePickerModal
        visible={isPickerVisible}
        machines={machines}
        selectedMachineId={currentMachineId}
        onSelect={handleCandidatePress}
        onDismiss={() => setIsPickerVisible(false)}
      />

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
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
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
  diagramContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  diagramTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  diagramNote: {
    color: '#999',
    fontStyle: 'italic',
  },
  candidatesContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  candidatesLabel: {
    marginBottom: 12,
    fontWeight: '600',
  },
  confidenceText: {
    marginBottom: 12,
    color: '#777',
  },
  candidatesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateChip: {
    marginRight: 8,
    marginBottom: 8,
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
