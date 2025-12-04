/**
 * Authenticated API Client
 *
 * Provides a wrapper around fetch() that automatically includes
 * JWT authentication headers for all requests to the backend API.
 */

import Constants from 'expo-constants';

import { supabase } from './supabaseClient';
import { createLogger } from '../../shared/logger';

const logger = createLogger('api.apiClient');

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';

/**
 * API Error with status code and response details
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Options for API requests
 */
export interface ApiRequestOptions extends RequestInit {
  /** Whether to include authentication header (default: true) */
  requireAuth?: boolean;
  /** Custom headers to merge with defaults */
  headers?: HeadersInit;
  /** Query parameters to append to the URL */
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Makes an authenticated API request to the backend
 *
 * Features:
 * - Automatic JWT token injection
 * - Token refresh on 401 errors
 * - Structured logging
 * - Type-safe responses
 *
 * @param endpoint - API endpoint path (e.g., '/api/v1/machines')
 * @param options - Fetch options with auth control
 * @returns Parsed JSON response
 * @throws ApiError on non-2xx responses
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requireAuth = true, headers = {}, params, ...fetchOptions } = options;

  // Build full URL with query parameters
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Get JWT token if authentication is required
  let token: string | undefined;
  if (requireAuth) {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.error('Failed to get session for API request', { endpoint, error });
      throw new ApiError(401, 'Unauthorized', 'Authentication required');
    }

    token = session?.access_token;
    if (!token) {
      logger.warn('No access token available for authenticated request', { endpoint });
      throw new ApiError(401, 'Unauthorized', 'No active session');
    }
  }

  // Build headers
  const requestHeaders = new Headers({
    'Content-Type': 'application/json',
  });
  const providedHeaders = new Headers(headers);
  providedHeaders.forEach((value, key) => {
    requestHeaders.set(key, value);
  });

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  // Log request
  logger.debug('API request', {
    method: fetchOptions.method || 'GET',
    endpoint,
    hasAuth: !!token,
  });

  try {
    // Make request
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    // Handle 401 - try to refresh session
    if (response.status === 401 && requireAuth) {
      logger.warn('Received 401, attempting token refresh', { endpoint });

      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      if (refreshError || !session) {
        logger.error('Token refresh failed', { endpoint, error: refreshError });
        throw new ApiError(401, 'Unauthorized', 'Session expired');
      }

      // Retry request with new token
      requestHeaders.set('Authorization', `Bearer ${session.access_token}`);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        logger.error('API request failed after token refresh', {
          endpoint,
          status: retryResponse.status,
          statusText: retryResponse.statusText,
          error: errorText,
        });
        throw new ApiError(
          retryResponse.status,
          retryResponse.statusText,
          `API request failed: ${errorText}`,
          errorText
        );
      }

      const data = await retryResponse.json();
      logger.debug('API request succeeded after token refresh', { endpoint });
      return data as T;
    }

    // Handle other non-2xx responses
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('API request failed', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new ApiError(
        response.status,
        response.statusText,
        `API request failed: ${errorText}`,
        errorText
      );
    }

    // Parse and return response
    const data = await response.json();
    logger.debug('API request succeeded', { endpoint });
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    logger.error('API request error', {
      endpoint,
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new ApiError(
      0,
      'NetworkError',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  data: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  data: unknown,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

// NOTE: Module-level logger calls removed to prevent runtime errors
// The logger will be called when API methods are first used
// logger.info('API client initialized', {
//   baseUrl: API_BASE_URL,
// });
