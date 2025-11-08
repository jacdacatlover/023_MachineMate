import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  chip: {
    alignSelf: 'flex-start',
    height: 24,
  },
  chipText: {
    fontSize: 12,
    marginVertical: 0,
  },
});
