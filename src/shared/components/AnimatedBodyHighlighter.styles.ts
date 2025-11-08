import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
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
