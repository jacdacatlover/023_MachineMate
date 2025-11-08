# Testing Guide for MachineMate

This document outlines the testing conventions, best practices, and guidelines for the MachineMate project.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking](#mocking)
- [Coverage](#coverage)

## Overview

MachineMate uses **Jest** as the test runner and **React Native Testing Library** for component and hook testing.

### Test Stack

- **Jest**: Test runner and assertion library
- **@testing-library/react-native**: React Native testing utilities
- **jest-expo**: Expo-specific Jest preset

## Test Structure

Tests are co-located with the code they test in `__tests__` folders:

```
src/
  features/
    identification/
      hooks/
        __tests__/
          useIdentifyMachine.test.ts
        useIdentifyMachine.ts
    library/
      hooks/
        __tests__/
          useFavorites.test.ts
          useRecentHistory.test.ts
  shared/
    hooks/
      __tests__/
        useAsyncStorage.test.ts
```

### Test File Naming

- Unit tests: `ComponentName.test.ts` or `hookName.test.ts`
- Integration tests: `feature.integration.test.ts`
- Place tests in `__tests__` folders next to the code being tested

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- useAsyncStorage.test.ts
```

## Writing Tests

### Hook Testing

Use `renderHook` from `@testing-library/react-native` to test custom hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useAsyncStorage } from '../useAsyncStorage';

describe('useAsyncStorage', () => {
  it('should load data from storage', async () => {
    const { result } = renderHook(() =>
      useAsyncStorage({
        key: 'test',
        schema: z.string(),
        defaultValue: '',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Context Providers

When testing hooks that use context (like `useMachines`), wrap with a provider:

```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MachinesProvider machines={mockMachines}>{children}</MachinesProvider>
);

const { result } = renderHook(() => useFavorites(), { wrapper });
```

### Async Operations

Always use `waitFor` for async operations:

```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### Test Organization

Use `describe` blocks to group related tests:

```typescript
describe('useFavorites', () => {
  describe('addFavorite', () => {
    it('should add a machine to favorites', async () => {
      // test implementation
    });

    it('should not add duplicate favorites', async () => {
      // test implementation
    });
  });

  describe('removeFavorite', () => {
    it('should remove a machine from favorites', async () => {
      // test implementation
    });
  });
});
```

## Mocking

### AsyncStorage

AsyncStorage is automatically mocked in `jest.setup.js`. All methods return promises:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock stored data
(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

// Verify calls
expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(value));
```

### Expo Modules

Expo modules (camera, image picker, etc.) are mocked in `jest.setup.js`:

```typescript
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true, canAskAgain: true, status: 'granted' },
    jest.fn(),
  ]),
}));
```

### Services

Mock service functions using `jest.mock`:

```typescript
jest.mock('../../services/identifyMachine');

import * as identifyMachineService from '../../services/identifyMachine';

(identifyMachineService.identifyMachine as jest.Mock).mockResolvedValue(mockResult);
```

## Test Patterns

### Testing Loading States

```typescript
it('should set loading state during operation', async () => {
  // Delay mock response to capture loading state
  (mockFunction as jest.Mock).mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(result), 100))
  );

  const promise = result.current.performAction();

  await waitFor(() => {
    expect(result.current.isLoading).toBe(true);
  });

  await promise;

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const error = new Error('Test error');
  (mockFunction as jest.Mock).mockRejectedValue(error);

  await result.current.performAction();

  await waitFor(() => {
    expect(result.current.error).toBeTruthy();
  });
});
```

### Testing State Updates

```typescript
it('should update state correctly', async () => {
  await result.current.addItem('item-1');

  expect(result.current.items).toContain('item-1');
  expect(AsyncStorage.setItem).toHaveBeenCalled();
});
```

## Coverage

### Coverage Goals

- **Hooks**: Aim for 80%+ coverage
- **Services**: Aim for 70%+ coverage
- **Components**: Aim for 60%+ coverage (focus on critical paths)

### Viewing Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

### What to Test

**Priority 1 (Must Test):**
- Custom hooks (all business logic)
- Service functions
- Utility functions
- Critical user flows

**Priority 2 (Should Test):**
- Complex components
- State management logic
- Data transformations

**Priority 3 (Nice to Have):**
- Presentational components
- Simple UI elements

### What NOT to Test

- Third-party libraries
- Simple presentational components with no logic
- Type definitions
- Constants
- Style objects

## Best Practices

1. **Keep tests focused**: One concept per test
2. **Use descriptive names**: Test names should describe what they test
3. **Arrange-Act-Assert**: Structure tests clearly
4. **Clean up**: Use `beforeEach` to reset state
5. **Avoid implementation details**: Test behavior, not implementation
6. **Mock external dependencies**: Keep tests isolated
7. **Test edge cases**: Not just happy paths
8. **Keep tests maintainable**: Avoid test code duplication

## Common Patterns

### Setup and Teardown

```typescript
describe('MyHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  // tests...
});
```

### Testing with Multiple Mock Values

```typescript
(AsyncStorage.getItem as jest.Mock)
  .mockResolvedValueOnce(firstValue)
  .mockResolvedValueOnce(secondValue);
```

### Skipping/Focusing Tests

```typescript
it.skip('test to skip', () => {});
it.only('only run this test', () => {});
```

## Troubleshooting

### Tests Not Found

Make sure test files:
- Are in `__tests__` folders
- End with `.test.ts` or `.test.tsx`
- Match Jest's `testMatch` pattern in `jest.config.js`

### Mock Not Working

- Clear mocks in `beforeEach`
- Check mock is defined before test runs
- Verify import path matches mock path

### Async Timeout Errors

- Use `waitFor` for async operations
- Increase timeout if needed: `waitFor(() => {...}, { timeout: 5000 })`
- Check that promises are properly resolved/rejected

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: January 2025
