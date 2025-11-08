import { StyleSheet } from 'react-native';

import { colors } from '@shared/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
    color: colors.text,
  },
  permissionText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bottomControls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textButton: {
    width: 80,
    alignItems: 'center',
  },
  textButtonDisabled: {
    opacity: 0.5,
  },
  textButtonLabel: {
    color: colors.white,
    fontSize: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
});
