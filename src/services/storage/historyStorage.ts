// Storage logic for managing recent history using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecentHistoryItem } from '../../types/history';

const HISTORY_KEY = '@machinemate_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Get the recent history of viewed machines
 */
export async function getRecentHistory(): Promise<RecentHistoryItem[]> {
  try {
    const value = await AsyncStorage.getItem(HISTORY_KEY);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

/**
 * Add a machine to recent history
 * If the machine was already viewed, updates its timestamp
 * Keeps only the last MAX_HISTORY_ITEMS (20) items
 * Returns the updated history list
 */
export async function addToRecentHistory(machineId: string): Promise<RecentHistoryItem[]> {
  try {
    let history = await getRecentHistory();

    // Remove existing entry for this machine if it exists
    history = history.filter(item => item.machineId !== machineId);

    // Add new entry at the beginning (most recent)
    const newItem: RecentHistoryItem = {
      machineId,
      viewedAt: new Date().toISOString(),
    };
    history.unshift(newItem);

    // Keep only the last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return history;
  } catch (error) {
    console.error('Error adding to history:', error);
    return await getRecentHistory();
  }
}

/**
 * Clear all history
 */
export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}
