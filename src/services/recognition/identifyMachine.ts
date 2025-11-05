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
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const HF_MODEL_ID = 'google/siglip-so400m-patch14-384';
const HF_EMBEDDINGS_URL = `https://api-inference.huggingface.co/embeddings/${HF_MODEL_ID}`;
const HF_CONFIDENCE_THRESHOLD = 0.6;
const HF_CONFIDENCE_GAP = 0.07;
const HF_HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MACHINE_EMBEDDING_STORAGE_PREFIX = 'machinemate_embedding_v3_';
const LABEL_EMBEDDING_STORAGE_PREFIX = 'machinemate_label_embedding_v2_';
const DOMAIN_EMBEDDING_STORAGE_PREFIX = 'machinemate_domain_embedding_v2_';
const DOMAIN_CONFIDENCE_THRESHOLD = 0.35;
const DOMAIN_CONFIDENCE_MARGIN = 0.05;
const LABEL_CONFIDENCE_THRESHOLD = 0.45;
const LABEL_CONFIDENCE_GAP = 0.08;
const LABEL_HIGH_CONFIDENCE_THRESHOLD = 0.65;
const MAX_LABEL_CANDIDATES = 5;
const TEXT_CONFIDENCE_WEIGHT = 0.6;
const REFERENCE_CONFIDENCE_WEIGHT = 0.4;
const LEGACY_CACHE_CLEARED_KEY = 'machinemate_cache_migrated_v2';
const LEGACY_STORAGE_PREFIXES = [
  'machinemate_embedding_v1_',
  'machinemate_embedding_v2_',
  'machinemate_label_embedding_v1_',
  'machinemate_domain_embedding_v1_',
];

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
    primaryConfidence < HF_CONFIDENCE_THRESHOLD ||
    (primaryConfidence < HF_HIGH_CONFIDENCE_THRESHOLD && confidenceGap < HF_CONFIDENCE_GAP);

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
    positiveScore >= DOMAIN_CONFIDENCE_THRESHOLD &&
    positiveScore >= negativeScore + DOMAIN_CONFIDENCE_MARGIN;
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
          ? TEXT_CONFIDENCE_WEIGHT * textConfidence +
            REFERENCE_CONFIDENCE_WEIGHT * bestReferenceConfidence
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
    topScore.fusedConfidence < LABEL_CONFIDENCE_THRESHOLD ||
    (topScore.fusedConfidence < LABEL_HIGH_CONFIDENCE_THRESHOLD &&
      topScore.fusedConfidence - runnerUpConfidence < LABEL_CONFIDENCE_GAP);

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

  const labelCandidates = [topScore, ...rest].slice(0, MAX_LABEL_CANDIDATES);
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

async function preprocessPhoto(photoUri: string): Promise<string> {
  // Downscale to reduce payload size, then crop to center square (focus equipment).
  const resized = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 640 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  const cropSize = Math.floor(Math.min(resized.width, resized.height) * 0.9);
  const originX = Math.max(0, Math.floor((resized.width - cropSize) / 2));
  const originY = Math.max(0, Math.floor((resized.height - cropSize) / 2));

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
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  return cropped.uri;
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
  const response = await fetch(HF_EMBEDDINGS_URL, {
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
    MACHINE_EMBEDDING_STORAGE_PREFIX,
    machine.id,
    async () => {
      const description = buildMachineDescription(machine);
      return fetchTextEmbedding(description);
    }
  );
}

async function fetchTextEmbedding(text: string): Promise<number[] | null> {
  const response = await fetch(HF_EMBEDDINGS_URL, {
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
  return getCachedEmbedding(labelEmbeddingCache, LABEL_EMBEDDING_STORAGE_PREFIX, label.id, () =>
    fetchTextEmbedding(buildLabelPrompt(label))
  );
}

async function getDomainPromptEmbedding(prompt: DomainPrompt): Promise<number[] | null> {
  return getCachedEmbedding(
    domainEmbeddingCache,
    DOMAIN_EMBEDDING_STORAGE_PREFIX,
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
    const migrated = await AsyncStorage.getItem(LEGACY_CACHE_CLEARED_KEY);
    if (migrated) {
      legacyCacheCleared = true;
      return;
    }

    const keys = await AsyncStorage.getAllKeys();
    const legacyKeys = keys.filter(key =>
      LEGACY_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))
    );
    if (legacyKeys.length) {
      await AsyncStorage.multiRemove(legacyKeys);
    }

    await AsyncStorage.setItem(LEGACY_CACHE_CLEARED_KEY, '1');
    legacyCacheCleared = true;
  } catch (error) {
    console.warn('Failed to migrate legacy embedding cache.', error);
    legacyCacheCleared = true;
  }
}
