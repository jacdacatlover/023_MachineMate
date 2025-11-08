import { useCallback, useState } from 'react';

import { useMachines } from '@app/providers/MachinesProvider';
import { createLogger } from '@shared/logger';

import { IdentificationResult } from 'src/types/identification';

import { identifyMachine } from '../services/identifyMachine';

const logger = createLogger('hooks.useIdentifyMachine');

interface UseIdentifyMachineReturn {
  /**
   * Function to identify a machine from a photo
   */
  identify: (photoUri: string) => Promise<IdentificationResult | null>;
  /**
   * Loading state during identification
   */
  isLoading: boolean;
  /**
   * Error if identification fails
   */
  error: Error | null;
  /**
   * Last identification result
   */
  result: IdentificationResult | null;
}

/**
 * Hook for identifying machines from photos
 *
 * Wraps the identifyMachine service function with:
 * - Loading state management
 * - Error handling
 * - Result caching
 * - Machine catalog integration
 *
 * @example
 * ```tsx
 * function CameraScreen() {
 *   const { identify, isLoading, result, error } = useIdentifyMachine();
 *
 *   const handleCapture = async (uri: string) => {
 *     const result = await identify(uri);
 *     if (result) {
 *       navigation.navigate('Result', { result });
 *     }
 *   };
 *
 *   return <CameraView onCapture={handleCapture} loading={isLoading} />;
 * }
 * ```
 */
export function useIdentifyMachine(): UseIdentifyMachineReturn {
  const machines = useMachines();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);

  const identify = useCallback(
    async (photoUri: string): Promise<IdentificationResult | null> => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        const identificationResult = await identifyMachine(photoUri, machines);
        setResult(identificationResult);
        return identificationResult;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to identify machine');
        logger.error('Machine identification failed', errorObj);
        setError(errorObj);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [machines]
  );

  return {
    identify,
    isLoading,
    error,
    result,
  };
}
