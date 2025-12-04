/**
 * History API Service
 *
 * Handles all history-related API calls to the backend
 */

import { RecentHistoryItem } from '@typings/history';

import { apiGet, apiPost, apiDelete } from '../../../services/api/apiClient';
import { createLogger } from '../../../shared/logger';


const logger = createLogger('library.history');

export interface HistoryResponse {
  id: string;
  machine_id: string;
  taken_at: string;
  created_at: string;
  photo_uri?: string | null;
}

export interface HistoryListResponse {
  history: HistoryResponse[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Fetch recent history for the current user
 */
export async function getHistory(): Promise<RecentHistoryItem[]> {
  try {
    const response = await apiGet<HistoryListResponse>('/api/v1/history');
    const history = response?.history ?? [];

    // Transform to RecentHistoryItem format for compatibility
    return history.map(item => ({
      entryId: item.id,
      machineId: item.machine_id,
      viewedAt: item.taken_at,
    }));
  } catch (error) {
    logger.error('Failed to fetch history', { error });
    throw error;
  }
}

/**
 * Add or update a machine view in history
 */
export async function addToHistory(machineId: string): Promise<void> {
  try {
    await apiPost('/api/v1/history', { machine_id: machineId });
    logger.info('Added machine to history', { machineId });
  } catch (error) {
    logger.error('Failed to add to history', { machineId, error });
    throw error;
  }
}

/**
 * Clear all history for the current user
 */
export async function clearAllHistory(): Promise<void> {
  try {
    await apiDelete('/api/v1/history');
    logger.info('Cleared all history');
  } catch (error) {
    logger.error('Failed to clear all history', { error });
    throw error;
  }
}
