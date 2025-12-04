/**
 * Machines API Service
 *
 * Handles machine catalog API calls to the backend
 */

import { MachineDefinition } from '@typings/machine';

import { apiGet } from '../../../services/api/apiClient';
import { createLogger } from '../../../shared/logger';


const logger = createLogger('library.machines');

/**
 * Fetch the machine catalog from the backend
 * Implements pagination to fetch all machines, not just the first page
 */
export async function getMachines(): Promise<MachineDefinition[]> {
  try {
    const allMachines: MachineDefinition[] = [];
    let page = 1;
    let total = 0;

    // Fetch all pages until we have all machines
    do {
      const response = await apiGet<{
        machines: MachineDefinition[];
        total: number;
        page: number;
        page_size: number;
      }>('/api/v1/machines', {
        requireAuth: false,
        params: { page, page_size: 50 },
      });

      allMachines.push(...response.machines);
      total = response.total;
      page++;
    } while (allMachines.length < total);

    logger.info('Fetched machine catalog from backend', {
      count: allMachines.length,
      total,
    });
    return allMachines;
  } catch (error) {
    logger.error('Failed to fetch machines from backend', { error });
    throw error;
  }
}
