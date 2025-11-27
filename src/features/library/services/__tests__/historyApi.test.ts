/**
 * Tests for History API Service
 */

import { getHistory, addToHistory, clearAllHistory } from '../historyApi';
import * as apiClient from '../../../../services/api/apiClient';

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
const mockedApiPost = apiClient.apiPost as jest.MockedFunction<typeof apiClient.apiPost>;
const mockedApiDelete = apiClient.apiDelete as jest.MockedFunction<typeof apiClient.apiDelete>;

describe('historyApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistory', () => {
    it('should fetch history and transform to RecentHistoryItem format', async () => {
      const mockHistory = [
        {
          id: '1',
          machine_id: 'machine1',
          taken_at: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01',
        },
        {
          id: '2',
          machine_id: 'machine2',
          taken_at: '2024-01-02T11:00:00Z',
          created_at: '2024-01-02',
        },
      ];

      mockedApiGet.mockResolvedValue({ history: mockHistory, total: 2, page: 1, page_size: 20 });

      const result = await getHistory();

      expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/history');
      expect(result).toEqual([
        { entryId: '1', machineId: 'machine1', viewedAt: '2024-01-01T10:00:00Z' },
        { entryId: '2', machineId: 'machine2', viewedAt: '2024-01-02T11:00:00Z' },
      ]);
    });

    it('should handle empty history', async () => {
      mockedApiGet.mockResolvedValue({ history: [], total: 0, page: 1, page_size: 20 });

      const result = await getHistory();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Network error');
      mockedApiGet.mockRejectedValue(error);

      await expect(getHistory()).rejects.toThrow('Network error');
    });
  });

  describe('addToHistory', () => {
    it('should add machine to history successfully', async () => {
      const machineId = 'machine123';
      mockedApiPost.mockResolvedValue({});

      await addToHistory(machineId);

      expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/history', { machine_id: machineId });
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Failed to add');
      mockedApiPost.mockRejectedValue(error);

      await expect(addToHistory('machine123')).rejects.toThrow('Failed to add');
    });
  });

  describe('clearAllHistory', () => {
    it('should clear all history successfully', async () => {
      mockedApiDelete.mockResolvedValue({});

      await clearAllHistory();

      expect(mockedApiDelete).toHaveBeenCalledWith('/api/v1/history');
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Failed to clear');
      mockedApiDelete.mockRejectedValue(error);

      await expect(clearAllHistory()).rejects.toThrow('Failed to clear');
    });
  });
});
