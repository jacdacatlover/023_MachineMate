/**
 * AnimatedBodyHighlighter Component
 *
 * Professional muscle diagram using react-native-body-highlighter with animated
 * pulsing effects on muscles being worked.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Body from 'react-native-body-highlighter';
import { colors } from '../theme';

type BodyPartName =
  | 'trapezius'
  | 'upper-back'
  | 'lower-back'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'abs'
  | 'obliques'
  | 'adductors'
  | 'hamstring'
  | 'quadriceps'
  | 'abductors'
  | 'calves'
  | 'gluteal'
  | 'head'
  | 'neck'
  | 'deltoids'
  | 'hands'
  | 'knees'
  | 'feet'
  | 'tibialis';

/**
 * Maps our muscle terminology to body-highlighter's body part names
 */
const MUSCLE_TO_BODYPART_MAP: Record<string, BodyPartName[]> = {
  // Lower Body
  Quadriceps: ['quadriceps'],
  Quads: ['quadriceps'],
  Glutes: ['gluteal'],
  Gluteal: ['gluteal'],
  Hamstrings: ['hamstring'],
  Calves: ['calves'],
  Abductors: ['abductors'],
  Adductors: ['adductors'],
  'Hip Flexors': ['adductors'],

  // Back
  Lats: ['upper-back'],
  Latissimus: ['upper-back'],
  'Upper Back': ['upper-back', 'trapezius'],
  'Middle Back': ['upper-back'],
  'Lower Back': ['lower-back'],
  Trapezius: ['trapezius'],
  Traps: ['trapezius'],
  Rhomboids: ['upper-back'],

  // Chest
  Chest: ['chest'],
  Pectorals: ['chest'],
  Pecs: ['chest'],

  // Shoulders
  Shoulders: ['deltoids'],
  Deltoids: ['deltoids'],
  'Front Delts': ['deltoids'],
  'Side Delts': ['deltoids'],
  'Rear Delts': ['deltoids'],

  // Arms
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Forearms: ['forearm'],

  // Core
  Abs: ['abs'],
  Abdominals: ['abs'],
  Core: ['abs', 'obliques'],
  Obliques: ['obliques'],
};

/**
 * Convert muscle names to body part names for the highlighter
 */
function mapMusclesToBodyParts(muscleNames: string[]): BodyPartName[] {
  const bodyParts: BodyPartName[] = [];

  for (const muscle of muscleNames) {
    const parts = MUSCLE_TO_BODYPART_MAP[muscle];
    if (parts) {
      bodyParts.push(...parts);
    }
  }

  // Remove duplicates
  return Array.from(new Set(bodyParts));
}

/**
 * Determine which body view to show (front or back) based on muscles
 */
function getPreferredBodyView(muscleNames: string[]): 'front' | 'back' {
  const bodyParts = mapMusclesToBodyParts(muscleNames);

  // Back-only muscles
  const backMuscles: BodyPartName[] = ['upper-back', 'lower-back', 'hamstring', 'gluteal'];
  const hasBackMuscles = bodyParts.some((part) => backMuscles.includes(part));

  // If primary muscles are on back, show back view
  if (hasBackMuscles && bodyParts.length <= 3) {
    return 'back';
  }

  // Default to front view (shows more muscles)
  return 'front';
}

interface AnimatedBodyHighlighterProps {
  /**
   * Primary muscles being worked
   */
  primaryMuscles: string[];

  /**
   * Secondary muscles being worked
   */
  secondaryMuscles?: string[];

  /**
   * Animation cycle duration in milliseconds
   */
  cycleDuration?: number;

  /**
   * Gender for body model
   */
  gender?: 'male' | 'female';

  /**
   * Force specific body view (auto-detect if not specified)
   */
  view?: 'front' | 'back';
}

/**
 * Professional anatomical muscle diagram with animated highlighting
 */
export const AnimatedBodyHighlighter: React.FC<AnimatedBodyHighlighterProps> = ({
  primaryMuscles,
  secondaryMuscles = [],
  cycleDuration = 3000,
  gender = 'male',
  view,
}) => {
  // Map muscle names to body part names
  const primaryBodyParts = mapMusclesToBodyParts(primaryMuscles);
  const secondaryBodyParts = mapMusclesToBodyParts(secondaryMuscles);

  // Auto-detect best view if not specified
  const bodyView = view || getPreferredBodyView([...primaryMuscles, ...secondaryMuscles]);

  // Animation values for pulsing effect
  const [highlightIntensity, setHighlightIntensity] = useState(1);

  useEffect(() => {
    // Animate highlight intensity for pulsing effect
    const interval = setInterval(() => {
      setHighlightIntensity((prev) => (prev === 1 ? 0.6 : 1));
    }, cycleDuration / 2);

    return () => clearInterval(interval);
  }, [cycleDuration]);

  // Prepare data for body highlighter
  const bodyData = [
    // Primary muscles - intense red
    ...primaryBodyParts.map((slug: BodyPartName) => ({
      slug,
      intensity: highlightIntensity === 1 ? 2 : 1,
    })),
    // Secondary muscles - lighter teal
    ...secondaryBodyParts.map((slug: BodyPartName) => ({
      slug,
      intensity: highlightIntensity === 1 ? 1 : 0.5,
    })),
  ] as any;

  return (
    <View style={styles.container}>
      <View style={styles.bodyContainer}>
        <Body
          data={bodyData}
          gender={gender}
          side={bodyView}
          scale={1.2}
          colors={[colors.primary, colors.accent]} // Hot pink for primary, electric cyan for secondary
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {primaryMuscles.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.primaryColor]} />
            <Text style={styles.legendText}>Primary: {primaryMuscles.join(', ')}</Text>
          </View>
        )}
        {secondaryMuscles.length > 0 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.secondaryColor]} />
            <Text style={styles.legendText}>Secondary: {secondaryMuscles.join(', ')}</Text>
          </View>
        )}
      </View>

      <Text style={styles.viewLabel}>{bodyView === 'front' ? 'Front View' : 'Back View'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  bodyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  legend: {
    marginTop: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  primaryColor: {
    backgroundColor: colors.primary,
  },
  secondaryColor: {
    backgroundColor: colors.accent,
  },
  legendText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  viewLabel: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
