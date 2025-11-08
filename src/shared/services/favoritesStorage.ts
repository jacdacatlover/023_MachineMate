// Storage logic for managing favorite machines using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';

import { FavoritesSchema } from '@typings/validation';

const FAVORITES_KEY = '@machinemate_favorites';

/**
 * Get the list of favorited machine IDs
 * Validates data from AsyncStorage and returns empty array if corrupted
 */
export async function getFavorites(): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!value) return [];

    const parsed = JSON.parse(value);
    const validated = FavoritesSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('Error reading/validating favorites, clearing corrupted data:', error);
    // Clear corrupted data
    await AsyncStorage.removeItem(FAVORITES_KEY).catch(() => {});
    return [];
  }
}

/**
 * Save the list of favorited machine IDs
 * Validates input before saving
 */
export async function setFavorites(ids: string[]): Promise<void> {
  try {
    const validated = FavoritesSchema.parse(ids);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(validated));
  } catch (error) {
    console.error('Error validating/saving favorites:', error);
    throw error;
  }
}

/**
 * Toggle favorite status for a machine ID
 * Returns the updated list of favorites
 */
export async function toggleFavorite(id: string): Promise<string[]> {
  const favorites = await getFavorites();
  const index = favorites.indexOf(id);

  if (index >= 0) {
    // Remove from favorites
    favorites.splice(index, 1);
  } else {
    // Add to favorites
    favorites.push(id);
  }

  await setFavorites(favorites);
  return favorites;
}

/**
 * Check if a machine is favorited
 */
export async function isFavorite(id: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(id);
}

/**
 * Clear all favorites
 */
export async function clearFavorites(): Promise<void> {
  await setFavorites([]);
}
