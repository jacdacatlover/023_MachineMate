// Reusable primary button component with consistent touch handling

import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ButtonMode = 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  mode?: ButtonMode;
}

const PRIMARY_COLOR = '#6200ee';
const TONAL_COLOR = '#ede7f6';

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

  const labelColor = isContained ? '#fff' : PRIMARY_COLOR;

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
                name={icon as any}
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
    backgroundColor: PRIMARY_COLOR,
  },
  buttonContainedTonal: {
    backgroundColor: TONAL_COLOR,
  },
  buttonOutlined: {
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#fff',
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
