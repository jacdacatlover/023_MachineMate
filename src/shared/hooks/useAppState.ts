import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { createLogger } from '@shared/logger';

const logger = createLogger('hooks.useAppState');

/**
 * Hook for monitoring app foreground/background state
 *
 * Useful for pausing operations when app goes to background,
 * refreshing data when app comes to foreground, etc.
 *
 * @example
 * ```tsx
 * const appState = useAppState();
 *
 * useEffect(() => {
 *   if (appState === 'active') {
 *     // Refresh data when app comes to foreground
 *     refetchData();
 *   }
 * }, [appState]);
 * ```
 */
export function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      logger.debug('App state changed', { from: appState, to: nextAppState });
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  return appState;
}

/**
 * Helper hook that returns boolean for active/inactive
 *
 * @example
 * ```tsx
 * const isActive = useIsAppActive();
 * ```
 */
export function useIsAppActive(): boolean {
  const appState = useAppState();
  return appState === 'active';
}
