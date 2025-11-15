/**
 * Observability module exports for monitoring and performance tracking.
 */

// Monitoring (Sentry integration)
export {
  initMonitoring,
  isCrashReportingEnabled,
  reportError,
  setMonitoringUser,
  recordBreadcrumb,
} from './monitoring';

export type {
  MonitoringUserContext,
  MonitoringBreadcrumbCategory,
} from './monitoring';

// Performance tracking
export {
  initializePerformanceTracking,
  mark,
  measure,
  trackColdStart,
  markAppReady,
  trackNavigation,
  trackScreenRender,
  trackInteraction,
  getPerformanceMeasurements,
  getPerformanceSummary,
  clearPerformanceData,
  getIsAppReady,
} from './performance';
