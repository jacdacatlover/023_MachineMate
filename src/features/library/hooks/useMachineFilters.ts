import { useMemo } from 'react';

import { useDebounce } from '@shared/hooks/useDebounce';

import { MachineCategory, MachineDefinition } from 'src/types/machine';

const DEBOUNCE_DELAY_MS = 300;

/**
 * Hook for filtering and searching machines
 *
 * Features:
 * - Debounced search text (300ms)
 * - Category filtering
 * - Case-insensitive search across name, category, and muscles
 * - Memoized results for performance
 *
 * @param machines - Array of all machines to filter
 * @param searchText - Search query (debounced internally)
 * @param selectedCategory - Category filter (null for all categories)
 *
 * @returns Filtered array of machines
 *
 * @example
 * ```tsx
 * function MachineLibrary() {
 *   const { machines } = useMachines();
 *   const [searchText, setSearchText] = useState('');
 *   const [category, setCategory] = useState<MachineCategory | null>(null);
 *
 *   const filteredMachines = useMachineFilters(machines, searchText, category);
 *
 *   return (
 *     <>
 *       <SearchBar value={searchText} onChangeText={setSearchText} />
 *       <CategoryPicker value={category} onChange={setCategory} />
 *       <MachineList machines={filteredMachines} />
 *     </>
 *   );
 * }
 * ```
 */
export function useMachineFilters(
  machines: MachineDefinition[],
  searchText: string,
  selectedCategory: MachineCategory | null
): MachineDefinition[] {
  // Debounce search text to avoid excessive filtering while typing
  const debouncedSearchText = useDebounce(searchText, DEBOUNCE_DELAY_MS);

  const filteredMachines = useMemo(() => {
    let filtered = machines;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((machine) => machine.category === selectedCategory);
    }

    // Filter by search text
    if (debouncedSearchText.trim()) {
      const searchLower = debouncedSearchText.toLowerCase().trim();

      filtered = filtered.filter((machine) => {
        // Search in machine name
        if (machine.name.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in category
        if (machine.category.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in primary muscles
        if (
          machine.primaryMuscles.some((muscle) =>
            muscle.toLowerCase().includes(searchLower)
          )
        ) {
          return true;
        }

        // Search in secondary muscles
        if (
          machine.secondaryMuscles?.some((muscle) =>
            muscle.toLowerCase().includes(searchLower)
          )
        ) {
          return true;
        }

        // Search in difficulty level
        if (machine.difficulty.toLowerCase().includes(searchLower)) {
          return true;
        }

        return false;
      });
    }

    return filtered;
  }, [machines, debouncedSearchText, selectedCategory]);

  return filteredMachines;
}
