import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.text,
  },
  sectionDescription: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  helperText: {
    marginBottom: 8,
  },
  buttonSpacer: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 8,
  },
  aboutText: {
    marginBottom: 12,
    color: colors.text,
  },
  disclaimerBox: {
    backgroundColor: colors.surfaceVariant,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 16,
    borderRadius: 4,
  },
  disclaimerText: {
    marginBottom: 12,
    color: colors.text,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
});
