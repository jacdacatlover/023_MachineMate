// Machine Result screen: Shows identified machine with photo and alternatives

import { useRoute, RouteProp } from '@react-navigation/native';
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { Text, IconButton, Chip, Divider } from 'react-native-paper';

import { useMachines } from '@app/providers/MachinesProvider';

import { AnimatedBodyHighlighter } from '@shared/components/AnimatedBodyHighlighter';
import SectionHeader from '@shared/components/SectionHeader';
import {
  toggleFavorite,
  isFavorite as checkIsFavorite,
} from '@shared/services/favoritesStorage';
import { addToRecentHistory } from '@shared/services/historyStorage';
import { validateMachineId } from '@shared/services/validation';
import { colors } from '@shared/theme';

import {
  CatalogIdentificationResult,
  GenericLabelResult,
  isCatalogResult,
  isGenericLabelResult,
} from '@typings/identification';
import { MachineDefinition } from '@typings/machine';
import { HomeStackParamList } from '@typings/navigation';

import { styles } from './MachineResultScreen.styles';

type MachineResultScreenRouteProp = RouteProp<HomeStackParamList, 'MachineResult'>;

export default function MachineResultScreen() {
  const route = useRoute<MachineResultScreenRouteProp>();
  const { photoUri: routePhotoUri, result } = route.params;
  const machines = useMachines();

  const catalogResult = isCatalogResult(result) ? result : null;
  const genericResult = isGenericLabelResult(result) ? result : null;
  const photoUri = result.photoUri ?? routePhotoUri;

  const currentMachineId = useMemo(
    () => (catalogResult ? catalogResult.machineId : null),
    [catalogResult]
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
    let isMounted = true;

    const run = async () => {
      if (!currentMachineId) {
        if (isMounted) {
          setIsFavorite(false);
        }
        return;
      }

      try {
        validateMachineId(currentMachineId, machines);
        const favStatus = await checkIsFavorite(currentMachineId);
        if (isMounted) {
          setIsFavorite(favStatus);
        }
        await addToRecentHistory(currentMachineId);
      } catch (error) {
        console.error('Error loading machine data:', error);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [currentMachineId, machines]);

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
      const confidenceLine = describeConfidenceContext(
        genericResult.confidence,
        genericResult.confidenceThreshold
      );

      return {
        shouldShow: true,
        title:
          genericResult.source === 'fallback'
            ? "We couldn't identify this machine automatically."
            : 'Identified machine not in catalog',
        body:
          (confidenceLine ? `${confidenceLine}. ` : '') +
          (genericResult.source === 'fallback'
            ? 'Retake the photo so the equipment is centered and well lit.'
            : `We think this might be a ${genericResult.labelName}, but it is not in our guides yet. Try another photo once that machine is available.`),
      };
    }

    return {
      shouldShow: true,
      title: "We couldn't identify this machine automatically.",
      body: 'Retake the photo so the equipment is centered and well lit.',
    };
  }

  if (catalogResult?.lowConfidence) {
    const confidenceLine = describeConfidenceContext(
      catalogResult.confidence,
      catalogResult.confidenceThreshold
    );

    return {
      shouldShow: true,
      title: "We're not sure about this match.",
      body: `${confidenceLine ? `${confidenceLine}. ` : ''}Try taking another photo so we can confirm the machine automatically.`,
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
    const details: string[] = [];
    if (typeof catalogResult.confidenceThreshold === 'number') {
      details.push(`min ${formatPercent(catalogResult.confidenceThreshold)}`);
    }
    if (catalogResult.source === 'fallback') {
      details.push('fallback');
    }
    const suffix = details.length ? ` (${details.join(', ')})` : '';
    return `Confidence: ${formatPercent(catalogResult.confidence)}${suffix}`;
  }

  if (genericResult) {
    const details: string[] = [];
    if (typeof genericResult.confidenceThreshold === 'number') {
      details.push(`min ${formatPercent(genericResult.confidenceThreshold)}`);
    }
    const suffix = details.length ? ` (${details.join(', ')})` : '';
    return `Confidence: ${formatPercent(genericResult.confidence)}${suffix}`;
  }

  return null;
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
}

function describeConfidenceContext(
  confidence: number | null | undefined,
  threshold: number | null | undefined
): string | null {
  const hasConfidence = typeof confidence === 'number';
  const hasThreshold = typeof threshold === 'number';

  if (hasConfidence && hasThreshold) {
    return `${formatPercent(confidence)} confidence (needs ${formatPercent(threshold)}+)`;
  }

  if (hasConfidence) {
    return `${formatPercent(confidence)} confidence`;
  }

  if (hasThreshold) {
    return `Needs ${formatPercent(threshold)}+ confidence`;
  }

  return null;
}
