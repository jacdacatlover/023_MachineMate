import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import { MachinesProvider } from '@app/providers/MachinesProvider';

import { RecentHistoryItem } from '@typings/history';
import { MachineDefinition } from '@typings/machine';

import { useRecentHistory } from '../useRecentHistory';

const mockMachines: MachineDefinition[] = Array.from({ length: 12 }, (_, index) => ({
  id: `machine-${index + 1}`,
  name: `Machine ${index + 1}`,
  category: index % 2 === 0 ? 'Lower Body' : 'Upper Body',
  primaryMuscles: ['Quadriceps'],
  secondaryMuscles: ['Hamstrings'],
  difficulty: 'Beginner',
  setupSteps: ['Step 1'],
  howToSteps: ['Step 1'],
  commonMistakes: ['Mistake'],
  safetyTips: ['Tip'],
  beginnerTips: ['Beginner tip'],
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MachinesProvider machines={mockMachines}>{children}</MachinesProvider>
);

describe('useRecentHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should initialize with empty history', async () => {
    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.history).toEqual([]);
  });

  it('should load existing history from storage', async () => {
    const storedHistory: RecentHistoryItem[] = [
      { machineId: 'machine-1', viewedAt: '2025-01-01T00:00:00.000Z' },
      { machineId: 'machine-2', viewedAt: '2025-01-02T00:00:00.000Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.history).toEqual(storedHistory);
  });

  it('should add a machine to history', async () => {
    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addToHistory('machine-1');
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(1);
    });
    expect(result.current.history[0].machineId).toBe('machine-1');
    expect(result.current.history[0].viewedAt).toBeDefined();
  });

  it('should move existing machine to top when added again', async () => {
    const oldTimestamp = '2025-01-01T00:00:00.000Z';
    const storedHistory: RecentHistoryItem[] = [
      { machineId: 'machine-1', viewedAt: oldTimestamp },
      { machineId: 'machine-2', viewedAt: '2025-01-02T00:00:00.000Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add machine-1 again
    await act(async () => {
      await result.current.addToHistory('machine-1');
    });

    await waitFor(() => {
      expect(result.current.history).toHaveLength(2);
    });
    expect(result.current.history[0].machineId).toBe('machine-1');
    expect(result.current.history[1].machineId).toBe('machine-2');
    // Timestamp should be updated
    expect(result.current.history[0].viewedAt).not.toBe(oldTimestamp);
  });

  it('should limit history to 10 items', async () => {
    // Create history with 10 items
    const storedHistory: RecentHistoryItem[] = Array.from({ length: 10 }, (_, i) => ({
      machineId: `machine-${i + 1}`,
      viewedAt: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add another machine
    await act(async () => {
      await result.current.addToHistory('machine-1');
    });

    // Should still have 10 items (oldest removed)
    await waitFor(() => {
      expect(result.current.history).toHaveLength(10);
    });
    expect(result.current.history[0].machineId).toBe('machine-1');
  });

  it('should clear all history', async () => {
    const storedHistory: RecentHistoryItem[] = [
      { machineId: 'machine-1', viewedAt: '2025-01-01T00:00:00.000Z' },
      { machineId: 'machine-2', viewedAt: '2025-01-02T00:00:00.000Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.history).toHaveLength(2);

    await act(async () => {
      await result.current.clearHistory();
    });

    await waitFor(() => {
      expect(result.current.history).toEqual([]);
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@machinemate_history');
  });

  it('should filter out invalid machine IDs', async () => {
    const storedHistory: RecentHistoryItem[] = [
      { machineId: 'machine-1', viewedAt: '2025-01-01T00:00:00.000Z' },
      { machineId: 'invalid-machine', viewedAt: '2025-01-02T00:00:00.000Z' },
      { machineId: 'machine-2', viewedAt: '2025-01-03T00:00:00.000Z' },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedHistory));

    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only contain valid machines
    expect(result.current.history).toHaveLength(2);
    expect(result.current.history.map(item => item.machineId)).toEqual(['machine-1', 'machine-2']);
  });

  it('should throw error when adding invalid machine ID', async () => {
    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addToHistory('invalid-machine')).rejects.toThrow();
  });

  it('should persist history to AsyncStorage', async () => {
    const { result } = renderHook(() => useRecentHistory(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addToHistory('machine-1');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@machinemate_history',
      expect.stringContaining('machine-1')
    );
  });
});
