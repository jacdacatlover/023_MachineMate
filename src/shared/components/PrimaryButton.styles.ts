import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    alignSelf: 'stretch',
  },
  button: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContained: {
    backgroundColor: colors.primary,
  },
  buttonContainedTonal: {
    backgroundColor: colors.primaryDark,
  },
  buttonOutlined: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  icon: {
    marginRight: 4,
  },
});
