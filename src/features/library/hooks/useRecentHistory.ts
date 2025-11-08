import { useCallback, useMemo } from 'react';

import { useMachines } from '@app/providers/MachinesProvider';

import { useAsyncStorage } from '@shared/hooks/useAsyncStorage';
import { createLogger } from '@shared/logger';
import { filterValidMachineIds, validateMachineId } from '@shared/services/validation';

import { RecentHistoryItem } from '@typings/history';
import { RecentHistorySchema } from '@typings/validation';

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
 * Uses AsyncStorage with:
 * - Zod schema validation
 * - Machine catalog validation
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
    isLoading,
    error,
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
    return rawHistory.filter((item) => validMachineIds.includes(item.machineId));
  }, [rawHistory, machines]);

  const addToHistory = useCallback(
    async (machineId: string) => {
      try {
        validateMachineId(machineId, machines);

        // Remove existing entry for this machine if it exists
        const filteredHistory = history.filter(
          (item) => item.machineId !== machineId
        );

        // Add new entry at the beginning (most recent)
        const newItem: RecentHistoryItem = {
          machineId,
          viewedAt: new Date().toISOString(),
        };

        const newHistory = [newItem, ...filteredHistory];

        // Keep only the last MAX_HISTORY_ITEMS
        const trimmedHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

        await setData(trimmedHistory);
        logger.debug(`Added machine ${machineId} to history`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add to history');
        logger.error('Failed to add to history', error);
        throw error;
      }
    },
    [history, machines, setData]
  );

  const clearHistory = useCallback(async () => {
    try {
      await clearData();
      logger.info('Cleared all history');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
      logger.error('Failed to clear history', error);
      throw error;
    }
  }, [clearData]);

  return {
    history,
    addToHistory,
    clearHistory,
    isLoading,
    error,
  };
}
