import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
    backgroundColor: colors.surface,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
