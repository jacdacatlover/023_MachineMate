import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
