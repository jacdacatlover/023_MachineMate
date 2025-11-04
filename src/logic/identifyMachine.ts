// Machine identification logic leveraging Hugging Face CLIP embeddings with local fallbacks.

import { MachineDefinition } from '../types/machine';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const HF_MODEL_ID = 'openai/clip-vit-base-patch32';
const HF_EMBEDDINGS_URL = `https://api-inference.huggingface.co/embeddings/${HF_MODEL_ID}`;
const HF_CONFIDENCE_THRESHOLD = 0.5;
const MACHINE_EMBEDDING_STORAGE_PREFIX = 'machinemate_embedding_v1_';

const HF_TOKEN =
  (Constants?.expoConfig?.extra?.huggingFaceToken as string | undefined) ??
  process.env.EXPO_PUBLIC_HF_TOKEN;

const machineEmbeddingCache: Record<string, number[]> = {};

export interface IdentificationResult {
  primary: MachineDefinition;
  candidates: MachineDefinition[];
  confidence: number | null;
  lowConfidence: boolean;
  source: 'huggingface' | 'fallback';
}

/**
 * Identify a machine from a photo.
 *
 * 1. Pre-process the image (center crop + resize) to focus on the equipment.
 * 2. If a Hugging Face token is configured, embed the photo via CLIP and compare
 *    against cached text embeddings for each machine definition.
 * 3. Apply confidence gating so low-confidence guesses kick the user into manual selection.
 * 4. Fall back to a random guess if remote inference fails or no token is supplied.
 */
export async function identifyMachine(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult> {
  if (allMachines.length === 0) {
    throw new Error('No machines available for identification');
  }

  if (HF_TOKEN) {
    const processedUri = await preprocessPhoto(photoUri).catch(error => {
      console.warn('Pre-processing failed, using original photo.', error);
      return photoUri;
    });

    const hfResult = await identifyWithHuggingFace(processedUri, allMachines).catch(error => {
      console.warn('Hugging Face identification failed, falling back to random stub.', error);
      return null;
    });

    if (hfResult) {
      return hfResult;
    }
  }

  return fallbackRandom(allMachines);
}

async function identifyWithHuggingFace(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult | null> {
  const base64Image = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const imageEmbedding = await fetchImageEmbedding(base64Image);
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
  const lowConfidence = primaryConfidence < HF_CONFIDENCE_THRESHOLD;

  const candidateIds = rest.map(item => item.machine.id);
  const candidateSet = new Set(candidateIds);

  allMachines
    .filter(machine => machine.id !== primary.id && !candidateSet.has(machine.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(machine => candidateSet.add(machine.id));

  const candidates = Array.from(candidateSet)
    .map(id => allMachines.find(machine => machine.id === id))
    .filter(Boolean) as MachineDefinition[];

  return {
    primary,
    candidates,
    confidence: primaryConfidence,
    lowConfidence,
    source: 'huggingface',
  };
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
      { resize: { width: 512, height: 512 } },
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );

  return cropped.uri;
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
  const cacheKey = `${MACHINE_EMBEDDING_STORAGE_PREFIX}${machine.id}`;

  if (machineEmbeddingCache[machine.id]) {
    return machineEmbeddingCache[machine.id];
  }

  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as number[];
      machineEmbeddingCache[machine.id] = parsed;
      return parsed;
    } catch (error) {
      console.warn('Failed to parse cached embedding, regenerating.', error);
      await AsyncStorage.removeItem(cacheKey);
    }
  }

  const description = buildMachineDescription(machine);
  const embedding = await fetchTextEmbedding(description);
  if (!embedding) {
    return null;
  }

  machineEmbeddingCache[machine.id] = embedding;
  await AsyncStorage.setItem(cacheKey, JSON.stringify(embedding));
  return embedding;
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
  return [
    machine.name,
    'category:',
    machine.category,
    'primary muscles:',
    primaryMuscles,
    secondaryMuscles ? `secondary muscles: ${secondaryMuscles}` : null,
    'gym equipment photo',
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

function fallbackRandom(allMachines: MachineDefinition[]): IdentificationResult {
  const shuffled = [...allMachines].sort(() => Math.random() - 0.5);
  const primary = shuffled[0];
  const candidates = allMachines
    .filter(machine => machine.id !== primary.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    primary,
    candidates,
    confidence: null,
    lowConfidence: false,
    source: 'fallback',
  };
}
