/**
 * Tests for Machines API Service
 */

import { getMachines } from '../machinesApi';
import * as apiClient from '../../../../services/api/apiClient';
import { MachineDefinition } from '@typings/machine';

// Mock the logger first to avoid errors
jest.mock('../../../../shared/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock the API client
jest.mock('../../../../services/api/apiClient');

const mockedApiGet = apiClient.apiGet as jest.MockedFunction<typeof apiClient.apiGet>;

describe('machinesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMachines', () => {
    it('should fetch machines catalog successfully', async () => {
      const mockMachines: MachineDefinition[] = [
        {
          id: 'machine1',
          name: 'Leg Press',
          category: 'Lower Body',
          primaryMuscles: ['quadriceps', 'glutes'],
          difficulty: 'Beginner',
          setupSteps: ['Adjust seat position'],
          howToSteps: ['Step 1', 'Step 2'],
          commonMistakes: ['Locking knees'],
          safetyTips: ['Keep back flat'],
          beginnerTips: ['Start light'],
        },
        {
          id: 'machine2',
          name: 'Chest Press',
          category: 'Chest',
          primaryMuscles: ['pectorals'],
          difficulty: 'Beginner',
          setupSteps: ['Adjust seat height'],
          howToSteps: ['Step 1', 'Step 2'],
          commonMistakes: ['Arching back'],
          safetyTips: ['Keep feet planted'],
          beginnerTips: ['Start with light weight'],
        },
      ];

      const mockResponse = {
        machines: mockMachines,
        total: 2,
        page: 1,
        page_size: 20,
      };

      mockedApiGet.mockResolvedValue(mockResponse);

      const result = await getMachines();

      expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/machines', {
        requireAuth: false,
      });
      expect(result).toEqual(mockMachines);
    });

    it('should handle empty machines list', async () => {
      const mockResponse = {
        machines: [],
        total: 0,
        page: 1,
        page_size: 20,
      };

      mockedApiGet.mockResolvedValue(mockResponse);

      const result = await getMachines();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Network error');
      mockedApiGet.mockRejectedValue(error);

      await expect(getMachines()).rejects.toThrow('Network error');
    });

    it('should call API without authentication', async () => {
      const mockResponse = {
        machines: [],
        total: 0,
        page: 1,
        page_size: 20,
      };

      mockedApiGet.mockResolvedValue(mockResponse);

      await getMachines();

      expect(mockedApiGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ requireAuth: false })
      );
    });
  });
});
