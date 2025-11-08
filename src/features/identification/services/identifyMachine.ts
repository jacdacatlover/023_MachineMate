// Machine identification logic that relies on the backend API with a deterministic client fallback.


import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

import { createLogger } from '@shared/logger';

import {
  CatalogIdentificationResult,
  GenericLabelResult,
  IdentificationResult,
} from '@typings/identification';
import { MachineDefinition } from '@typings/machine';
import { BackendIdentifyResponseSchema } from '@typings/validation';


import { RECOGNITION_CONFIG } from './config';

const logger = createLogger('recognition.identifyMachine');

type ReactNativeFile = Blob & {
  uri: string;
  name: string;
  type: string;
};

const API_BASE_URL =
  (Constants?.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL;

export async function identifyMachine(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult> {
  if (allMachines.length === 0) {
    throw new Error('No machines available for identification');
  }

  const performanceMetadata: Record<string, unknown> = {
    machineCount: allMachines.length,
    backendConfigured: Boolean(API_BASE_URL),
    strategy: 'unknown',
  };

  return logger.trackPerformance(
    'identifyMachine',
    async () => {
      const apiResult = await identifyWithBackendApi(photoUri, allMachines).catch(error => {
        logger.warn('Backend API identification failed.', error);
        performanceMetadata.backendError = error instanceof Error ? error.message : error;
        return null;
      });

      if (apiResult) {
        performanceMetadata.strategy = 'backend';
        performanceMetadata.resultKind = apiResult.kind;
        return { ...apiResult, photoUri };
      }

      if (!API_BASE_URL) {
        logger.warn('Backend API not configured; using deterministic fallback identification.');
      }

      performanceMetadata.strategy = 'fallback';
      const fallbackResult = fallbackManualRecommendation(photoUri, allMachines);
      performanceMetadata.resultKind = fallbackResult.kind;
      return { ...fallbackResult, photoUri };
    },
    performanceMetadata
  );
}

async function identifyWithBackendApi(
  photoUri: string,
  allMachines: MachineDefinition[]
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
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      logger.warn('Backend API identification error', errorPayload);
      return null;
    }

    const rawPayload = await response.json();

    const validationResult = BackendIdentifyResponseSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      logger.warn('Backend API returned invalid payload', validationResult.error);
      return null;
    }

    const payload = validationResult.data;

    if (payload.trace_id) {
      logger.info('Backend identification success', {
        traceId: payload.trace_id,
        machine: payload.machine,
        confidence: payload.confidence,
        traceUrl: `${API_BASE_URL}/traces/${payload.trace_id}`,
      });
    }

    const normalizedMachineName = payload.machine.trim();
    const confidence = clampConfidence(payload.confidence);
    const lowConfidence = confidence < RECOGNITION_CONFIG.api.confidenceThreshold;

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
    };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      logger.warn('Backend API request aborted due to timeout.');
      return null;
    }
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

function fallbackManualRecommendation(
  photoUri: string,
  allMachines: MachineDefinition[]
): CatalogIdentificationResult {
  const sorted = [...allMachines].sort((a, b) => a.name.localeCompare(b.name));
  const index = sorted.length ? Math.abs(hashString(photoUri)) % sorted.length : 0;
  const primary = sorted[index] ?? sorted[0];

  const candidateIds = sorted.map(machine => machine.id);
  return {
    kind: 'catalog',
    machineId: primary?.id ?? allMachines[0].id,
    candidates: candidateIds,
    confidence: null,
    lowConfidence: true,
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
