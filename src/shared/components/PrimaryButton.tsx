// Reusable primary button component with consistent touch handling

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { colors } from '@shared/theme';

import { styles } from './PrimaryButton.styles';

type ButtonMode = 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  mode?: ButtonMode;
  style?: StyleProp<ViewStyle>;
}

export default function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  mode = 'contained',
  style,
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
      style={[styles.wrapper, style]}
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
