/**
 * Supabase Client Configuration
 *
 * Initializes and exports a singleton Supabase client instance
 * with secure token storage using expo-secure-store.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { createLogger } from '../../shared/logger';

const logger = createLogger('api.supabaseClient');

/**
 * Custom storage adapter that uses expo-secure-store for secure token persistence
 *
 * Note: All operations are wrapped in try-catch to prevent storage failures
 * from breaking authentication entirely
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value;
    } catch (error) {
      logger.error('SecureStore getItem failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('SecureStore setItem failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - allow auth to continue even if storage fails
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('SecureStore removeItem failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw - allow auth to continue even if storage fails
    }
  },
};

/**
 * Get Supabase configuration with fallback chain:
 * 1. Environment variables (EXPO_PUBLIC_*)
 * 2. Expo config extra
 * 3. Test mode defaults (if NODE_ENV === 'test')
 */
function getSupabaseConfig(): { url: string; anonKey: string } {
  // Try environment variables first
  let url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  let anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  // Fallback to Expo config
  if (!url || !anonKey) {
    const extra = Constants.expoConfig?.extra;
    url = url || extra?.supabaseUrl || '';
    anonKey = anonKey || extra?.supabaseAnonKey || '';
  }

  // Test mode fallbacks - use dummy values to allow tests to run
  if ((!url || !anonKey) && process.env.NODE_ENV === 'test') {
    logger.debug('Using test mode Supabase configuration');
    return {
      url: process.env.TEST_SUPABASE_URL || 'https://test.supabase.co',
      anonKey: process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key-for-mocking',
    };
  }

  return { url, anonKey };
}

/**
 * Lazily-initialized Supabase client singleton
 */
let _supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Get or create the Supabase client instance
 *
 * Features:
 * - Lazy initialization (only creates client when first used)
 * - Secure token storage via expo-secure-store
 * - Automatic token refresh
 * - Fallback configuration chain for testing
 *
 * @throws {Error} If Supabase configuration is missing in production
 */
export function getSupabaseClient(): ReturnType<typeof createClient> {
  if (_supabaseClient) {
    return _supabaseClient;
  }

  const { url, anonKey } = getSupabaseConfig();

  // Validate configuration (throw only when actually trying to use the client)
  if (!url || !anonKey) {
    logger.error('Missing Supabase configuration', {
      hasUrl: !!url,
      hasAnonKey: !!anonKey,
      nodeEnv: process.env.NODE_ENV,
    });
    throw new Error(
      'Missing Supabase configuration. Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  logger.info('Initializing Supabase client', {
    url: url.substring(0, 30) + '...',
    isTest: process.env.NODE_ENV === 'test',
  });

  _supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed for mobile apps
    },
  });

  return _supabaseClient;
}

/**
 * Backward-compatible export using Proxy for lazy initialization
 *
 * This allows existing code using `import { supabase } from './supabaseClient'`
 * to continue working without changes, while deferring initialization until
 * the client is actually used.
 */
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof typeof client];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
