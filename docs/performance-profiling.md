# Performance Profiling Guide

MachineMate includes comprehensive performance profiling utilities to track cold start, navigation, and screen render times.

## Overview

The performance profiling system tracks:
- **Cold Start Time**: From app initialization to first screen render
- **Time to Ready**: Total initialization time including data loading
- **Navigation Transitions**: Screen-to-screen navigation timing
- **Screen Render**: Individual screen component render times
- **User Interactions**: Response time for user actions

## Automatic Tracking

### Cold Start Tracking

Cold start tracking is **automatically enabled** in `App.tsx`:

```typescript
// Initialized when app loads
initializePerformanceTracking();

// Tracked when fonts and data finish loading
useEffect(() => {
  if (fontsLoaded && !isLoading) {
    trackColdStart();
    markAppReady();
  }
}, [fontsLoaded, isLoading]);
```

**Metrics Captured:**
- `cold_start`: Time from JS load to first screen render
- `time_to_ready`: Time from JS load to app fully initialized

**Performance Thresholds:**
- ⚠️ Warning if cold start >3 seconds
- ✅ Good performance <3 seconds

## Manual Tracking

### Navigation Tracking

Track navigation transitions between screens:

```typescript
import { trackNavigation } from '@shared/observability';

// In your navigation component or hook
const handleNavigate = (toScreen: string) => {
  const endTracking = trackNavigation('HomeScreen', toScreen);

  // Perform navigation
  navigation.navigate(toScreen);

  // When navigation completes (use navigation events)
  navigation.addListener('focus', () => {
    endTracking();
  });
};
```

**Example with React Navigation:**

```typescript
import { useNavigationContainerRef } from '@react-navigation/native';
import { trackNavigation } from '@shared/observability';

function App() {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = useState<string | null>(null);
  const endTrackingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = navigationRef?.addListener('state', () => {
      const route = navigationRef?.getCurrentRoute();
      if (route && route.name !== currentRoute) {
        // End previous tracking
        if (endTrackingRef.current) {
          endTrackingRef.current();
        }

        // Start new tracking
        if (currentRoute) {
          endTrackingRef.current = trackNavigation(currentRoute, route.name);
        }

        setCurrentRoute(route.name);
      }
    });

    return unsubscribe;
  }, [navigationRef, currentRoute]);

  return (
    <NavigationContainer ref={navigationRef}>
      {/* Your navigation */}
    </NavigationContainer>
  );
}
```

**Performance Thresholds:**
- ⚠️ Warning if navigation >500ms
- ✅ Good performance <500ms

### Screen Render Tracking

Track how long it takes for a screen to render:

```typescript
import { trackScreenRender } from '@shared/observability';
import { useEffect } from 'react';

function MachineDetailScreen() {
  useEffect(() => {
    const endTracking = trackScreenRender('MachineDetailScreen');

    // Cleanup when unmounting
    return () => {
      endTracking();
    };
  }, []);

  return (
    <View>
      {/* Screen content */}
    </View>
  );
}
```

**Performance Thresholds:**
- ⚠️ Warning if render >1 second
- ✅ Good performance <1 second

### User Interaction Tracking

Track response time for user actions:

```typescript
import { trackInteraction } from '@shared/observability';

function IdentifyButton() {
  const handleIdentify = async () => {
    const endTracking = trackInteraction('identify_machine');

    try {
      await identifyMachine(image);
    } finally {
      endTracking();
    }
  };

  return (
    <Button onPress={handleIdentify}>Identify Machine</Button>
  );
}
```

**Performance Thresholds:**
- ⚠️ Warning if interaction >300ms
- ✅ Good performance <300ms

## Custom Performance Marks

For fine-grained control, use performance marks and measurements:

```typescript
import { mark, measure } from '@shared/observability';

// Mark start of operation
mark('data_fetch_start');

// Perform operation
await fetchData();

// Mark end and measure
mark('data_fetch_end');
const duration = measure('data_fetch', 'data_fetch_start', 'data_fetch_end');

console.log(`Data fetch took ${duration}ms`);
```

## Viewing Performance Data

### In Development

Performance metrics are automatically logged to console:

```
[performance] Cold start tracked: 2,345ms
[performance] Navigation completed: HomeScreen -> MachineDetail (456ms)
[performance] Screen render completed: MachineDetailScreen (234ms)
```

### In Production

Performance data is:
1. **Logged with structured logging** - Searchable in Cloud Logging
2. **Sent as Sentry breadcrumbs** - Visible in error reports
3. **Available via API** - `getPerformanceSummary()`

### Export Performance Data

Get all performance measurements programmatically:

```typescript
import {
  getPerformanceSummary,
  getPerformanceMeasurements
} from '@shared/observability';

// Get summary
const summary = getPerformanceSummary();
console.log('Cold start:', summary.coldStartDuration);
console.log('Total marks:', summary.totalMarks);

// Get all measurements
const measurements = getPerformanceMeasurements();
measurements.forEach(m => {
  console.log(`${m.name}: ${m.duration}ms`);
});
```

## Integration with Monitoring

Performance metrics automatically integrate with the monitoring system:

### Cloud Logging

Performance logs include:
- `timestamp`: When the measurement occurred
- `duration`: Time in milliseconds
- `level`: info/warn based on thresholds
- `metadata`: Additional context (screen names, etc.)

Example query in Cloud Logging:
```
jsonPayload.logger="performance"
jsonPayload.event="cold_start"
```

### Sentry Breadcrumbs

Performance events are recorded as Sentry breadcrumbs:
- Category: `log`
- Level: `info` or `warning`
- Data: Includes duration and operation details

View in Sentry: Error details → Breadcrumbs → Filter by "Performance"

## Performance Optimization Tips

### Cold Start Optimization

1. **Minimize splash screen work** - Defer non-critical initialization
2. **Lazy load screens** - Use React.lazy() for unused screens
3. **Optimize font loading** - Use `useFonts` hook correctly
4. **Reduce bundle size** - Remove unused dependencies
5. **Enable Hermes** - Use Hermes JS engine for faster startup

### Navigation Optimization

1. **Preload data** - Fetch data before navigation
2. **Optimize state** - Minimize state updates during navigation
3. **Use memoization** - Prevent unnecessary re-renders
4. **Lazy load images** - Load images progressively
5. **Reduce animations** - Simplify transition animations

### Screen Render Optimization

1. **Use React.memo** - Memoize expensive components
2. **Virtualize lists** - Use FlatList for long lists
3. **Optimize images** - Use appropriate sizes and formats
4. **Avoid inline functions** - Extract callbacks to stable references
5. **Profile with Flipper** - Use React DevTools profiler

## Troubleshooting

### Performance data not appearing

1. **Check initialization**: Ensure `initializePerformanceTracking()` is called
2. **Verify environment**: Performance tracking disabled in tests
3. **Check logs**: Look for `[performance]` prefix in console

### Inaccurate measurements

1. **Mark timing**: Ensure marks are placed at correct locations
2. **Async operations**: Track async operations correctly
3. **Testing environment**: Disable tracking in tests with `NODE_ENV=test`

### High memory usage

1. **Clear old data**: Call `clearPerformanceData()` periodically
2. **Limit measurements**: Only track critical paths
3. **Review thresholds**: Adjust warning thresholds as needed

## API Reference

| Function | Description | Returns |
|----------|-------------|---------|
| `initializePerformanceTracking()` | Initialize performance tracking system | void |
| `mark(name)` | Create a performance mark | void |
| `measure(name, startMark, endMark?)` | Measure duration between marks | number \| null |
| `trackColdStart()` | Track cold start time | number \| null |
| `markAppReady()` | Mark app as fully ready | void |
| `trackNavigation(from, to)` | Track navigation transition | () => void |
| `trackScreenRender(screenName)` | Track screen render time | () => void |
| `trackInteraction(name)` | Track user interaction timing | () => void |
| `getPerformanceMeasurements()` | Get all measurements | PerformanceMeasurement[] |
| `getPerformanceSummary()` | Get performance summary | object |
| `clearPerformanceData()` | Clear all performance data | void |
| `getIsAppReady()` | Check if app is ready | boolean |

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Cold Start | <2s | >3s | >5s |
| Time to Ready | <3s | >5s | >8s |
| Navigation | <300ms | >500ms | >1s |
| Screen Render | <500ms | >1s | >2s |
| Interaction | <100ms | >300ms | >500ms |

## Examples

See working examples in:
- `App.tsx`: Cold start tracking
- `docs/performance-profiling.md`: This file
- `src/shared/observability/performance.ts`: Implementation

## Next Steps

1. Review cold start metrics after deployment
2. Add navigation tracking to main navigation flows
3. Track render times for critical screens
4. Set up alerts for performance degradation in Cloud Monitoring
5. Optimize based on real-world performance data
