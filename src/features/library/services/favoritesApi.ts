/**
 * Favorites API Service
 *
 * Handles all favorites-related API calls to the backend
 */

import { apiGet, apiPost, apiDelete } from '../../../services/api/apiClient';
import { createLogger } from '../../../shared/logger';
import { MachineDefinition } from '../../../types/machine';

const logger = createLogger('library.favorites');

export interface FavoriteResponse {
  machine_id: string;
  created_at: string;
  notes?: string | null;
  machine?: MachineDefinition | null;
}

export interface FavoriteListResponse {
  favorites: FavoriteResponse[];
  total: number;
}

/**
 * Fetch all favorites for the current user
 */
export async function getFavorites(): Promise<string[]> {
  try {
    const response = await apiGet<FavoriteListResponse>('/api/v1/favorites');
    const favorites = response?.favorites ?? [];

    // Extract just the machine IDs for compatibility with existing code
    return favorites.map(fav => fav.machine_id);
  } catch (error) {
    logger.error('Failed to fetch favorites', { error });
    throw error;
  }
}

/**
 * Add a machine to favorites
 */
export async function addFavorite(machineId: string): Promise<void> {
  try {
    await apiPost('/api/v1/favorites', { machine_id: machineId });
    logger.info('Added favorite', { machineId });
  } catch (error) {
    logger.error('Failed to add favorite', { machineId, error });
    throw error;
  }
}

/**
 * Remove a machine from favorites
 */
export async function removeFavorite(machineId: string): Promise<void> {
  try {
    await apiDelete(`/api/v1/favorites/${machineId}`);
    logger.info('Removed favorite', { machineId });
  } catch (error) {
    logger.error('Failed to remove favorite', { machineId, error });
    throw error;
  }
}

/**
 * Clear all favorites for the current user
 */
export async function clearAllFavorites(): Promise<void> {
  try {
    await apiDelete('/api/v1/favorites');
    logger.info('Cleared all favorites');
  } catch (error) {
    logger.error('Failed to clear all favorites', { error });
    throw error;
  }
}
