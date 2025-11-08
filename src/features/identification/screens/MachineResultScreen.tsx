// Machine Result screen: Shows identified machine with photo and alternatives

import { useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Image } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';
import {
  toggleFavorite,
  isFavorite as checkIsFavorite,
} from '@shared/services/favoritesStorage';
import { addToRecentHistory } from '@shared/services/historyStorage';
import { validateMachineId } from '@shared/services/validation';
import { AnimatedBodyHighlighter } from '@shared/components/AnimatedBodyHighlighter';
import SectionHeader from '@shared/components/SectionHeader';
import { colors } from '@shared/theme';
import { CatalogIdentificationResult, GenericLabelResult, isCatalogResult, isGenericLabelResult } from 'src/types/identification';
import { MachineDefinition } from 'src/types/machine';
import { HomeStackParamList } from 'src/types/navigation';

type MachineResultScreenRouteProp = RouteProp<HomeStackParamList, 'MachineResult'>;

export default function MachineResultScreen() {
  const route = useRoute<MachineResultScreenRouteProp>();
  const { photoUri: routePhotoUri, result } = route.params;
  const machines = useMachines();

  const catalogResult = isCatalogResult(result) ? result : null;
  const genericResult = isGenericLabelResult(result) ? result : null;
  const photoUri = result.photoUri ?? routePhotoUri;

  const [currentMachineId, setCurrentMachineId] = useState<string | null>(
    catalogResult ? catalogResult.machineId : null
  );
  const [isFavorite, setIsFavorite] = useState(false);

  const currentMachine = useMemo(
    () => machines.find(machine => machine.id === currentMachineId),
    [currentMachineId, machines]
  );
  const manualPrompt = useMemo(
    () => deriveManualPrompt(currentMachine, catalogResult, genericResult),
    [currentMachine, catalogResult, genericResult]
  );
  const confidenceCaption = useMemo(
    () => deriveConfidenceCaption(catalogResult, genericResult),
    [catalogResult, genericResult]
  );

  useEffect(() => {
    if (!currentMachineId) {
      setIsFavorite(false);
      return;
    }

    const run = async () => {
      try {
        // Validate machine ID before adding to history
        validateMachineId(currentMachineId, machines);
        const favStatus = await checkIsFavorite(currentMachineId);
        setIsFavorite(favStatus);
        await addToRecentHistory(currentMachineId);
      } catch (error) {
        console.error('Error loading machine data:', error);
      }
    };

    run();
  }, [currentMachineId]);

  const handleToggleFavorite = async () => {
    if (!currentMachineId) return;
    await toggleFavorite(currentMachineId);
    setIsFavorite(prev => !prev);
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
                iconColor={isFavorite ? colors.warning : colors.textSecondary}
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
      {confidenceCaption && (
        <View style={styles.confidenceContainer}>
          <Text variant="bodySmall" style={styles.confidenceText}>
            {confidenceCaption}
          </Text>
        </View>
      )}

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

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

type ManualPrompt = {
  shouldShow: boolean;
  title: string;
  body: string;
};

function deriveManualPrompt(
  currentMachine: MachineDefinition | undefined,
  catalogResult: CatalogIdentificationResult | null,
  genericResult: GenericLabelResult | null
): ManualPrompt {
  if (!currentMachine || genericResult) {
    if (genericResult) {
      return {
        shouldShow: true,
        title: 'Identified machine not in catalog',
        body: `We think this might be a ${genericResult.labelName}, but it is not in our guides yet. Try another photo once that machine is available.`,
      };
    }

    return {
      shouldShow: true,
      title: "We couldn't identify this machine automatically.",
      body: 'Retake the photo so the equipment is centered and well lit.',
    };
  }

  if (catalogResult?.lowConfidence) {
    return {
      shouldShow: true,
      title: "We're not sure about this match.",
      body: 'Try taking another photo so we can confirm the machine automatically.',
    };
  }

  return {
    shouldShow: false,
    title: '',
    body: '',
  };
}

function deriveConfidenceCaption(
  catalogResult: CatalogIdentificationResult | null,
  genericResult: GenericLabelResult | null
): string | null {
  if (catalogResult && typeof catalogResult.confidence === 'number') {
    const suffix = catalogResult.source === 'fallback' ? ' (fallback)' : '';
    return `Confidence: ${formatPercent(catalogResult.confidence)}${suffix}`;
  }

  if (genericResult) {
    return `Confidence: ${formatPercent(genericResult.confidence)}`;
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
    backgroundColor: colors.background,
  },
  photo: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
  },
  unmatchedContainer: {
    padding: 24,
    backgroundColor: colors.surfaceVariant,
  },
  unmatchedTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: colors.text,
  },
  unmatchedBody: {
    color: colors.textSecondary,
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
    color: colors.text,
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
    color: colors.text,
  },
  muscleText: {
    color: colors.textSecondary,
  },
  difficultyChip: {
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 12,
  },
  beginnerChip: {
    backgroundColor: colors.success + '30',
  },
  intermediateChip: {
    backgroundColor: colors.warning + '30',
  },
  animationSection: {
    padding: 16,
    backgroundColor: colors.surface,
  },
  diagramSection: {
    padding: 16,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: colors.text,
  },
  confidenceContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  confidenceText: {
    textAlign: 'center',
    color: colors.textTertiary,
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
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    color: colors.text,
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
    color: colors.text,
  },
  bottomPadding: {
    height: 32,
  },
});
