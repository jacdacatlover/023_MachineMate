/**
 * Tests for Favorites API Service
 */

import * as apiClient from '../../../../services/api/apiClient';
import { getFavorites, addFavorite, removeFavorite, clearAllFavorites } from '../favoritesApi';

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

describe('favoritesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFavorites', () => {
    it('should fetch favorites and return machine IDs', async () => {
      const mockFavorites = [
        { machine_id: 'machine1', created_at: '2024-01-01T00:00:00Z', notes: null },
        { machine_id: 'machine2', created_at: '2024-01-02T00:00:00Z', notes: 'note' },
      ];

      mockedApiGet.mockResolvedValue({ favorites: mockFavorites, total: 2 });

      const result = await getFavorites();

      expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/favorites');
      expect(result).toEqual(['machine1', 'machine2']);
    });

    it('should handle empty favorites', async () => {
      mockedApiGet.mockResolvedValue({ favorites: [], total: 0 });

      const result = await getFavorites();

      expect(result).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Network error');
      mockedApiGet.mockRejectedValue(error);

      await expect(getFavorites()).rejects.toThrow('Network error');
    });
  });

  describe('addFavorite', () => {
    it('should add a favorite successfully', async () => {
      const machineId = 'machine123';
      mockedApiPost.mockResolvedValue({});

      await addFavorite(machineId);

      expect(mockedApiPost).toHaveBeenCalledWith('/api/v1/favorites', { machine_id: machineId });
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Failed to add');
      mockedApiPost.mockRejectedValue(error);

      await expect(addFavorite('machine123')).rejects.toThrow('Failed to add');
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite successfully', async () => {
      const machineId = 'machine123';
      mockedApiDelete.mockResolvedValue({});

      await removeFavorite(machineId);

      expect(mockedApiDelete).toHaveBeenCalledWith(`/api/v1/favorites/${machineId}`);
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Failed to remove');
      mockedApiDelete.mockRejectedValue(error);

      await expect(removeFavorite('machine123')).rejects.toThrow('Failed to remove');
    });
  });

  describe('clearAllFavorites', () => {
    it('should clear all favorites successfully', async () => {
      mockedApiDelete.mockResolvedValue({});

      await clearAllFavorites();

      expect(mockedApiDelete).toHaveBeenCalledWith('/api/v1/favorites');
    });

    it('should throw error on API failure', async () => {
      const error = new Error('Failed to clear');
      mockedApiDelete.mockRejectedValue(error);

      await expect(clearAllFavorites()).rejects.toThrow('Failed to clear');
    });
  });
});
