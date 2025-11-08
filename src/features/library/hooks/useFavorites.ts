import { useCallback, useMemo } from 'react';

import { useMachines } from '@app/providers/MachinesProvider';

import { useAsyncStorage } from '@shared/hooks/useAsyncStorage';
import { createLogger } from '@shared/logger';
import { filterValidMachineIds, validateMachineId } from '@shared/services/validation';

import { FavoritesSchema } from '@typings/validation';

const logger = createLogger('hooks.useFavorites');

const FAVORITES_STORAGE_KEY = '@machinemate_favorites';

interface UseFavoritesReturn {
  /**
   * Array of favorited machine IDs
   */
  favorites: string[];
  /**
   * Add a machine to favorites
   */
  addFavorite: (machineId: string) => Promise<void>;
  /**
   * Remove a machine from favorites
   */
  removeFavorite: (machineId: string) => Promise<void>;
  /**
   * Check if a machine is favorited
   */
  isFavorite: (machineId: string) => boolean;
  /**
   * Toggle favorite status for a machine
   */
  toggleFavorite: (machineId: string) => Promise<void>;
  /**
   * Clear all favorites
   */
  clearFavorites: () => Promise<void>;
  /**
   * Loading state during initial fetch
   */
  isLoading: boolean;
  /**
   * Error state
   */
  error: Error | null;
}

/**
 * Hook for managing favorite machines
 *
 * Uses AsyncStorage with:
 * - Zod schema validation
 * - Machine catalog validation
 * - Automatic cleanup of invalid machine IDs
 * - Type-safe operations
 *
 * @example
 * ```tsx
 * function MachineCard({ machineId }) {
 *   const { isFavorite, toggleFavorite } = useFavorites();
 *
 *   return (
 *     <Card>
 *       <IconButton
 *         icon={isFavorite(machineId) ? 'heart' : 'heart-outline'}
 *         onPress={() => toggleFavorite(machineId)}
 *       />
 *     </Card>
 *   );
 * }
 * ```
 */
export function useFavorites(): UseFavoritesReturn {
  const machines = useMachines();
  const handleFavoritesValueChange = useCallback(
    (favorites: string[]) => {
      // Automatically clean up invalid machine IDs when data loads
      const validIds = filterValidMachineIds(favorites, machines);
      if (validIds.length !== favorites.length) {
        logger.info(
          `Cleaned up ${favorites.length - validIds.length} invalid favorite(s)`
        );
      }
    },
    [machines]
  );

  const {
    data: rawFavorites,
    setData,
    clearData,
    isLoading,
    error,
  } = useAsyncStorage<string[]>({
    key: FAVORITES_STORAGE_KEY,
    schema: FavoritesSchema,
    defaultValue: [],
    onValueChange: handleFavoritesValueChange,
  });

  // Filter out any invalid machine IDs from the stored favorites
  const favorites = useMemo(
    () => filterValidMachineIds(rawFavorites, machines),
    [rawFavorites, machines]
  );

  const addFavorite = useCallback(
    async (machineId: string) => {
      try {
        validateMachineId(machineId, machines);

        if (favorites.includes(machineId)) {
          logger.debug(`Machine ${machineId} is already in favorites`);
          return;
        }

        await setData([...favorites, machineId]);
        logger.info(`Added machine ${machineId} to favorites`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add favorite');
        logger.error('Failed to add favorite', error);
        throw error;
      }
    },
    [favorites, machines, setData]
  );

  const removeFavorite = useCallback(
    async (machineId: string) => {
      try {
        const newFavorites = favorites.filter((id) => id !== machineId);

        if (newFavorites.length === favorites.length) {
          logger.debug(`Machine ${machineId} is not in favorites`);
          return;
        }

        await setData(newFavorites);
        logger.info(`Removed machine ${machineId} from favorites`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove favorite');
        logger.error('Failed to remove favorite', error);
        throw error;
      }
    },
    [favorites, setData]
  );

  const isFavorite = useCallback(
    (machineId: string): boolean => {
      return favorites.includes(machineId);
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (machineId: string) => {
      if (isFavorite(machineId)) {
        await removeFavorite(machineId);
      } else {
        await addFavorite(machineId);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  const clearFavorites = useCallback(async () => {
    try {
      await clearData();
      logger.info('Cleared all favorites');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear favorites');
      logger.error('Failed to clear favorites', error);
      throw error;
    }
  }, [clearData]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    isLoading,
    error,
  };
}
