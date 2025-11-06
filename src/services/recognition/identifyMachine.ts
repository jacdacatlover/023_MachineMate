// Machine identification logic leveraging Hugging Face SigLIP embeddings with local fallbacks.

import { MachineDefinition } from '../../types/machine';
import {
  CatalogIdentificationResult,
  GenericLabelResult,
  IdentificationResult,
} from '../../types/identification';
import { GYM_MACHINE_LABELS, GymMachineLabel } from '../../data/gymMachineLabels';
import { getCatalogMachineIdForLabel } from '../../data/labelSynonyms';
import {
  REFERENCE_MACHINE_EMBEDDINGS,
  ReferenceMachineEmbedding,
} from '../../data/referenceMachineEmbeddings';
import { BackendIdentifyResponseSchema } from '../../types/validation';
import { RECOGNITION_CONFIG } from './config';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL =
  (Constants?.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL;

// Additional visual keywords per machine to steer SigLIP toward unique features.
const MACHINE_PROMPT_OVERRIDES: Record<string, string[]> = {
  lat_pulldown: [
    'lat pulldown machine',
    'cable station with wide grip bar overhead',
    'seated high pulley exercise with thigh pads and vertical weight stack',
    'front pulldown to chest in commercial gym',
  ],
  leg_press: [
    'seated leg press sled machine',
    'large angled footplate with lower body pushing position',
    'weight stack leg press in fitness center',
  ],
  chest_press: [
    'seated chest press machine with dual handles',
    'horizontal pushing movement from chest level',
    'weight stack chest press station',
  ],
  seated_row: [
    'seated cable row machine with chest pad',
    'low pulley row handle pulled toward torso',
    'horizontal pulling machine with weight stack',
  ],
  shoulder_press: [
    'shoulder press machine with overhead handles',
    'seated overhead press with back pad and weight stack',
    'vertical pushing movement for deltoids',
  ],
  treadmill: [
    'cardio treadmill with running belt and console screen',
    'indoor running machine with handrails',
    'fitness club treadmill equipment',
  ],
};

type DomainPrompt = {
  id: string;
  prompt: string;
  type: 'positive' | 'negative';
};

const DOMAIN_PROMPTS: DomainPrompt[] = [
  {
    id: 'gym_machine_positive',
    type: 'positive',
    prompt:
      'photo of a full gym machine in a fitness center, metal frame, weight stack or cables, exercise equipment ready for use',
  },
  {
    id: 'not_gym_negative',
    type: 'negative',
    prompt:
      'photo of people or random indoor objects that are not exercise equipment, everyday household scene, cluttered room',
  },
];

const HF_TOKEN =
  (Constants?.expoConfig?.extra?.huggingFaceToken as string | undefined) ??
  process.env.EXPO_PUBLIC_HF_TOKEN;

const machineEmbeddingCache: Record<string, number[]> = {};
const labelEmbeddingCache: Record<string, number[]> = {};
const domainEmbeddingCache: Record<string, number[]> = {};
let hasWarnedMissingToken = false;
let legacyCacheCleared = false;

interface EmbeddedPhoto {
  processedUri: string;
  embedding: number[];
}

interface DomainClassification {
  isGym: boolean;
  confidence: number;
  positiveScore: number;
  negativeScore: number;
}

interface LabelScore {
  label: GymMachineLabel;
  textSimilarity: number;
  textConfidence: number;
  referenceConfidence: number | null;
  fusedConfidence: number;
  bestReferenceMachineId?: string;
}

/**
 * Identify a machine from a photo.
 *
 * 1. Pre-process the image (center crop + resize) to focus on the equipment.
 * 2. If a Hugging Face token is configured, embed the photo via SigLIP and compare
 *    against cached text embeddings for each machine definition.
 * 3. Apply confidence gating so low-confidence guesses kick the user into manual selection.
 * 4. Fall back to a deterministic, low-confidence recommendation if remote inference fails or no token is supplied.
 */
export async function identifyMachine(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult> {
  if (allMachines.length === 0) {
    throw new Error('No machines available for identification');
  }

  await ensureLegacyCacheCleared();

  if (API_BASE_URL) {
    const apiResult = await identifyWithBackendApi(photoUri, allMachines).catch(error => {
      console.warn('Backend API identification failed.', error);
      return null;
    });

    if (apiResult) {
      return { ...apiResult, photoUri };
    }
  }

  if (HF_TOKEN) {
    const remoteResult = await runRemotePipeline(photoUri, allMachines);

    if (remoteResult) {
      return remoteResult;
    }
  }

  if (!HF_TOKEN && !hasWarnedMissingToken) {
    console.warn('No Hugging Face token configured; opening manual picker.');
    hasWarnedMissingToken = true;
  }

  const fallbackResult = fallbackManualRecommendation(photoUri, allMachines);
  return { ...fallbackResult, photoUri };
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
    } as any
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
      console.warn('Backend API identification error:', errorPayload);
      return null;
    }

    const rawPayload = await response.json();

    // Validate API response with Zod
    const validationResult = BackendIdentifyResponseSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      console.warn('Backend API returned invalid payload:', validationResult.error);
      return null;
    }

    const payload = validationResult.data;

    // Log trace_id for debugging
    if (payload.trace_id) {
      console.log('🔍 Backend Trace ID:', payload.trace_id);
      console.log(`   Machine: ${payload.machine}, Confidence: ${payload.confidence}`);
      console.log(`   Debug: ${API_BASE_URL}/traces/${payload.trace_id}`);
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
      console.warn('Backend API request aborted due to timeout.');
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function identifyWithHuggingFace(
  photoUri: string,
  allMachines: MachineDefinition[],
  existingEmbedding?: number[]
): Promise<CatalogIdentificationResult | null> {
  let imageEmbedding: number[] | null = existingEmbedding ?? null;

  if (!imageEmbedding) {
    const base64Image = await FileSystem.readAsStringAsync(photoUri, {
      encoding: 'base64',
    });

    imageEmbedding = await fetchImageEmbedding(base64Image);
  }

  if (!imageEmbedding) {
    return null;
  }

  const machineEmbeddings = await Promise.all(
    allMachines.map(async machine => {
      const embedding = await getMachineTextEmbedding(machine);
      return { machine, embedding };
    })
  );

  const scoredMachines = machineEmbeddings
    .filter(item => Boolean(item.embedding))
    .map(item => {
      const similarity = cosineSimilarity(imageEmbedding, item.embedding as number[]);
      const confidence = normalizeSimilarity(similarity);
      return {
        machine: item.machine,
        similarity,
        confidence,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  if (!scoredMachines.length) {
    return null;
  }

  const [topMatch, ...rest] = scoredMachines;
  const primary = topMatch.machine;
  const primaryConfidence = topMatch.confidence;
  const runnerUpConfidence = rest.length ? rest[0].confidence : 0;
  const confidenceGap = primaryConfidence - runnerUpConfidence;
  const lowConfidence =
    primaryConfidence < RECOGNITION_CONFIG.huggingFace.confidenceThreshold ||
    (primaryConfidence < RECOGNITION_CONFIG.huggingFace.highConfidenceThreshold &&
      confidenceGap < RECOGNITION_CONFIG.huggingFace.confidenceGap);

  const runnerUpIds = rest.map(item => item.machine.id);
  const candidateSet = new Set(runnerUpIds);

  allMachines
    .filter(machine => machine.id !== primary.id && !candidateSet.has(machine.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(machine => candidateSet.add(machine.id));

  const candidates = Array.from(candidateSet)
    .map(id => allMachines.find(machine => machine.id === id))
    .filter(Boolean) as MachineDefinition[];

  console.log('identifyMachine:clipScores', {
    primary: primary.name,
    confidence: Number(primaryConfidence.toFixed(3)),
    runnerUp: rest[0]?.machine.name ?? null,
    runnerUpConfidence: Number(runnerUpConfidence.toFixed(3)),
    gap: Number(confidenceGap.toFixed(3)),
    lowConfidence,
  });

  const candidateIds = [primary.id, ...candidates.map(machine => machine.id)];
  return {
    kind: 'catalog',
    machineId: primary.id,
    candidates: Array.from(new Set(candidateIds)),
    confidence: primaryConfidence,
    lowConfidence,
    source: 'huggingface',
  };
}

async function runRemotePipeline(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult | null> {
  try {
    const embeddedPhoto = await embedPhoto(photoUri);
    if (!embeddedPhoto) {
      return null;
    }

    const { processedUri, embedding } = embeddedPhoto;

    const domainClassification = await classifyGymDomain(embedding).catch(error => {
      console.warn('Domain classification failed.', error);
      return null;
    });

    if (domainClassification && !domainClassification.isGym) {
      return {
        kind: 'not_gym',
        confidence: domainClassification.confidence,
        photoUri,
      };
    }

    const labelScores = await rankLabelsBySimilarity(embedding).catch(error => {
      console.warn('Label ranking failed.', error);
      return [];
    });

    const labelOutcome = buildOutcomeFromLabelScores(labelScores, allMachines);
    if (labelOutcome) {
      return { ...labelOutcome, photoUri };
    }

    const legacyResult = await identifyWithHuggingFace(processedUri, allMachines, embedding).catch(
      error => {
        console.warn('Legacy identification failed.', error);
        return null;
      }
    );

    if (legacyResult) {
      return { ...legacyResult, photoUri };
    }
  } catch (error) {
    console.warn('Remote identification pipeline failed.', error);
  }

  return null;
}

async function classifyGymDomain(imageEmbedding: number[]): Promise<DomainClassification | null> {
  const embeddings = await Promise.all(
    DOMAIN_PROMPTS.map(async prompt => {
      const embedding = await getDomainPromptEmbedding(prompt);
      return embedding ? { prompt, embedding } : null;
    })
  );

  const positive = embeddings.find(
    item => item?.prompt.type === 'positive'
  ) as { prompt: DomainPrompt; embedding: number[] } | undefined;
  const negative = embeddings.find(
    item => item?.prompt.type === 'negative'
  ) as { prompt: DomainPrompt; embedding: number[] } | undefined;

  if (!positive || !negative) {
    return null;
  }

  const positiveScore = normalizeSimilarity(cosineSimilarity(imageEmbedding, positive.embedding));
  const negativeScore = normalizeSimilarity(cosineSimilarity(imageEmbedding, negative.embedding));

  const isGym =
    positiveScore >= RECOGNITION_CONFIG.domain.confidenceThreshold &&
    positiveScore >= negativeScore + RECOGNITION_CONFIG.domain.confidenceMargin;
  const confidence = isGym ? positiveScore : Math.max(negativeScore, 1 - positiveScore);

  console.log('identifyMachine:domain', {
    positiveScore: Number(positiveScore.toFixed(3)),
    negativeScore: Number(negativeScore.toFixed(3)),
    isGym,
  });

  return {
    isGym,
    confidence,
    positiveScore,
    negativeScore,
  };
}

async function rankLabelsBySimilarity(imageEmbedding: number[]): Promise<LabelScore[]> {
  const scores = await Promise.all(
    GYM_MACHINE_LABELS.map(async label => {
      const embedding = await getLabelEmbedding(label);
      if (!embedding) {
        return null;
      }

      const textSimilarity = cosineSimilarity(imageEmbedding, embedding);
      const textConfidence = normalizeSimilarity(textSimilarity);

      const references = getReferenceEmbeddingsForLabel(label.id);
      let bestReferenceConfidence: number | null = null;
      let bestReferenceMachineId: string | undefined;

      references.forEach(reference => {
        if (!reference.embedding.length || reference.embedding.length !== imageEmbedding.length) {
          return;
        }

        const refSimilarity = cosineSimilarity(imageEmbedding, reference.embedding);
        const refConfidence = normalizeSimilarity(refSimilarity);

        if (bestReferenceConfidence === null || refConfidence > bestReferenceConfidence) {
          bestReferenceConfidence = refConfidence;
          bestReferenceMachineId = reference.machineId;
        }
      });

      const fusedConfidence =
        bestReferenceConfidence !== null
          ? RECOGNITION_CONFIG.fusion.text * textConfidence +
            RECOGNITION_CONFIG.fusion.reference * bestReferenceConfidence
          : textConfidence;

      const labelScore: LabelScore = {
        label,
        textSimilarity,
        textConfidence,
        referenceConfidence: bestReferenceConfidence,
        fusedConfidence,
        bestReferenceMachineId,
      };
      return labelScore;
    })
  );

  return scores
    .filter((score): score is LabelScore => score !== null)
    .sort((a, b) => b.fusedConfidence - a.fusedConfidence);
}

function buildOutcomeFromLabelScores(
  labelScores: LabelScore[],
  allMachines: MachineDefinition[]
): CatalogIdentificationResult | GenericLabelResult | null {
  if (!labelScores.length) {
    return null;
  }

  const [topScore, ...rest] = labelScores;
  const runnerUpConfidence = rest.length ? rest[0].fusedConfidence : 0;
  const lowConfidence =
    topScore.fusedConfidence < RECOGNITION_CONFIG.label.confidenceThreshold ||
    (topScore.fusedConfidence < RECOGNITION_CONFIG.label.highConfidenceThreshold &&
      topScore.fusedConfidence - runnerUpConfidence < RECOGNITION_CONFIG.label.confidenceGap);

  console.log('identifyMachine:labels', {
    primary: topScore.label.name,
    fusedConfidence: Number(topScore.fusedConfidence.toFixed(3)),
    textConfidence: Number(topScore.textConfidence.toFixed(3)),
    referenceConfidence:
      topScore.referenceConfidence !== null
        ? Number(topScore.referenceConfidence.toFixed(3))
        : null,
    runnerUp: rest[0]?.label.name ?? null,
    runnerUpConfidence: Number(runnerUpConfidence.toFixed(3)),
    lowConfidence,
  });

  const labelCandidates = [topScore, ...rest].slice(0, RECOGNITION_CONFIG.label.maxCandidates);
  const mappedPrimaryMachineId =
    getCatalogMachineIdForLabel(topScore.label.id) ?? topScore.bestReferenceMachineId;

  if (mappedPrimaryMachineId) {
    const candidateMachineIds = buildCandidateMachineIds(
      mappedPrimaryMachineId,
      labelCandidates,
      allMachines
    );

    return {
      kind: 'catalog',
      machineId: mappedPrimaryMachineId,
      candidates: candidateMachineIds,
      confidence: topScore.fusedConfidence,
      lowConfidence,
      source: 'label_fusion',
    };
  }

  return {
    kind: 'generic',
    labelId: topScore.label.id,
    labelName: topScore.label.name,
    candidates: labelCandidates.map(item => item.label.id),
    confidence: topScore.fusedConfidence,
  };
}

function buildCandidateMachineIds(
  primaryMachineId: string,
  labelCandidates: LabelScore[],
  allMachines: MachineDefinition[]
): string[] {
  const idSet = new Set<string>([primaryMachineId]);

  labelCandidates.forEach(candidate => {
    const machineId =
      getCatalogMachineIdForLabel(candidate.label.id) ?? candidate.bestReferenceMachineId;
    if (machineId) {
      idSet.add(machineId);
    }
  });

  allMachines
    .filter(machine => !idSet.has(machine.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(machine => idSet.add(machine.id));

  return Array.from(idSet);
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

/**
 * Preprocesses a photo for machine identification
 *
 * Two-step process:
 * 1. Initial downscale to 640px (reduces file size for processing)
 * 2. Center crop to 90% square + final resize to 384x384 (SigLIP input size)
 *
 * Note: Two operations are required because we need dimensions after
 * resize to calculate the center crop coordinates
 */
async function preprocessPhoto(photoUri: string): Promise<string> {
  // Step 1: Initial downscale to reduce payload size
  const resized = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 640 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Calculate center crop coordinates based on resized dimensions
  const cropSize = Math.floor(Math.min(resized.width, resized.height) * 0.9);
  const originX = Math.max(0, Math.floor((resized.width - cropSize) / 2));
  const originY = Math.max(0, Math.floor((resized.height - cropSize) / 2));

  // Step 2: Crop and final resize in a single operation
  const cropped = await ImageManipulator.manipulateAsync(
    resized.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: cropSize,
          height: cropSize,
        },
      },
      { resize: { width: 384, height: 384 } },
    ],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );

  return cropped.uri;
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
    console.warn('Failed to normalize photo for upload; using original URI.', error);
    return photoUri;
  }
}

async function embedPhoto(photoUri: string): Promise<EmbeddedPhoto | null> {
  const processedUri = await preprocessPhoto(photoUri).catch(error => {
    console.warn('Pre-processing failed, using original photo.', error);
    return photoUri;
  });

  const base64Image = await FileSystem.readAsStringAsync(processedUri, {
    encoding: 'base64',
  }).catch(error => {
    console.warn('Failed to read photo for embedding.', error);
    return null;
  });

  if (!base64Image) {
    return null;
  }

  const embedding = await fetchImageEmbedding(base64Image).catch(error => {
    console.warn('Failed to embed image via Hugging Face.', error);
    return null;
  });

  if (!embedding) {
    return null;
  }

  return { processedUri, embedding };
}

async function fetchImageEmbedding(base64Image: string): Promise<number[] | null> {
  const response = await fetch(RECOGNITION_CONFIG.huggingFace.embeddingsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        image: `data:image/jpeg;base64,${base64Image}`,
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    console.warn('Hugging Face image embedding error:', errorPayload);
    return null;
  }

  const payload = await response.json();
  if (Array.isArray(payload?.data)) {
    return payload.data as number[];
  }

  if (Array.isArray(payload?.embedding)) {
    return payload.embedding as number[];
  }

  if (Array.isArray(payload)) {
    return payload as number[];
  }

  return null;
}

async function getMachineTextEmbedding(machine: MachineDefinition): Promise<number[] | null> {
  return getCachedEmbedding(
    machineEmbeddingCache,
    RECOGNITION_CONFIG.cache.prefixes.machine,
    machine.id,
    async () => {
      const description = buildMachineDescription(machine);
      return fetchTextEmbedding(description);
    }
  );
}

async function fetchTextEmbedding(text: string): Promise<number[] | null> {
  const response = await fetch(RECOGNITION_CONFIG.huggingFace.embeddingsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    console.warn('Hugging Face text embedding error:', errorPayload);
    return null;
  }

  const payload = await response.json();
  if (Array.isArray(payload?.data)) {
    return payload.data as number[];
  }

  if (Array.isArray(payload?.embedding)) {
    return payload.embedding as number[];
  }

  if (Array.isArray(payload)) {
    return payload as number[];
  }

  return null;
}

function buildMachineDescription(machine: MachineDefinition): string {
  const primaryMuscles = machine.primaryMuscles.join(', ');
  const secondaryMuscles = machine.secondaryMuscles?.join(', ');
  const machineKeywords = MACHINE_PROMPT_OVERRIDES[machine.id] ?? [];
  return [
    machine.name,
    ...machineKeywords,
    'strength training machine',
    'gym equipment photo',
    'category:',
    machine.category,
    'primary muscles:',
    primaryMuscles,
    secondaryMuscles ? `secondary muscles: ${secondaryMuscles}` : null,
    'full body view, high resolution, indoor gym',
  ]
    .filter(Boolean)
    .join(' ');
}

function normalizeSimilarity(similarity: number): number {
  // Cosine similarity ranges [-1, 1]; convert to [0,1] for confidence.
  return (similarity + 1) / 2;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have the same dimension');
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const valA = a[i];
    const valB = b[i];
    dot += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }

  if (magA === 0 || magB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
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

async function getLabelEmbedding(label: GymMachineLabel): Promise<number[] | null> {
  return getCachedEmbedding(labelEmbeddingCache, RECOGNITION_CONFIG.cache.prefixes.label, label.id, () =>
    fetchTextEmbedding(buildLabelPrompt(label))
  );
}

async function getDomainPromptEmbedding(prompt: DomainPrompt): Promise<number[] | null> {
  return getCachedEmbedding(
    domainEmbeddingCache,
    RECOGNITION_CONFIG.cache.prefixes.domain,
    prompt.id,
    () => fetchTextEmbedding(prompt.prompt)
  );
}

function buildLabelPrompt(label: GymMachineLabel): string {
  return [
    label.prompt,
    'gym equipment photo',
    label.category,
    label.synonyms.join(', '),
    label.keywords?.join(', '),
  ]
    .filter(Boolean)
    .join(' ');
}

async function getCachedEmbedding(
  cache: Record<string, number[]>,
  storagePrefix: string,
  id: string,
  fetcher: () => Promise<number[] | null>
): Promise<number[] | null> {
  if (cache[id]) {
    return cache[id];
  }

  const storageKey = `${storagePrefix}${id}`;
  const cached = await AsyncStorage.getItem(storageKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as number[];
      cache[id] = parsed;
      return parsed;
    } catch (error) {
      console.warn('Failed to parse cached embedding, regenerating.', { id, storagePrefix, error });
      await AsyncStorage.removeItem(storageKey);
    }
  }

  const embedding = await fetcher();
  if (!embedding) {
    return null;
  }

  cache[id] = embedding;
  await AsyncStorage.setItem(storageKey, JSON.stringify(embedding));
  return embedding;
}

const referencesByLabel: Record<string, ReferenceMachineEmbedding[]> =
  REFERENCE_MACHINE_EMBEDDINGS.reduce<Record<string, ReferenceMachineEmbedding[]>>(
    (acc, reference) => {
      if (!acc[reference.labelId]) {
        acc[reference.labelId] = [];
      }
      acc[reference.labelId].push(reference);
      return acc;
    },
    {}
  );

function getReferenceEmbeddingsForLabel(labelId: string): ReferenceMachineEmbedding[] {
  return referencesByLabel[labelId] ?? [];
}

async function ensureLegacyCacheCleared(): Promise<void> {
  if (legacyCacheCleared) {
    return;
  }

  try {
    const migrated = await AsyncStorage.getItem(RECOGNITION_CONFIG.cache.migrationKey);
    if (migrated) {
      legacyCacheCleared = true;
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const legacyKeys = keys.filter(key =>
      RECOGNITION_CONFIG.cache.legacyPrefixes.some(prefix => key.startsWith(prefix))
    );
    if (legacyKeys.length) {
      await AsyncStorage.multiRemove(legacyKeys);
    }

    await AsyncStorage.setItem(RECOGNITION_CONFIG.cache.migrationKey, '1');
    legacyCacheCleared = true;
  } catch (error) {
    console.warn('Failed to migrate legacy embedding cache.', error);
    legacyCacheCleared = true;
  }
}
