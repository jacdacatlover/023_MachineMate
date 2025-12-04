// Machine identification logic that relies on the backend API with a deterministic client fallback.


import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

import { createLogger } from '@shared/logger';
import { recordRecognitionBreadcrumb } from '@shared/observability/monitoring';

import {
  CatalogIdentificationResult,
  GenericLabelResult,
  IdentificationResult,
} from '@typings/identification';
import { MachineDefinition } from '@typings/machine';
import { BackendIdentifyResponseSchema } from '@typings/validation';


import { RECOGNITION_CONFIG } from './config';
import { supabase } from '../../../services/api/supabaseClient';

const logger = createLogger('recognition.identifyMachine');

type IdentifyMachineOptions = {
  confidenceThreshold?: number;
};

type ReactNativeFile = Blob & {
  uri: string;
  name: string;
  type: string;
};

const API_BASE_URL =
  (Constants?.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL;

const describeError = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export async function identifyMachine(
  photoUri: string,
  allMachines: MachineDefinition[],
  options?: IdentifyMachineOptions
): Promise<IdentificationResult> {
  if (allMachines.length === 0) {
    throw new Error('No machines available for identification');
  }

  const confidenceThreshold =
    typeof options?.confidenceThreshold === 'number'
      ? options.confidenceThreshold
      : RECOGNITION_CONFIG.api.confidenceThreshold;

  recordRecognitionBreadcrumb('identifyMachine invoked', {
    machineCount: allMachines.length,
    backendConfigured: Boolean(API_BASE_URL),
    confidenceThreshold,
  });

  const performanceMetadata: Record<string, unknown> = {
    machineCount: allMachines.length,
    backendConfigured: Boolean(API_BASE_URL),
    strategy: 'unknown',
    confidenceThreshold,
  };

  return logger.trackPerformance(
    'identifyMachine',
    async () => {
      const apiResult = await identifyWithBackendApi(
        photoUri,
        allMachines,
        confidenceThreshold
      ).catch(error => {
        logger.warn('Backend API identification failed.', error);
        performanceMetadata.backendError = error instanceof Error ? error.message : error;
        return null;
      });

      if (apiResult) {
        performanceMetadata.strategy = 'backend';
        performanceMetadata.resultKind = apiResult.kind;
        return { ...apiResult, confidenceThreshold, photoUri };
      }

      if (!API_BASE_URL) {
        logger.warn('Backend API not configured; using deterministic fallback identification.');
      }

      performanceMetadata.strategy = 'fallback';
      const fallbackResult = fallbackManualRecommendation();
      performanceMetadata.resultKind = fallbackResult.kind;
      recordRecognitionBreadcrumb('Fallback identification used', {
        strategy: 'fallback',
        labelId: fallbackResult.labelId,
        confidenceThreshold,
      });
      return { ...fallbackResult, confidenceThreshold, photoUri };
    },
    performanceMetadata
  );
}

async function identifyWithBackendApi(
  photoUri: string,
  allMachines: MachineDefinition[],
  confidenceThreshold: number
): Promise<CatalogIdentificationResult | GenericLabelResult | null> {
  if (!API_BASE_URL) {
    return null;
  }

  const endpoint = `${API_BASE_URL.replace(/\/$/, '')}/identify`;
  const uploadUri = await ensureUploadablePhoto(photoUri);
  const formData = new FormData();
  const fileName = getFileNameFromUri(uploadUri);
  const mimeType = inferMimeTypeFromUri(fileName);

  formData.append(
    'image',
    {
      uri: uploadUri,
      name: fileName,
      type: mimeType,
    } as ReactNativeFile
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RECOGNITION_CONFIG.api.timeoutMs);

  try {
    // Get JWT token for authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Add authorization header if we have a token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      logger.warn('Backend API identification error', errorPayload);
      recordRecognitionBreadcrumb('Backend identification http_error', {
        status: response.status,
        backendConfigured: true,
      });
      return null;
    }

    const rawPayload = await response.json();

    const validationResult = BackendIdentifyResponseSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      logger.warn('Backend API returned invalid payload', validationResult.error);
      recordRecognitionBreadcrumb('Backend identification invalid_payload', {
        issues: validationResult.error.issues.length,
      });
      return null;
    }

    const payload = validationResult.data;

    const normalizedMachineName = payload.machine.trim();
    const confidence = clampConfidence(payload.confidence);
    const lowConfidence = confidence < confidenceThreshold;
    if (payload.trace_id) {
      logger.info('Backend identification success', {
        traceId: payload.trace_id,
        machine: payload.machine,
        confidence: payload.confidence,
        traceUrl: `${API_BASE_URL}/traces/${payload.trace_id}`,
      });
    }
    recordRecognitionBreadcrumb('Backend identification success', {
      traceId: payload.trace_id,
      machine: normalizedMachineName,
      confidence,
      lowConfidence,
    });

    const matchingMachine = allMachines.find(
      machine => machine.name.toLowerCase() === normalizedMachineName.toLowerCase()
    );

    if (matchingMachine) {
      return {
        kind: 'catalog',
        machineId: matchingMachine.id,
        candidates: buildBackendCandidateIds(matchingMachine.id, allMachines),
        confidence,
        lowConfidence,
        source: 'backend_api',
      };
    }

    return {
      kind: 'generic',
      labelId: normalizedMachineName,
      labelName: normalizedMachineName,
      candidates: [],
      confidence,
      source: 'backend_api',
    };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      logger.warn('Backend API request aborted due to timeout.');
      recordRecognitionBreadcrumb('Backend identification timeout', {
        reason: 'abort',
      });
      return null;
    }
    recordRecognitionBreadcrumb('Backend identification request failed', {
      reason: describeError(error),
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildBackendCandidateIds(primaryMachineId: string, allMachines: MachineDefinition[]): string[] {
  const sorted = allMachines
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(machine => machine.id);

  return [primaryMachineId, ...sorted.filter(id => id !== primaryMachineId)];
}

function getFileNameFromUri(uri: string): string {
  const segments = uri.split('/');
  const lastSegment = segments[segments.length - 1] || 'photo.jpg';
  return lastSegment.includes('.') ? lastSegment : `${lastSegment}.jpg`;
}

function inferMimeTypeFromUri(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (normalized.endsWith('.png')) {
    return 'image/png';
  }
  if (normalized.endsWith('.webp')) {
    return 'image/webp';
  }
  if (normalized.endsWith('.heic') || normalized.endsWith('.heif')) {
    return 'image/heic';
  }
  return 'image/jpeg';
}

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

async function ensureUploadablePhoto(photoUri: string): Promise<string> {
  const lower = photoUri.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return photoUri;
  }

  try {
    const transformed = await ImageManipulator.manipulateAsync(
      photoUri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return transformed.uri ?? photoUri;
  } catch (error) {
    logger.warn('Failed to normalize photo for upload; using original URI.', error);
    return photoUri;
  }
}

function fallbackManualRecommendation(): GenericLabelResult {
  return {
    kind: 'generic',
    labelId: 'unknown_machine',
    labelName: 'Unknown machine',
    candidates: [],
    confidence: 0,
    source: 'fallback',
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
