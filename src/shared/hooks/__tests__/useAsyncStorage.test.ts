import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { z } from 'zod';

import { useAsyncStorage } from '../useAsyncStorage';

describe('useAsyncStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testSchema = z.array(z.string());
  const defaultValue: string[] = [];
  const key = 'test-key';

  it('should load default value when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(defaultValue);
    expect(result.current.error).toBeNull();
  });

  it('should load and validate data from storage', async () => {
    const storedData = ['item1', 'item2'];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedData));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(storedData);
    expect(result.current.error).toBeNull();
  });

  it('should use default value and clear storage when data is invalid', async () => {
    const invalidData = { invalid: 'object' };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(invalidData));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(defaultValue);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('should save valid data to storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newData = ['new-item'];
    await act(async () => {
      await result.current.setData(newData);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(newData));
    await waitFor(() => {
      expect(result.current.data).toEqual(newData);
    });
    expect(result.current.error).toBeNull();
  });

  it('should throw error when saving invalid data', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const invalidData = { invalid: 'data' } as unknown as string[];

    await expect(result.current.setData(invalidData)).rejects.toThrow();
  });

  it('should clear data from storage', async () => {
    const storedData = ['item1', 'item2'];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedData));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(storedData);

    await act(async () => {
      await result.current.clearData();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    await waitFor(() => {
      expect(result.current.data).toEqual(defaultValue);
    });
  });

  it('should call onValueChange callback when data changes', async () => {
    const onValueChange = jest.fn();
    const storedData = ['item1'];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedData));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
        onValueChange,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onValueChange).toHaveBeenCalledWith(storedData);

    const newData = ['item2'];
    await act(async () => {
      await result.current.setData(newData);
    });

    await waitFor(() => {
      expect(onValueChange).toHaveBeenCalledWith(newData);
    });
  });

  it('should support function updates', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(['item1']));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setData((prev) => [...prev, 'item2']);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(['item1', 'item2']);
    });
  });

  it('should handle storage errors gracefully', async () => {
    const error = new Error('Storage error');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(defaultValue);
    expect(result.current.error).toBeTruthy();
  });

  it('should reload data from storage', async () => {
    const initialData = ['item1'];
    const updatedData = ['item1', 'item2'];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(initialData));

    const { result } = renderHook(() =>
      useAsyncStorage({
        key,
        schema: testSchema,
        defaultValue,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(initialData);

    // Simulate external change to storage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(updatedData));

    await act(async () => {
      await result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(updatedData);
    });
  });
});
