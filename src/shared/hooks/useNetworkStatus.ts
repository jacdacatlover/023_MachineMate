import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

import { createLogger } from '@shared/logger';

const logger = createLogger('hooks.useNetworkStatus');

interface NetworkStatus {
  /**
   * Whether device is connected to any network
   */
  isConnected: boolean | null;
  /**
   * Whether internet is reachable (can reach external servers)
   */
  isInternetReachable: boolean | null;
  /**
   * Type of connection (wifi, cellular, ethernet, etc.)
   */
  connectionType: string | null;
  /**
   * Whether connection is expensive (cellular data)
   */
  isConnectionExpensive: boolean;
  /**
   * Detailed connection info
   */
  details: NetInfoState['details'] | null;
}

/**
 * Hook for monitoring network connectivity status
 *
 * Features:
 * - Real-time network status updates
 * - Connection type detection
 * - Internet reachability check
 * - Expensive connection detection (cellular)
 *
 * @example
 * ```tsx
 * const { isConnected, isInternetReachable, connectionType } = useNetworkStatus();
 *
 * if (!isConnected) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: null,
    isInternetReachable: null,
    connectionType: null,
    isConnectionExpensive: false,
    details: null,
  });

  const updateStatus = useCallback((state: NetInfoState) => {
    setStatus({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
      isConnectionExpensive: state.details?.isConnectionExpensive ?? false,
      details: state.details,
    });
  }, []);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(state => {
      logger.debug('Initial network state', state);
      updateStatus(state);
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      logger.debug('Network state changed', state);
      updateStatus(state);
    });

    return () => {
      unsubscribe();
    };
  }, [updateStatus]);

  return status;
}

/**
 * Helper hook that returns a simple boolean for online/offline
 *
 * @example
 * ```tsx
 * const isOnline = useIsOnline();
 * ```
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetworkStatus();

  // Consider online if connected AND internet is reachable
  // If isInternetReachable is null (checking), assume online
  return isConnected === true && (isInternetReachable === true || isInternetReachable === null);
}
