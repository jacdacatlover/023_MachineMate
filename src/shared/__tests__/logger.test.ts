/**
 * Tests for Logger Service
 */

import { createLogger } from '../logger';

// Mock the monitoring module
jest.mock('../observability/monitoring', () => ({
  isCrashReportingEnabled: jest.fn(() => false),
  recordBreadcrumb: jest.fn(),
}));

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create a logger with namespace', () => {
      const logger = createLogger('test.namespace');

      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('trackPerformance');
    });

    it('should log info messages', () => {
      const logger = createLogger('test');

      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[0]).toBe('[test]');
      expect(callArgs[1]).toBe('Test message');
    });

    it('should log error messages', () => {
      const logger = createLogger('test');

      logger.error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[0]).toBe('[test]');
      expect(callArgs[1]).toBe('Error message');
    });

    it('should log warn messages', () => {
      const logger = createLogger('test');

      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalled();
      const callArgs = consoleWarnSpy.mock.calls[0];
      expect(callArgs[0]).toBe('[test]');
      expect(callArgs[1]).toBe('Warning message');
    });

    it('should handle errors as first argument', () => {
      const logger = createLogger('test');
      const error = new Error('Test error');

      logger.error(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[0]).toBe('[test]');
      expect(callArgs[1]).toBe('Test error');
    });

    it('should include metadata in logs', () => {
      const logger = createLogger('test');

      logger.info('Message with metadata', { userId: '123', action: 'click' });

      expect(consoleLogSpy).toHaveBeenCalled();
      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        userId: '123',
        action: 'click',
        level: 'info',
      });
    });
  });

  describe('trackPerformance', () => {
    it('should track successful operation', async () => {
      const logger = createLogger('test');
      const operation = jest.fn().mockResolvedValue('result');

      const result = await logger.trackPerformance('test-operation', operation);

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();

      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[1]).toContain('completed');
      expect(callArgs[2]).toMatchObject({
        operation: 'test-operation',
        outcome: 'success',
      });
    });

    it('should track failed operation', async () => {
      const logger = createLogger('test');
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(logger.trackPerformance('test-operation', operation)).rejects.toThrow(
        'Operation failed'
      );

      expect(operation).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      const callArgs = consoleErrorSpy.mock.calls[0];
      expect(callArgs[1]).toContain('failed');
      expect(callArgs[2]).toMatchObject({
        operation: 'test-operation',
        outcome: 'error',
      });
    });

    it('should include metadata in performance tracking', async () => {
      const logger = createLogger('test');
      const operation = jest.fn().mockResolvedValue('result');

      await logger.trackPerformance('test-operation', operation, { extra: 'metadata' });

      const callArgs = consoleLogSpy.mock.calls[0];
      expect(callArgs[2]).toMatchObject({
        extra: 'metadata',
        operation: 'test-operation',
      });
    });
  });
});
