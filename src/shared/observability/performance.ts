/**
 * Performance profiling utilities for tracking cold start and navigation metrics.
 *
 * Tracks:
 * - App cold start time (from JS load to first screen render)
 * - Navigation transition times
 * - Screen render times
 * - User interaction timing
 */

import { createLogger } from '../logger';
import { recordBreadcrumb } from './monitoring';

const logger = createLogger('performance');

// Performance marks and measurements
type PerformanceMark = {
  name: string;
  timestamp: number;
};

type PerformanceMeasurement = {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
};

// Store for performance marks
const marks = new Map<string, PerformanceMark>();
const measurements: PerformanceMeasurement[] = [];

// App lifecycle tracking
let appStartTime: number | null = null;
let firstScreenRenderTime: number | null = null;
let isAppReady = false;

/**
 * Initialize performance tracking when the app starts.
 * Call this at the earliest possible point in your app's lifecycle.
 */
export const initializePerformanceTracking = (): void => {
  appStartTime = Date.now();
  mark('app_start');

  logger.info('Performance tracking initialized', {
    startTime: appStartTime,
  });
};

/**
 * Create a performance mark at the current time.
 *
 * @param markName - Unique identifier for the mark
 */
export const mark = (markName: string): void => {
  const timestamp = Date.now();
  marks.set(markName, { name: markName, timestamp });

  logger.debug('Performance mark created', {
    mark: markName,
    timestamp,
  });
};

/**
 * Measure the duration between two marks.
 *
 * @param measurementName - Name for the measurement
 * @param startMark - Starting mark name
 * @param endMark - Ending mark name (defaults to now)
 * @returns The duration in milliseconds, or null if marks not found
 */
export const measure = (
  measurementName: string,
  startMark: string,
  endMark?: string
): number | null => {
  const start = marks.get(startMark);
  if (!start) {
    logger.warn('Start mark not found for measurement', {
      measurement: measurementName,
      startMark,
    });
    return null;
  }

  const endTime = endMark ? marks.get(endMark)?.timestamp : Date.now();
  if (!endTime) {
    logger.warn('End mark not found for measurement', {
      measurement: measurementName,
      endMark,
    });
    return null;
  }

  const duration = endTime - start.timestamp;
  const measurement: PerformanceMeasurement = {
    name: measurementName,
    duration,
    startTime: start.timestamp,
    endTime,
  };

  measurements.push(measurement);

  logger.info('Performance measurement recorded', {
    measurement: measurementName,
    duration,
    durationMs: `${duration}ms`,
  });

  // Record as breadcrumb for monitoring
  recordBreadcrumb({
    category: 'log',
    message: `Performance: ${measurementName}`,
    data: {
      duration,
      startMark,
      endMark: endMark || 'now',
    },
    level: 'info',
  });

  return duration;
};

/**
 * Track cold start performance - call when first screen is ready.
 *
 * @returns Cold start duration in ms, or null if not tracked
 */
export const trackColdStart = (): number | null => {
  if (!appStartTime) {
    logger.warn('App start time not initialized');
    return null;
  }

  firstScreenRenderTime = Date.now();
  const coldStartDuration = firstScreenRenderTime - appStartTime;

  mark('first_screen_render');
  measure('cold_start', 'app_start', 'first_screen_render');

  logger.info('Cold start tracked', {
    duration: coldStartDuration,
    durationMs: `${coldStartDuration}ms`,
    appStartTime,
    firstScreenRenderTime,
  });

  // Warn if cold start is slow
  if (coldStartDuration > 3000) {
    logger.warn('Slow cold start detected', {
      duration: coldStartDuration,
      threshold: 3000,
    });
  }

  return coldStartDuration;
};

/**
 * Mark the app as fully ready (all initialization complete).
 */
export const markAppReady = (): void => {
  if (!appStartTime) {
    logger.warn('App start time not initialized');
    return;
  }

  mark('app_ready');
  const timeToReady = measure('time_to_ready', 'app_start', 'app_ready');

  isAppReady = true;

  logger.info('App ready', {
    timeToReady,
    timeToReadyMs: timeToReady ? `${timeToReady}ms` : 'unknown',
  });
};

/**
 * Track navigation transition performance.
 * Call this when starting a navigation action.
 *
 * @param fromScreen - Screen name being navigated from
 * @param toScreen - Screen name being navigated to
 * @returns A function to call when navigation completes
 */
export const trackNavigation = (
  fromScreen: string,
  toScreen: string
): (() => void) => {
  const navigationId = `nav_${fromScreen}_to_${toScreen}_${Date.now()}`;
  mark(`${navigationId}_start`);

  logger.debug('Navigation started', {
    from: fromScreen,
    to: toScreen,
    navigationId,
  });

  return () => {
    mark(`${navigationId}_end`);
    const duration = measure(
      `navigation_${fromScreen}_to_${toScreen}`,
      `${navigationId}_start`,
      `${navigationId}_end`
    );

    logger.info('Navigation completed', {
      from: fromScreen,
      to: toScreen,
      duration,
      durationMs: duration ? `${duration}ms` : 'unknown',
    });

    // Warn if navigation is slow
    if (duration && duration > 500) {
      logger.warn('Slow navigation detected', {
        from: fromScreen,
        to: toScreen,
        duration,
        threshold: 500,
      });
    }
  };
};

/**
 * Track screen render performance.
 * Call this when a screen component mounts.
 *
 * @param screenName - Name of the screen being rendered
 * @returns A function to call when render is complete
 */
export const trackScreenRender = (
  screenName: string
): (() => void) => {
  const renderId = `render_${screenName}_${Date.now()}`;
  mark(`${renderId}_start`);

  logger.debug('Screen render started', {
    screen: screenName,
    renderId,
  });

  return () => {
    mark(`${renderId}_end`);
    const duration = measure(
      `screen_render_${screenName}`,
      `${renderId}_start`,
      `${renderId}_end`
    );

    logger.info('Screen render completed', {
      screen: screenName,
      duration,
      durationMs: duration ? `${duration}ms` : 'unknown',
    });

    // Warn if render is slow
    if (duration && duration > 1000) {
      logger.warn('Slow screen render detected', {
        screen: screenName,
        duration,
        threshold: 1000,
      });
    }
  };
};

/**
 * Track user interaction timing (e.g., button press to response).
 *
 * @param interactionName - Name of the interaction
 * @returns A function to call when interaction completes
 */
export const trackInteraction = (
  interactionName: string
): (() => void) => {
  const interactionId = `interaction_${interactionName}_${Date.now()}`;
  mark(`${interactionId}_start`);

  logger.debug('Interaction started', {
    interaction: interactionName,
    interactionId,
  });

  return () => {
    mark(`${interactionId}_end`);
    const duration = measure(
      `interaction_${interactionName}`,
      `${interactionId}_start`,
      `${interactionId}_end`
    );

    logger.info('Interaction completed', {
      interaction: interactionName,
      duration,
      durationMs: duration ? `${duration}ms` : 'unknown',
    });

    // Warn if interaction response is slow
    if (duration && duration > 300) {
      logger.warn('Slow interaction response', {
        interaction: interactionName,
        duration,
        threshold: 300,
      });
    }
  };
};

/**
 * Get all recorded performance measurements.
 * Useful for debugging or exporting metrics.
 *
 * @returns Array of all measurements
 */
export const getPerformanceMeasurements = (): PerformanceMeasurement[] => {
  return [...measurements];
};

/**
 * Get performance summary statistics.
 */
export const getPerformanceSummary = () => {
  const summary = {
    appStartTime,
    firstScreenRenderTime,
    isAppReady,
    coldStartDuration: firstScreenRenderTime && appStartTime
      ? firstScreenRenderTime - appStartTime
      : null,
    totalMarks: marks.size,
    totalMeasurements: measurements.length,
    measurements: measurements.map(m => ({
      name: m.name,
      duration: m.duration,
    })),
  };

  logger.debug('Performance summary', summary);
  return summary;
};

/**
 * Clear all performance marks and measurements.
 * Useful for testing or resetting state.
 */
export const clearPerformanceData = (): void => {
  marks.clear();
  measurements.length = 0;

  logger.info('Performance data cleared');
};

/**
 * Check if app is ready (fully initialized).
 */
export const getIsAppReady = (): boolean => {
  return isAppReady;
};
