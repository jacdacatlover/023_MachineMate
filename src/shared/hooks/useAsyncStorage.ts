import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { createLogger } from '@shared/logger';

const logger = createLogger('hooks.useAsyncStorage');

interface UseAsyncStorageOptions<T> {
  /**
   * Storage key for AsyncStorage
   */
  key: string;
  /**
   * Zod schema for validation
   */
  schema: z.Schema<T>;
  /**
   * Default value if storage is empty or invalid
   */
  defaultValue: T;
  /**
   * Optional callback when storage value changes
   */
  onValueChange?: (value: T) => void;
}

interface UseAsyncStorageReturn<T> {
  /**
   * Current value from storage
   */
  data: T;
  /**
   * Update value in storage
   */
  setData: (value: T | ((prev: T) => T)) => Promise<void>;
  /**
   * Clear value from storage (sets to default)
   */
  clearData: () => Promise<void>;
  /**
   * Loading state during initial fetch
   */
  isLoading: boolean;
  /**
   * Error state (if load/save fails)
   */
  error: Error | null;
  /**
   * Manually reload from storage
   */
  reload: () => Promise<void>;
}

/**
 * Generic hook for AsyncStorage with Zod validation
 *
 * Features:
 * - Automatic loading on mount
 * - Zod schema validation
 * - Type-safe storage
 * - Error handling
 * - Loading states
 *
 * @example
 * ```tsx
 * const { data, setData, isLoading } = useAsyncStorage({
 *   key: 'favorites',
 *   schema: z.array(z.string()),
 *   defaultValue: [],
 * });
 * ```
 */
export function useAsyncStorage<T>({
  key,
  schema,
  defaultValue,
  onValueChange,
}: UseAsyncStorageOptions<T>): UseAsyncStorageReturn<T> {
  const [data, setDataState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const defaultValueRef = useRef(defaultValue);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  // Load from storage
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stored = await AsyncStorage.getItem(key);

      const fallbackValue = defaultValueRef.current;

      if (!stored) {
        setDataState(fallbackValue);
        return;
      }

      const parsed = JSON.parse(stored);
      const validated = schema.safeParse(parsed);

      if (!validated.success) {
        logger.warn(`Invalid data in storage for key "${key}", using default`, validated.error);
        setDataState(fallbackValue);
        // Clear corrupted data
        await AsyncStorage.removeItem(key);
        return;
      }

      setDataState(validated.data);
      onValueChangeRef.current?.(validated.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load from storage');
      logger.error(`Failed to load data for key "${key}"`, error);
      setError(error);
      setDataState(defaultValueRef.current);
    } finally {
      setIsLoading(false);
    }
  }, [key, schema]);

  // Save to storage
  const setData = useCallback(
    async (value: T | ((prev: T) => T)) => {
      try {
        const newValue = typeof value === 'function' ? (value as (prev: T) => T)(data) : value;

        // Validate before saving
        const validated = schema.safeParse(newValue);
        if (!validated.success) {
          throw new Error(`Invalid data for key "${key}": ${validated.error.message}`);
        }

        await AsyncStorage.setItem(key, JSON.stringify(validated.data));
        setDataState(validated.data);
        onValueChangeRef.current?.(validated.data);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save to storage');
        logger.error(`Failed to save data for key "${key}"`, error);
        setError(error);
        throw error; // Re-throw so caller can handle
      }
    },
    [key, schema, data]
  );

  // Clear storage
  const clearData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      const fallbackValue = defaultValueRef.current;
      setDataState(fallbackValue);
      onValueChangeRef.current?.(fallbackValue);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear storage');
      logger.error(`Failed to clear data for key "${key}"`, error);
      setError(error);
      throw error;
    }
  }, [key]);

  // Load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    setData,
    clearData,
    isLoading,
    error,
    reload: loadData,
  };
}
