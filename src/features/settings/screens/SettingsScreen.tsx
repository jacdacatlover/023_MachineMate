// Settings screen: Clear data, adjust recognition preferences, and app info

import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, Divider, TextInput, HelperText } from 'react-native-paper';

import { useRecognitionSettings } from '@app/providers/RecognitionSettingsProvider';
import { useSession } from '@features/auth';
import { useFavorites } from '@features/library/hooks/useFavorites';
import { useRecentHistory } from '@features/library/hooks/useRecentHistory';

import PrimaryButton from '@shared/components/PrimaryButton';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  MAX_CONFIDENCE_THRESHOLD,
  MIN_CONFIDENCE_THRESHOLD,
} from '@shared/constants/recognition';

import { styles } from './SettingsScreen.styles';

const formatPercent = (value: number): string => Math.round(value * 100).toString();
const MIN_CONFIDENCE_PERCENT = Math.round(MIN_CONFIDENCE_THRESHOLD * 100);
const MAX_CONFIDENCE_PERCENT = Math.round(MAX_CONFIDENCE_THRESHOLD * 100);
const DEFAULT_CONFIDENCE_PERCENT = formatPercent(DEFAULT_CONFIDENCE_THRESHOLD);

export default function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const { signOut, isLoading } = useSession();
  const {
    confidenceThreshold,
    setConfidenceThreshold,
    resetConfidenceThreshold,
    isLoading: isConfidenceLoading,
  } = useRecognitionSettings();
  const [confidenceInput, setConfidenceInput] = useState(formatPercent(confidenceThreshold));
  const [confidenceError, setConfidenceError] = useState<string | null>(null);
  const [isSavingConfidence, setIsSavingConfidence] = useState(false);

  // Use hooks for clearing data - these now sync with backend
  const { clearFavorites } = useFavorites();
  const { clearHistory } = useRecentHistory();

  useEffect(() => {
    setConfidenceInput(formatPercent(confidenceThreshold));
  }, [confidenceThreshold]);

  const handleClearFavorites = () => {
    Alert.alert(
      'Clear Favorites',
      'Are you sure you want to remove all favorited machines? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await clearFavorites();
            setIsClearing(false);
            Alert.alert('Success', 'All favorites have been cleared.');
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Recent History',
      'Are you sure you want to clear your recent machines history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await clearHistory();
            setIsClearing(false);
            Alert.alert('Success', 'Recent history has been cleared.');
          },
        },
      ]
    );
  };

  const handleSaveConfidence = async () => {
    const parsedPercent = Number(confidenceInput);
    if (!Number.isFinite(parsedPercent)) {
      setConfidenceError('Enter a numeric percentage.');
      return;
    }

    const normalized = parsedPercent / 100;
    if (normalized < MIN_CONFIDENCE_THRESHOLD || normalized > MAX_CONFIDENCE_THRESHOLD) {
      setConfidenceError(
        `Please enter a value between ${MIN_CONFIDENCE_PERCENT}% and ${MAX_CONFIDENCE_PERCENT}%.`
      );
      return;
    }

    setIsSavingConfidence(true);
    try {
      await setConfidenceThreshold(normalized);
      setConfidenceError(null);
    } catch (error) {
      Alert.alert('Update Failed', 'We could not save the confidence level. Please try again.');
    } finally {
      setIsSavingConfidence(false);
    }
  };

  const handleResetConfidence = async () => {
    setIsSavingConfidence(true);
    try {
      await resetConfidenceThreshold();
      setConfidenceInput(DEFAULT_CONFIDENCE_PERCENT);
      setConfidenceError(null);
    } catch (error) {
      Alert.alert('Reset Failed', 'We could not reset the confidence level. Please try again.');
    } finally {
      setIsSavingConfidence(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your favorites and history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by auth state change
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const isBusy = isConfidenceLoading || isSavingConfidence;
  const isSavedDefault =
    Math.abs(confidenceThreshold - DEFAULT_CONFIDENCE_THRESHOLD) < Number.EPSILON;
  const isInputDefault = confidenceInput.trim() === DEFAULT_CONFIDENCE_PERCENT;

  const saveDisabled = isBusy;
  const resetDisabled = isBusy || (isSavedDefault && isInputDefault);

  return (
    <ScrollView style={styles.container}>
      {/* Recognition Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Recognition Confidence
        </Text>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          Choose how confident MachineMate must be before automatically selecting a machine. Lower
          percentages can surface more matches but may mislabel equipment.
        </Text>
        <TextInput
          label="Minimum confidence (%)"
          mode="outlined"
          keyboardType="numeric"
          value={confidenceInput}
          onChangeText={text => {
            setConfidenceInput(text);
            setConfidenceError(null);
          }}
          disabled={isConfidenceLoading}
          returnKeyType="done"
          style={styles.input}
        />
        <HelperText type={confidenceError ? 'error' : 'info'} style={styles.helperText}>
          {confidenceError ??
            `Valid range: ${MIN_CONFIDENCE_PERCENT}%–${MAX_CONFIDENCE_PERCENT}%. Current threshold: ${formatPercent(
              confidenceThreshold
            )}%.`}
        </HelperText>
        <View style={styles.buttonSpacer}>
          <PrimaryButton
            label="Save Confidence"
            icon="content-save"
            onPress={handleSaveConfidence}
            loading={isSavingConfidence}
            disabled={saveDisabled}
          />
        </View>
        <View style={styles.buttonSpacer}>
          <PrimaryButton
            label="Reset to Default"
            icon="backup-restore"
            mode="outlined"
            onPress={handleResetConfidence}
            disabled={resetDisabled}
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Account Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account
        </Text>
        <PrimaryButton
          label="Sign Out"
          icon="logout"
          mode="outlined"
          onPress={handleSignOut}
          disabled={isLoading}
        />
      </View>

      <Divider style={styles.divider} />

      {/* Data Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Data
        </Text>
        <Text variant="bodyMedium" style={styles.sectionDescription}>
          Manage your app data stored locally on this device.
        </Text>
        <PrimaryButton
          label="Clear Favorites"
          icon="star-off"
          mode="outlined"
          onPress={handleClearFavorites}
          disabled={isClearing}
        />
        <PrimaryButton
          label="Clear Recent History"
          icon="history"
          mode="outlined"
          onPress={handleClearHistory}
          disabled={isClearing}
        />
      </View>

      <Divider style={styles.divider} />

      {/* About Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          About MachineMate
        </Text>
        <Text variant="bodyMedium" style={styles.aboutText}>
          MachineMate is designed to help gym beginners learn how to use gym machines safely and
          correctly.
        </Text>
        <Text variant="bodyMedium" style={styles.aboutText}>
          Version 1.0.0 (MVP)
        </Text>
      </View>

      <Divider style={styles.divider} />

      {/* Disclaimer Section */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Important Disclaimer
        </Text>
        <View style={styles.disclaimerBox}>
          <Text variant="bodyMedium" style={styles.disclaimerText}>
            ⚠️ MachineMate provides general gym machine guidance only.
          </Text>
          <Text variant="bodyMedium" style={styles.disclaimerText}>
            This app is NOT medical advice and is not a substitute for guidance from a qualified
            personal trainer or fitness professional.
          </Text>
          <Text variant="bodyMedium" style={styles.disclaimerText}>
            If you are unsure about proper form, have any injuries, or health concerns, please
            consult with a qualified coach, personal trainer, or gym staff member before using any
            equipment.
          </Text>
          <Text variant="bodyMedium" style={styles.disclaimerText}>
            Always start with lighter weights and focus on proper form to avoid injury.
          </Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}
