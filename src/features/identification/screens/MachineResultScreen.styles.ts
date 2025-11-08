import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
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
