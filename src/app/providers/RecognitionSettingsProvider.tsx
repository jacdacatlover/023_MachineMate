import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';

import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  MAX_CONFIDENCE_THRESHOLD,
  MIN_CONFIDENCE_THRESHOLD,
} from '@shared/constants/recognition';
import { createLogger } from '@shared/logger';
import {
  loadConfidenceThreshold,
  saveConfidenceThreshold,
  clearConfidenceThreshold,
} from '@shared/services/recognitionSettingsStorage';

type RecognitionSettingsContextValue = {
  confidenceThreshold: number;
  setConfidenceThreshold: (value: number) => Promise<void>;
  resetConfidenceThreshold: () => Promise<void>;
  isLoading: boolean;
};

const RecognitionSettingsContext = createContext<RecognitionSettingsContextValue | null>(null);

const logger = createLogger('providers.recognitionSettings');

const clampConfidence = (value: number): number =>
  Math.min(MAX_CONFIDENCE_THRESHOLD, Math.max(MIN_CONFIDENCE_THRESHOLD, value));

type RecognitionSettingsProviderProps = {
  children: ReactNode;
};

export function RecognitionSettingsProvider({ children }: RecognitionSettingsProviderProps) {
  const [confidenceThreshold, setConfidenceThresholdState] = useState(
    DEFAULT_CONFIDENCE_THRESHOLD
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    loadConfidenceThreshold()
      .then(stored => {
        if (stored && isMounted) {
          setConfidenceThresholdState(clampConfidence(stored));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistThreshold = useCallback(async (value: number) => {
    const clamped = clampConfidence(value);
    setConfidenceThresholdState(clamped);
    await saveConfidenceThreshold(clamped);
  }, []);

  const handleSetConfidenceThreshold = useCallback(
    async (value: number) => {
      try {
        await persistThreshold(value);
      } catch (error) {
        logger.error('Failed to save confidence threshold', { error });
        throw error;
      }
    },
    [persistThreshold]
  );

  const handleResetConfidenceThreshold = useCallback(async () => {
    try {
      await clearConfidenceThreshold();
      setConfidenceThresholdState(DEFAULT_CONFIDENCE_THRESHOLD);
    } catch (error) {
      logger.error('Failed to reset confidence threshold', { error });
      throw error;
    }
  }, []);

  return (
    <RecognitionSettingsContext.Provider
      value={{
        confidenceThreshold,
        setConfidenceThreshold: handleSetConfidenceThreshold,
        resetConfidenceThreshold: handleResetConfidenceThreshold,
        isLoading,
      }}
    >
      {children}
    </RecognitionSettingsContext.Provider>
  );
}

export function useRecognitionSettings(): RecognitionSettingsContextValue {
  const context = useContext(RecognitionSettingsContext);
  if (context === null) {
    throw new Error(
      'useRecognitionSettings must be used within a RecognitionSettingsProvider. ' +
        'Wrap your component tree with <RecognitionSettingsProvider>.'
    );
  }
  return context;
}
