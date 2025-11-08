import { useEffect, useState } from 'react';

/**
 * Hook that debounces a value
 *
 * Useful for search inputs, filtering, etc. to avoid excessive re-renders
 * or API calls while user is typing.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 *
 * @example
 * ```tsx
 * function SearchBar() {
 *   const [searchText, setSearchText] = useState('');
 *   const debouncedSearch = useDebounce(searchText, 500);
 *
 *   useEffect(() => {
 *     // This only runs 500ms after user stops typing
 *     performSearch(debouncedSearch);
 *   }, [debouncedSearch]);
 *
 *   return <TextInput value={searchText} onChangeText={setSearchText} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
