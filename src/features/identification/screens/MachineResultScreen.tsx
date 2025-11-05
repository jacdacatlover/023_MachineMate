// Machine Result screen: Shows identified machine with photo and alternatives

import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../../types/navigation';
import { useMachines } from '../../../app/providers/MachinesProvider';
import { MachineDefinition } from '../../../types/machine';
import {
  CatalogIdentificationResult,
  GenericLabelResult,
  NotGymResult,
  isCatalogResult,
  isGenericLabelResult,
  isNotGymResult,
} from '../../../types/identification';
import {
  toggleFavorite,
  isFavorite as checkIsFavorite,
} from '../../../services/storage/favoritesStorage';
import { addToRecentHistory } from '../../../services/storage/historyStorage';
import SectionHeader from '../../../shared/components/SectionHeader';
import PrimaryButton from '../../../shared/components/PrimaryButton';
import MachinePickerModal from '../components/MachinePickerModal';
import { AnimatedBodyHighlighter } from '../../../shared/components/AnimatedBodyHighlighter';

type MachineResultScreenRouteProp = RouteProp<HomeStackParamList, 'MachineResult'>;

export default function MachineResultScreen() {
  const route = useRoute<MachineResultScreenRouteProp>();
  const { photoUri: routePhotoUri, result } = route.params;
  const machines = useMachines();

  const catalogResult = isCatalogResult(result) ? result : null;
  const genericResult = isGenericLabelResult(result) ? result : null;
  const notGymResult = isNotGymResult(result) ? result : null;
  const photoUri = result.photoUri ?? routePhotoUri;

  const [currentMachineId, setCurrentMachineId] = useState<string | null>(
    catalogResult ? catalogResult.machineId : null
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const autoOpenPicker = useMemo(() => shouldAutoOpenPicker(catalogResult), [catalogResult]);
  const [isPickerVisible, setIsPickerVisible] = useState(autoOpenPicker);

  const currentMachine = useMemo(
    () => machines.find(machine => machine.id === currentMachineId),
    [currentMachineId, machines]
  );
  const candidates = useMemo(
    () => buildCandidateList(machines, catalogResult),
    [machines, catalogResult]
  );
  const manualPrompt = useMemo(
    () => deriveManualPrompt(currentMachine, genericResult, notGymResult),
    [currentMachine, genericResult, notGymResult]
  );
  const candidatePromptText = useMemo(
    () => deriveCandidatePrompt(catalogResult, genericResult),
    [catalogResult, genericResult]
  );
  const confidenceCaption = useMemo(
    () => deriveConfidenceCaption(catalogResult, genericResult, notGymResult),
    [catalogResult, genericResult, notGymResult]
  );

  useEffect(() => {
    if (!currentMachineId) {
      setIsFavorite(false);
      return;
    }

    const run = async () => {
      const favStatus = await checkIsFavorite(currentMachineId);
      setIsFavorite(favStatus);
      await addToRecentHistory(currentMachineId);
    };

    run();
  }, [currentMachineId]);

  useEffect(() => {
    if (autoOpenPicker) {
      setIsPickerVisible(true);
    }
  }, [autoOpenPicker]);

  const handleToggleFavorite = async () => {
    if (!currentMachineId) return;
    await toggleFavorite(currentMachineId);
    setIsFavorite(prev => !prev);
  };

  const handleCandidatePress = (machineId: string) => {
    setCurrentMachineId(machineId);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Photo thumbnail */}
      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
      )}

      {manualPrompt.shouldShow && (
        <View style={styles.unmatchedContainer}>
          <Text variant="titleMedium" style={styles.unmatchedTitle}>
            {manualPrompt.title}
          </Text>
          <Text variant="bodyMedium" style={styles.unmatchedBody}>
            {manualPrompt.body}
          </Text>
          {manualPrompt.chips.map(chip => (
            <Chip key={chip.id} mode="outlined" style={styles.genericChip}>
              {chip.label}
            </Chip>
          ))}
          <PrimaryButton
            label="Choose a Machine"
            icon="magnify"
            mode="outlined"
            onPress={() => setIsPickerVisible(true)}
          />
        </View>
      )}

      {/* Machine info header */}
      {currentMachine && (
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
      )}

      {/* Professional Muscle Diagram with Animated Highlighting */}
      {currentMachine && (
        <>
          <View style={styles.diagramSection}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Muscles Worked
            </Text>
            <AnimatedBodyHighlighter
              primaryMuscles={currentMachine.primaryMuscles}
              secondaryMuscles={currentMachine.secondaryMuscles}
              cycleDuration={3000}
            />
          </View>

          <Divider />
        </>
      )}

      {/* Candidates */}
      <View style={styles.candidatesContainer}>
        <Text variant="bodyMedium" style={styles.candidatesLabel}>
          {candidatePromptText}
        </Text>
        {confidenceCaption && (
          <Text variant="bodySmall" style={styles.confidenceText}>
            {confidenceCaption}
          </Text>
        )}
        <View style={styles.candidatesChips}>
          {candidates.map(candidate => (
            <Chip
              key={candidate.id}
              mode="outlined"
              selected={candidate.id === currentMachineId}
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

      {currentMachine && (
        <>
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

          <Divider />

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
        </>
      )}

      <MachinePickerModal
        visible={isPickerVisible}
        machines={machines}
        selectedMachineId={currentMachineId}
        onSelect={machineId => {
          setCurrentMachineId(machineId);
          setIsPickerVisible(false);
        }}
        onDismiss={() => setIsPickerVisible(false)}
      />

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

type ManualPrompt = {
  shouldShow: boolean;
  title: string;
  body: string;
  chips: Array<{ id: string; label: string }>;
};

function shouldAutoOpenPicker(result: CatalogIdentificationResult | null): boolean {
  if (!result) {
    return true;
  }
  if (result.source === 'fallback') {
    return false;
  }
  return result.lowConfidence;
}

function buildCandidateList(
  machines: MachineDefinition[],
  catalogResult: CatalogIdentificationResult | null
): MachineDefinition[] {
  if (!catalogResult) {
    return [...machines].sort((a, b) => a.name.localeCompare(b.name));
  }

  const seen = new Set<string>();
  const resolved: MachineDefinition[] = [];

  catalogResult.candidates.forEach(id => {
    const match = machines.find(machine => machine.id === id);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      resolved.push(match);
    }
  });

  [...machines]
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(machine => {
      if (!seen.has(machine.id)) {
        seen.add(machine.id);
        resolved.push(machine);
      }
    });

  return resolved;
}

function deriveManualPrompt(
  currentMachine: MachineDefinition | undefined,
  genericResult: GenericLabelResult | null,
  notGymResult: NotGymResult | null
): ManualPrompt {
  if (!currentMachine || genericResult || notGymResult) {
    const chips: ManualPrompt['chips'] = [];

    if (genericResult) {
      chips.push({
        id: 'generic_suggestion',
        label: `Suggested: ${genericResult.labelName}`,
      });
    }

    if (notGymResult) {
      chips.push({
        id: 'not_gym_confidence',
        label: `Confidence it is not a gym machine: ${formatPercent(notGymResult.confidence)}`,
      });
    }

    if (notGymResult) {
      return {
        shouldShow: true,
        title: "Doesn't look like a gym machine",
        body: 'Try retaking the photo with the full machine in view, or choose the correct machine from the list.',
        chips,
      };
    }

    if (genericResult) {
      return {
        shouldShow: true,
        title: 'Identified machine not in catalog',
        body: `We think this might be a ${genericResult.labelName}, but it is not in our guides yet. Pick the closest match from the list so we can show helpful instructions.`,
        chips,
      };
    }

    return {
      shouldShow: true,
      title: "We couldn't identify this machine automatically.",
      body: 'Please pick the correct machine from the list so we can show the right guide.',
      chips,
    };
  }

  return {
    shouldShow: false,
    title: '',
    body: '',
    chips: [],
  };
}

function deriveCandidatePrompt(
  catalogResult: CatalogIdentificationResult | null,
  genericResult: GenericLabelResult | null
): string {
  if (catalogResult) {
    return catalogResult.lowConfidence
      ? 'We were not confident in this match. Please confirm or choose the correct machine:'
      : 'Not correct? Choose another machine:';
  }

  if (genericResult) {
    return 'Pick the closest match from our catalog:';
  }

  return 'Select the correct gym machine from our catalog:';
}

function deriveConfidenceCaption(
  catalogResult: CatalogIdentificationResult | null,
  genericResult: GenericLabelResult | null,
  notGymResult: NotGymResult | null
): string | null {
  if (catalogResult && typeof catalogResult.confidence === 'number') {
    const suffix = catalogResult.source === 'fallback' ? ' (fallback)' : '';
    return `Confidence: ${formatPercent(catalogResult.confidence)}${suffix}`;
  }

  if (genericResult) {
    return `Confidence: ${formatPercent(genericResult.confidence)}`;
  }

  if (notGymResult) {
    return `Confidence it is not a gym machine: ${formatPercent(notGymResult.confidence)}`;
  }

  return null;
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  unmatchedContainer: {
    padding: 24,
    backgroundColor: '#fff8e1',
  },
  unmatchedTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  unmatchedBody: {
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  genericChip: {
    alignSelf: 'center',
    marginBottom: 12,
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
  animationSection: {
    padding: 16,
    backgroundColor: '#fafafa',
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
