// Validation schemas using Zod for runtime type checking
// Ensures data from AsyncStorage and API responses is valid

import { z } from 'zod';

/**
 * Schema for validating favorites stored in AsyncStorage
 * Expects an array of machine ID strings
 */
export const FavoritesSchema = z.array(z.string().min(1).max(100));

/**
 * Schema for validating a single history item
 */
export const RecentHistoryItemSchema = z.object({
  machineId: z.string().min(1).max(100),
  viewedAt: z.string().datetime(), // ISO 8601 date string
}).strict();

/**
 * Schema for validating history array stored in AsyncStorage
 */
export const RecentHistorySchema = z.array(RecentHistoryItemSchema).max(20);

/**
 * Schema for validating backend API response
 */
export const BackendIdentifyResponseSchema = z.object({
  machine: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
  trace_id: z.string().optional(),
  mocked: z.boolean().optional(),
}).strict();

/**
 * Schema for validating Hugging Face embedding response
 * Supports multiple response formats from the API
 */
export const HuggingFaceEmbeddingSchema = z.union([
  // Format 1: Direct array of numbers
  z.array(z.number()),

  // Format 2: Nested array [[...]]
  z.array(z.array(z.number())),

  // Format 3: Object with array property
  z.object({
    embedding: z.array(z.number()),
  }).strict(),

  // Format 4: Object with nested array
  z.object({
    embedding: z.array(z.array(z.number())),
  }).strict(),
]);

/**
 * Schema for cached embedding in AsyncStorage
 * Includes versioning and timestamp for cache invalidation
 */
export const CachedEmbeddingSchema = z.object({
  embedding: z.array(z.number()),
  timestamp: z.number(),
  version: z.number(),
}).strict();

/**
 * Type helpers extracted from schemas
 */
export type BackendIdentifyResponse = z.infer<typeof BackendIdentifyResponseSchema>;
export type CachedEmbedding = z.infer<typeof CachedEmbeddingSchema>;
