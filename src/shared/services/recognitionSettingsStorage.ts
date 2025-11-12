// AsyncStorage helpers for recognition settings persistence

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLogger } from '@shared/logger';

import { DEFAULT_CONFIDENCE_THRESHOLD } from '../constants/recognition';

const CONFIDENCE_KEY = 'settings.recognition.confidenceThreshold';

const logger = createLogger('storage.recognitionSettings');

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export async function loadConfidenceThreshold(): Promise<number | null> {
  try {
    const stored = await AsyncStorage.getItem(CONFIDENCE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = Number(stored);
    if (!isValidNumber(parsed)) {
      logger.warn('Ignoring invalid stored confidence threshold', { stored });
      return null;
    }

    return parsed;
  } catch (error) {
    logger.warn('Failed to load confidence threshold', { error });
    return null;
  }
}

export async function saveConfidenceThreshold(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CONFIDENCE_KEY, value.toString());
  } catch (error) {
    logger.warn('Failed to persist confidence threshold', { error, value });
    throw error;
  }
}

export async function clearConfidenceThreshold(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CONFIDENCE_KEY);
  } catch (error) {
    logger.warn('Failed to clear confidence threshold, resetting to default', { error });
    await AsyncStorage.setItem(CONFIDENCE_KEY, DEFAULT_CONFIDENCE_THRESHOLD.toString());
  }
}
