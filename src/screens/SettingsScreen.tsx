// Settings screen: Clear data and app info

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { clearFavorites } from '../logic/favoritesStorage';
import { clearHistory } from '../logic/historyStorage';
import PrimaryButton from '../components/PrimaryButton';

export default function SettingsScreen() {
  const [isClearing, setIsClearing] = useState(false);

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

  return (
    <ScrollView style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  aboutText: {
    marginBottom: 12,
    color: '#444',
  },
  disclaimerBox: {
    backgroundColor: '#fff9e6',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    padding: 16,
    borderRadius: 4,
  },
  disclaimerText: {
    marginBottom: 12,
    color: '#444',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
});
