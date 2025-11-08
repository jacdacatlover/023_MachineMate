import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import { MachinesProvider } from '@app/providers/MachinesProvider';

import { MachineDefinition } from '@typings/machine';

import { useFavorites } from '../useFavorites';

// Mock machines data
const mockMachines: MachineDefinition[] = [
  {
    id: 'machine-1',
    name: 'Leg Press',
    category: 'Lower Body',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes'],
    difficulty: 'Beginner',
    setupSteps: ['Step 1'],
    howToSteps: ['Step 1'],
    commonMistakes: ['Mistake 1'],
    safetyTips: ['Tip 1'],
    beginnerTips: ['Tip 1'],
  },
  {
    id: 'machine-2',
    name: 'Chest Press',
    category: 'Chest',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Triceps'],
    difficulty: 'Beginner',
    setupSteps: ['Step 1'],
    howToSteps: ['Step 1'],
    commonMistakes: ['Mistake 1'],
    safetyTips: ['Tip 1'],
    beginnerTips: ['Tip 1'],
  },
];

// Wrapper component for providing context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MachinesProvider machines={mockMachines}>{children}</MachinesProvider>
);

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should initialize with empty favorites', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toEqual([]);
  });

  it('should load existing favorites from storage', async () => {
    const storedFavorites = ['machine-1', 'machine-2'];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedFavorites));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toEqual(storedFavorites);
  });

  it('should add a machine to favorites', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addFavorite('machine-1');
    });

    await waitFor(() => {
      expect(result.current.favorites).toContain('machine-1');
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@machinemate_favorites',
      JSON.stringify(['machine-1'])
    );
  });

  it('should remove a machine from favorites', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['machine-1', 'machine-2']));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeFavorite('machine-1');
    });

    await waitFor(() => {
      expect(result.current.favorites).toEqual(['machine-2']);
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@machinemate_favorites',
      JSON.stringify(['machine-2'])
    );
  });

  it('should check if a machine is favorited', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['machine-1']));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isFavorite('machine-1')).toBe(true);
    expect(result.current.isFavorite('machine-2')).toBe(false);
  });

  it('should toggle favorite status', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Toggle on
    await act(async () => {
      await result.current.toggleFavorite('machine-1');
    });
    await waitFor(() => {
      expect(result.current.favorites).toContain('machine-1');
    });

    // Toggle off
    await act(async () => {
      await result.current.toggleFavorite('machine-1');
    });
    await waitFor(() => {
      expect(result.current.favorites).not.toContain('machine-1');
    });
  });

  it('should clear all favorites', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['machine-1', 'machine-2']));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toHaveLength(2);

    await act(async () => {
      await result.current.clearFavorites();
    });

    await waitFor(() => {
      expect(result.current.favorites).toEqual([]);
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@machinemate_favorites');
  });

  it('should filter out invalid machine IDs', async () => {
    const storedFavorites = ['machine-1', 'invalid-machine', 'machine-2'];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedFavorites));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only contain valid machine IDs
    expect(result.current.favorites).toEqual(['machine-1', 'machine-2']);
    expect(result.current.favorites).not.toContain('invalid-machine');
  });

  it('should throw error when adding invalid machine ID', async () => {
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addFavorite('invalid-machine')).rejects.toThrow();
  });

  it('should not add duplicate favorites', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['machine-1']));

    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toEqual(['machine-1']);

    await act(async () => {
      await result.current.addFavorite('machine-1');
    });

    // Should still have only one
    await waitFor(() => {
      expect(result.current.favorites).toEqual(['machine-1']);
    });
  });
});
