// Configuration constants for machine recognition service
// Centralized location for tuning recognition parameters

/**
 * Hugging Face Model Configuration
 */
export const HF_CONFIG = {
  modelId: 'google/siglip-so400m-patch14-384',
  get embeddingsUrl() {
    return `https://api-inference.huggingface.co/embeddings/${this.modelId}`;
  },
  confidenceThreshold: 0.6,
  confidenceGap: 0.07,
  highConfidenceThreshold: 0.75,
} as const;

/**
 * Backend API Configuration
 */
export const API_CONFIG = {
  confidenceThreshold: 0.7,
  timeoutMs: 15000,
} as const;

/**
 * Domain Classification Configuration
 * Controls gym vs non-gym scene detection
 */
export const DOMAIN_CONFIG = {
  confidenceThreshold: 0.35,
  confidenceMargin: 0.05,
} as const;

/**
 * Label Recognition Configuration
 * Controls equipment type identification
 */
export const LABEL_CONFIG = {
  confidenceThreshold: 0.45,
  confidenceGap: 0.08,
  highConfidenceThreshold: 0.65,
  maxCandidates: 5,
} as const;

/**
 * Confidence Fusion Weights
 * Controls how text similarity and reference photo similarity are combined
 * Must sum to 1.0
 */
export const FUSION_WEIGHTS = {
  text: 0.6,
  reference: 0.4,
} as const;

/**
 * Cache Configuration
 * Version numbers for embedding caches (increment to invalidate)
 */
export const CACHE_CONFIG = {
  prefixes: {
    machine: 'machinemate_embedding_v3_',
    label: 'machinemate_label_embedding_v2_',
    domain: 'machinemate_domain_embedding_v2_',
  },
  legacyPrefixes: [
    'machinemate_embedding_v1_',
    'machinemate_embedding_v2_',
    'machinemate_label_embedding_v1_',
    'machinemate_domain_embedding_v1_',
  ],
  migrationKey: 'machinemate_cache_migrated_v2',
} as const;

/**
 * Type-safe access to all configuration
 */
export const RECOGNITION_CONFIG = {
  huggingFace: HF_CONFIG,
  api: API_CONFIG,
  domain: DOMAIN_CONFIG,
  label: LABEL_CONFIG,
  fusion: FUSION_WEIGHTS,
  cache: CACHE_CONFIG,
} as const;
