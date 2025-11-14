/**
 * Machines API Service
 *
 * Handles machine catalog API calls to the backend
 */

import { apiGet } from '../../../services/api/apiClient';
import { createLogger } from '../../../shared/logger';

import { MachineDefinition } from '@typings/machine';

const logger = createLogger('library.machines');

/**
 * Fetch the machine catalog from the backend
 */
export async function getMachines(): Promise<MachineDefinition[]> {
  try {
    const response = await apiGet<{
      machines: MachineDefinition[];
      total: number;
      page: number;
      page_size: number;
    }>('/api/v1/machines', {
      requireAuth: false,
    });
    const machines = response.machines;
    logger.info('Fetched machine catalog from backend', {
      count: machines.length,
      total: response.total,
    });
    return machines;
  } catch (error) {
    logger.error('Failed to fetch machines from backend', { error });
    throw error;
  }
}
