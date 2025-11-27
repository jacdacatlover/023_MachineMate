import { useCallback, useMemo, useEffect, useState, useRef } from 'react';

import { useMachines } from '@app/providers/MachinesProvider';

import { useAsyncStorage } from '@shared/hooks/useAsyncStorage';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';
import { createLogger } from '@shared/logger';
import { filterValidMachineIds, validateMachineId } from '@shared/services/validation';

import { RecentHistoryItem } from '@typings/history';
import { RecentHistorySchema } from '@typings/validation';

import * as historyApi from '../services/historyApi';

const logger = createLogger('hooks.useRecentHistory');

const HISTORY_STORAGE_KEY = '@machinemate_history';
const MAX_HISTORY_ITEMS = 10;

interface UseRecentHistoryReturn {
  /**
   * Array of recent history items (most recent first)
   */
  history: RecentHistoryItem[];
  /**
   * Add a machine to recent history (updates timestamp if already exists)
   */
  addToHistory: (machineId: string) => Promise<void>;
  /**
   * Clear all history
   */
  clearHistory: () => Promise<void>;
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
 * Hook for managing recent history
 *
 * Uses backend API with AsyncStorage as cache:
 * - Syncs with backend on mount
 * - Optimistically updates local cache
 * - Falls back to cached data on network errors
 * - Automatic cleanup of invalid machine IDs
 * - Limit to most recent 10 items
 * - Deduplication (moves existing items to top)
 *
 * @example
 * ```tsx
 * function MachineDetailsScreen({ machineId }) {
 *   const { addToHistory } = useRecentHistory();
 *
 *   useEffect(() => {
 *     // Track when user views machine details
 *     addToHistory(machineId);
 *   }, [machineId, addToHistory]);
 *
 *   return <MachineDetails machineId={machineId} />;
 * }
 *
 * function RecentlyViewedList() {
 *   const { history, isLoading } = useRecentHistory();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <FlatList
 *       data={history}
 *       renderItem={({ item }) => (
 *         <MachineCard machineId={item.machineId} />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
export function useRecentHistory(): UseRecentHistoryReturn {
  const machines = useMachines();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  // Treat null as "unknown/assume online" so we only skip when we know the device is offline
  const canSyncHistory = isConnected !== false && isInternetReachable !== false;
  const [isSyncing, setIsSyncing] = useState(false);
  const isCleaningRef = useRef(false);

  const handleHistoryValueChange = useCallback(
    (history: RecentHistoryItem[]) => {
      // Automatically clean up invalid machine IDs when data loads
      const validMachineIds = filterValidMachineIds(
        history.map((item) => item.machineId),
        machines
      );
      const validHistory = history.filter((item) =>
        validMachineIds.includes(item.machineId)
      );

      if (validHistory.length !== history.length) {
        logger.info(
          `Cleaned up ${history.length - validHistory.length} invalid history item(s)`
        );
      }
    },
    [machines]
  );

  const {
    data: rawHistory,
    setData,
    clearData,
    isLoading: isLoadingCache,
    error: cacheError,
  } = useAsyncStorage<RecentHistoryItem[]>({
    key: HISTORY_STORAGE_KEY,
    schema: RecentHistorySchema,
    defaultValue: [],
    onValueChange: handleHistoryValueChange,
  });

  // Filter out any invalid machine IDs from the stored history
  const history = useMemo(() => {
    const validMachineIds = filterValidMachineIds(
      rawHistory.map((item) => item.machineId),
      machines
    );

    return rawHistory
      .filter((item) => validMachineIds.includes(item.machineId))
      .map((item, index) => {
        const entryId =
          item.entryId ||
          `${item.machineId}-${item.viewedAt || index}-${index}`;
        const viewedAt = item.viewedAt || new Date().toISOString();

        return {
          ...item,
          entryId,
          viewedAt,
        };
      });
  }, [rawHistory, machines]);

  // Persist cleaned data if invalid IDs were filtered out
  useEffect(() => {
    // Only run after loading completes and sync is done
    if (isLoadingCache || isSyncing || isCleaningRef.current) {
      return;
    }

    // Filter to valid machine IDs
    const validMachineIds = filterValidMachineIds(
      rawHistory.map((item) => item.machineId),
      machines
    );

    const needsInvalidIdCleanup = rawHistory.length > validMachineIds.length;
    const needsNormalization = rawHistory.some((item) => !item.entryId || !item.viewedAt);

    if (needsInvalidIdCleanup || needsNormalization) {
      isCleaningRef.current = true;

      // Compute normalized history inline to avoid circular dependency
      const normalizedHistory = rawHistory
        .filter((item) => validMachineIds.includes(item.machineId))
        .map((item, index) => {
          const entryId =
            item.entryId ||
            `${item.machineId}-${item.viewedAt || index}-${index}`;
          const viewedAt = item.viewedAt || new Date().toISOString();

          return {
            ...item,
            entryId,
            viewedAt,
          };
        });

      logger.debug('Persisting cleaned history', {
        before: rawHistory.length,
        after: normalizedHistory.length,
        removed: rawHistory.length - normalizedHistory.length,
      });

      setData(normalizedHistory)
        .catch((err) => {
          logger.error('Failed to persist cleaned history', { error: err });
        })
        .finally(() => {
          isCleaningRef.current = false;
        });
    }
  }, [rawHistory, machines, isLoadingCache, isSyncing, setData]);

  // Sync with backend on mount
  useEffect(() => {
    if (!canSyncHistory) {
      logger.debug('Skipping history sync while offline');
      return;
    }

    let isMounted = true;

    async function syncHistory() {
      try {
        setIsSyncing(true);
        const backendHistory = await historyApi.getHistory();

        if (isMounted) {
          // Update cache with backend data
          await setData(backendHistory);
          logger.info('Synced history from backend', { count: backendHistory.length });
        }
      } catch (error) {
        // On network error, use cached data (already loaded by useAsyncStorage)
        logger.warn('Failed to sync history from backend, using cached data', { error });
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    syncHistory();

    return () => {
      isMounted = false;
    };
  }, [setData, canSyncHistory]);

  const addToHistory = useCallback(
    async (machineId: string) => {
      try {
        validateMachineId(machineId, machines);

        // Add new entry at the beginning (most recent)
        const newItem: RecentHistoryItem = {
          entryId: `${machineId}-${Date.now()}`,
          machineId,
          viewedAt: new Date().toISOString(),
        };

        // Use functional setState to avoid circular dependency
        await setData((currentHistory) => {
          // Remove existing entry for this machine if it exists
          const filteredHistory = currentHistory.filter(
            (item) => item.machineId !== machineId
          );

          const newHistory = [newItem, ...filteredHistory];

          // Keep only the last MAX_HISTORY_ITEMS
          return newHistory.slice(0, MAX_HISTORY_ITEMS);
        });

        // Sync to backend (fire and forget - don't rollback on failure)
        if (!canSyncHistory) {
          logger.debug('Skipping backend history sync while offline', { machineId });
        } else {
          try {
            await historyApi.addToHistory(machineId);
            logger.debug(`Added machine ${machineId} to history`);
          } catch (backendError) {
            // Don't rollback - history is less critical than favorites
            // User's local cache is still updated
            logger.warn('Failed to sync history to backend, continuing with local cache', { backendError });
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add to history');
        logger.error('Failed to add to history', error);
        throw error;
      }
    },
    [canSyncHistory, machines, setData]
  );

  const clearHistory = useCallback(async () => {
    try {
      // Clear backend first
      if (!canSyncHistory) {
        logger.debug('Skipping backend history clear while offline');
      } else {
        try {
          await historyApi.clearAllHistory();
          logger.info('Cleared history from backend');
        } catch (backendError) {
          // Log backend error but continue to clear cache
          logger.warn('Failed to clear history from backend, clearing cache only', { backendError });
        }
      }

      // Clear local cache
      await clearData();
      logger.info('Cleared all history');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
      logger.error('Failed to clear history', error);
      throw error;
    }
  }, [canSyncHistory, clearData]);

  return {
    history,
    addToHistory,
    clearHistory,
    isLoading: isLoadingCache || isSyncing,
    error: cacheError,
  };
}
