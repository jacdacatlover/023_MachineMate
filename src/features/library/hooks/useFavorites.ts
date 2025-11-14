import { useCallback, useMemo, useEffect, useState, useRef } from 'react';

import { useMachines } from '@app/providers/MachinesProvider';

import { useAsyncStorage } from '@shared/hooks/useAsyncStorage';
import { createLogger } from '@shared/logger';
import { filterValidMachineIds, validateMachineId } from '@shared/services/validation';

import { FavoritesSchema } from '@typings/validation';

import * as favoritesApi from '../services/favoritesApi';

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
 * Uses backend API with AsyncStorage as cache:
 * - Syncs with backend on mount
 * - Optimistically updates local cache
 * - Falls back to cached data on network errors
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
  const [isSyncing, setIsSyncing] = useState(false);
  const isCleaningRef = useRef(false);

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
    isLoading: isLoadingCache,
    error: cacheError,
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

  // Persist cleaned data if invalid IDs were filtered out
  useEffect(() => {
    // Only run after loading completes and sync is done
    if (isLoadingCache || isSyncing || isCleaningRef.current) {
      return;
    }

    // Check if cleanup is needed (rawFavorites has invalid IDs)
    if (rawFavorites.length > 0 && favorites.length !== rawFavorites.length) {
      isCleaningRef.current = true;

      logger.debug('Persisting cleaned favorites', {
        before: rawFavorites.length,
        after: favorites.length,
        removed: rawFavorites.length - favorites.length,
      });

      setData(favorites)
        .catch((err) => {
          logger.error('Failed to persist cleaned favorites', { error: err });
        })
        .finally(() => {
          isCleaningRef.current = false;
        });
    }
  }, [rawFavorites, favorites, isLoadingCache, isSyncing, setData]);

  // Sync with backend on mount
  useEffect(() => {
    let isMounted = true;

    async function syncFavorites() {
      try {
        setIsSyncing(true);
        const backendFavorites = await favoritesApi.getFavorites();

        if (isMounted) {
          // Update cache with backend data
          await setData(backendFavorites);
          logger.info('Synced favorites from backend', { count: backendFavorites.length });
        }
      } catch (error) {
        // On network error, use cached data (already loaded by useAsyncStorage)
        logger.warn('Failed to sync favorites from backend, using cached data', { error });
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    syncFavorites();

    return () => {
      isMounted = false;
    };
  }, [setData]);

  const addFavorite = useCallback(
    async (machineId: string) => {
      try {
        validateMachineId(machineId, machines);

        if (favorites.includes(machineId)) {
          logger.debug(`Machine ${machineId} is already in favorites`);
          return;
        }

        const newFavorites = [...favorites, machineId];

        // Optimistically update cache
        await setData(newFavorites);

        // Sync to backend
        try {
          await favoritesApi.addFavorite(machineId);
          logger.info(`Added machine ${machineId} to favorites`);
        } catch (backendError) {
          // Rollback on backend failure
          await setData(favorites);
          logger.error('Failed to sync favorite to backend, rolled back', { backendError });
          throw backendError;
        }
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

        // Optimistically update cache
        await setData(newFavorites);

        // Sync to backend
        try {
          await favoritesApi.removeFavorite(machineId);
          logger.info(`Removed machine ${machineId} from favorites`);
        } catch (backendError) {
          // Rollback on backend failure
          await setData(favorites);
          logger.error('Failed to sync favorite removal to backend, rolled back', { backendError });
          throw backendError;
        }
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
      // Clear backend first
      try {
        await favoritesApi.clearAllFavorites();
        logger.info('Cleared favorites from backend');
      } catch (backendError) {
        // Log backend error but continue to clear cache
        logger.warn('Failed to clear favorites from backend, clearing cache only', { backendError });
      }

      // Clear local cache
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
    isLoading: isLoadingCache || isSyncing,
    error: cacheError,
  };
}
