// Reusable primary button component with consistent touch handling

import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

type ButtonMode = 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  mode?: ButtonMode;
}

export default function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  mode = 'contained',
}: PrimaryButtonProps) {
  const visualMode: ButtonMode = mode === 'elevated' ? 'contained' : mode;
  const isOutlined = visualMode === 'outlined';
  const isTonal = visualMode === 'contained-tonal';
  const isContained = visualMode === 'contained' || isTonal;

  const containerStyles: ViewStyle[] = [styles.button];
  if (isContained) {
    containerStyles.push(isTonal ? styles.buttonContainedTonal : styles.buttonContained);
  }
  if (isOutlined) {
    containerStyles.push(styles.buttonOutlined);
  }
  if (disabled) {
    containerStyles.push(styles.buttonDisabled);
  }

  const labelColor = isContained ? colors.white : colors.primary;

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled || loading}
    >
      <View style={containerStyles}>
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <>
            {icon && (
              <MaterialCommunityIcons
                name={icon}
                size={20}
                color={labelColor}
                style={styles.icon}
              />
            )}
            <Text
              variant="titleSmall"
              style={[styles.label, { color: labelColor }]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
