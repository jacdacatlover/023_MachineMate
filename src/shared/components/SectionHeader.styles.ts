import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
