/* eslint-env jest */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import { MachinesProvider } from '@app/providers/MachinesProvider';
import { RecognitionSettingsProvider } from '@app/providers/RecognitionSettingsProvider';

import { IdentificationResult } from '@typings/identification';
import { MachineDefinition } from '@typings/machine';
import { DEFAULT_CONFIDENCE_THRESHOLD } from '@shared/constants/recognition';

import * as identifyMachineService from '../../services/identifyMachine';
import { useIdentifyMachine } from '../useIdentifyMachine';

// Mock the identifyMachine service
jest.mock('../../services/identifyMachine');
jest.mock('../../../../services/api/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

const mockMachines: MachineDefinition[] = [
  {
    id: 'machine-1',
    name: 'Leg Press',
    category: 'Lower Body',
    primaryMuscles: ['Quadriceps'],
    secondaryMuscles: [],
    difficulty: 'Beginner',
    setupSteps: [],
    howToSteps: [],
    commonMistakes: [],
    safetyTips: [],
    beginnerTips: [],
  },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RecognitionSettingsProvider>
    <MachinesProvider machines={mockMachines}>{children}</MachinesProvider>
  </RecognitionSettingsProvider>
);

describe('useIdentifyMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('should successfully identify a machine', async () => {
    const mockResult: IdentificationResult = {
      kind: 'catalog',
      machineId: 'machine-1',
      candidates: ['machine-1'],
      confidence: 0.95,
      lowConfidence: false,
      source: 'backend_api',
    };

    (identifyMachineService.identifyMachine as jest.Mock).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    const photoUri = 'file:///path/to/photo.jpg';
    let identificationResult: IdentificationResult | null = null;
    await act(async () => {
      identificationResult = await result.current.identify(photoUri);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(identificationResult).toEqual(mockResult);
    await waitFor(() => {
      expect(result.current.result).toEqual(mockResult);
    });
    expect(result.current.error).toBeNull();
    expect(identifyMachineService.identifyMachine).toHaveBeenCalledWith(
      photoUri,
      mockMachines,
      { confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD }
    );
  });

  it('should handle identification errors', async () => {
    const mockError = new Error('Network error');
    (identifyMachineService.identifyMachine as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    const photoUri = 'file:///path/to/photo.jpg';
    let identificationResult: IdentificationResult | null = null;
    await act(async () => {
      identificationResult = await result.current.identify(photoUri);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(identificationResult).toBeNull();
    expect(result.current.result).toBeNull();
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.error?.message).toContain('Network error');
  });

  it('should set loading state during identification', async () => {
    const mockResult: IdentificationResult = {
      kind: 'catalog',
      machineId: 'machine-1',
      candidates: ['machine-1'],
      confidence: 0.95,
      lowConfidence: false,
      source: 'backend_api',
    };

    // Delay the mock resolution to capture loading state
    (identifyMachineService.identifyMachine as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockResult), 100))
    );

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    const photoUri = 'file:///path/to/photo.jpg';
    const promise = result.current.identify(photoUri);

    // Should be loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      await promise;
    });

    // Should finish loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear previous results when identifying again', async () => {
    const firstResult: IdentificationResult = {
      kind: 'catalog',
      machineId: 'machine-1',
      candidates: ['machine-1'],
      confidence: 0.95,
      lowConfidence: false,
      source: 'backend_api',
    };

    const secondResult: IdentificationResult = {
      kind: 'generic',
      labelId: 'unknown-machine',
      labelName: 'Unknown Machine',
      candidates: [],
      confidence: 0.5,
      source: 'backend_api',
    };

    (identifyMachineService.identifyMachine as jest.Mock)
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(secondResult);

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    // First identification
    await act(async () => {
      await result.current.identify('file:///photo1.jpg');
    });
    await waitFor(() => {
      expect(result.current.result).toEqual(firstResult);
    });

    // Second identification
    await act(async () => {
      await result.current.identify('file:///photo2.jpg');
    });
    await waitFor(() => {
      expect(result.current.result).toEqual(secondResult);
    });
  });

  it('should clear error on successful identification', async () => {
    const mockError = new Error('First error');
    const mockResult: IdentificationResult = {
      kind: 'catalog',
      machineId: 'machine-1',
      candidates: ['machine-1'],
      confidence: 0.95,
      lowConfidence: false,
      source: 'backend_api',
    };

    (identifyMachineService.identifyMachine as jest.Mock)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    // First call fails
    await act(async () => {
      await result.current.identify('file:///photo1.jpg');
    });
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Second call succeeds
    await act(async () => {
      await result.current.identify('file:///photo2.jpg');
    });
    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(mockResult);
    });
  });

  it('should handle non-Error exceptions', async () => {
    (identifyMachineService.identifyMachine as jest.Mock).mockRejectedValue('String error');

    const { result } = renderHook(() => useIdentifyMachine(), { wrapper });

    await act(async () => {
      await result.current.identify('file:///photo.jpg');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.message).toContain('Failed to identify machine');
    });
  });
});
