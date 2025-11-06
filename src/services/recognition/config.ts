// Centralized configuration for the recognition client.

export const API_CONFIG = {
  confidenceThreshold: 0.7,
  timeoutMs: 15000,
} as const;

export const RECOGNITION_CONFIG = {
  api: API_CONFIG,
} as const;
