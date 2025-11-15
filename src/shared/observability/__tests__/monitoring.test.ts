/**
 * Tests for Monitoring/Observability Service
 */

import Constants from 'expo-constants';
import {
  initMonitoring,
  reportError,
  setMonitoringUser,
  recordBreadcrumb,
  recordRecognitionBreadcrumb,
  recordAuthBreadcrumb,
  recordUploadBreadcrumb,
  isCrashReportingEnabled,
  resetMonitoringForTests,
} from '../monitoring';
import * as Sentry from 'sentry-expo';

// Mock sentry-expo
jest.mock('sentry-expo');

describe('monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    // Ensure expoConfig and extra are defined for tests
    if (!Constants.expoConfig) {
      Constants.expoConfig = {};
    }
    if (!Constants.expoConfig.extra) {
      Constants.expoConfig.extra = {};
    }
    Constants.expoConfig.extra.enableCrashReporting = true;
    resetMonitoringForTests();
  });

  describe('initMonitoring', () => {
    it('should initialize Sentry when DSN is provided', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';

      initMonitoring();

      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/123',
          enableInExpoDevelopment: true,
        })
      );
    });

    it('should not initialize twice', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';

      initMonitoring();
      initMonitoring();

      // Should only be called once from the first init
      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });

    it('should set crash reporting enabled when DSN is present', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';

      initMonitoring();

      expect(isCrashReportingEnabled()).toBe(true);
    });
  });

  describe('reportError', () => {
    it('should report error to Sentry when enabled', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      const error = new Error('Test error');
      reportError(error);

      expect(Sentry.Native.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });

    it('should include context in error report', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      const error = new Error('Test error');
      const context = {
        componentStack: 'Component stack trace',
        extras: { userId: '123' },
      };

      reportError(error, context);

      expect(Sentry.Native.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: context.extras,
        })
      );
    });
  });

  describe('setMonitoringUser', () => {
    it('should set user context in Sentry', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      const user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'admin',
      };

      setMonitoringUser(user);

      expect(Sentry.Native.configureScope).toHaveBeenCalled();
    });

    it('should clear user context when passed null', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      setMonitoringUser(null);

      expect(Sentry.Native.configureScope).toHaveBeenCalled();
    });
  });

  describe('recordBreadcrumb', () => {
    it('should record breadcrumb to Sentry', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      recordBreadcrumb({
        category: 'log',
        message: 'Test breadcrumb',
        data: { key: 'value' },
      });

      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
        category: 'log',
        message: 'Test breadcrumb',
        data: { key: 'value' },
        level: 'info',
      });
    });

    it('should use custom level when provided', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      recordBreadcrumb({
        category: 'log',
        message: 'Error breadcrumb',
        level: 'error',
      });

      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
        })
      );
    });
  });

  describe('category-specific breadcrumb helpers', () => {
    beforeEach(() => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();
    });

    it('should record recognition breadcrumb', () => {
      recordRecognitionBreadcrumb('Image captured', { imageSize: 1024 });

      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'recognition',
          message: 'Image captured',
        })
      );
    });

    it('should record auth breadcrumb', () => {
      recordAuthBreadcrumb('User logged in', { userId: '123' });

      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'auth',
          message: 'User logged in',
        })
      );
    });

    it('should record upload breadcrumb', () => {
      recordUploadBreadcrumb('Image uploaded', { fileSize: 2048 });

      expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'uploads',
          message: 'Image uploaded',
        })
      );
    });
  });

  describe('isCrashReportingEnabled', () => {
    it('should return false before initialization', () => {
      expect(isCrashReportingEnabled()).toBe(false);
    });

    it('should return true after initialization with DSN', () => {
      process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
      initMonitoring();

      expect(isCrashReportingEnabled()).toBe(true);
    });

    it('should return false when DSN is not provided', () => {
      delete process.env.EXPO_PUBLIC_SENTRY_DSN;
      initMonitoring();

      expect(isCrashReportingEnabled()).toBe(false);
    });
  });
});
