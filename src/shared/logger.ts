/* eslint-disable no-console */

import Constants from 'expo-constants';

import {
  isCrashReportingEnabled,
  recordBreadcrumb,
  type MonitoringBreadcrumbCategory,
} from '@shared/observability/monitoring';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;
type InternalLogContext = LogContext & { extra?: unknown[] };

type LogMethod = (...args: unknown[]) => void;

const LOG_LEVEL_TO_BREADCRUMB_LEVEL = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
} as const;

const BREADCRUMB_NAMESPACE_MAP: Array<{
  test: RegExp;
  category: MonitoringBreadcrumbCategory;
}> = [
  { test: /^auth\./i, category: 'auth' },
  { test: /recognition/i, category: 'recognition' },
  { test: /(upload|media)/i, category: 'uploads' },
];

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const EXTRA = (Constants?.expoConfig?.extra ??
  {}) as Partial<{ logLevel: LogLevel }>;

function resolveLogLevel(): LogLevel {
  const envLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel | undefined;
  if (envLevel && LEVEL_PRIORITY[envLevel]) {
    return envLevel;
  }

  if (EXTRA?.logLevel && LEVEL_PRIORITY[EXTRA.logLevel]) {
    return EXTRA.logLevel;
  }

  return __DEV__ ? 'debug' : 'info';
}

const MIN_LEVEL = resolveLogLevel();

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

function normalizeArgs(args: unknown[]): {
  message: string;
  metadata?: LogContext;
} {
  if (args.length === 0) {
    return { message: '' };
  }

  const [first, ...rest] = args;
  const metadata: InternalLogContext = {};
  let message: string;

  if (typeof first === 'string') {
    message = first;
  } else if (first instanceof Error) {
    message = first.message;
    metadata.error = serializeError(first);
  } else {
    message = JSON.stringify(first);
  }

  const appendToMetadata = (value: unknown) => {
    if (value instanceof Error) {
      metadata.error = serializeError(value);
      return;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(metadata, value as LogContext);
      return;
    }

    if (value !== undefined) {
      (metadata.extra ??= [] as unknown[]).push(value);
    }
  };

  rest.forEach(appendToMetadata);

  return {
    message,
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

function emitLog(
  level: LogLevel,
  namespace: string,
  args: unknown[]
): void {
  // Wrap everything in try-catch for maximum safety
  try {
    if (!shouldLog(level)) {
      return;
    }

    // Early safety check: ensure console is available
    if (typeof console === 'undefined' || !console || typeof console !== 'object') {
      return;
    }

    // Check if console.log exists as a baseline
    if (typeof console.log !== 'function') {
      return;
    }

    const { message, metadata } = normalizeArgs(args);
    const timestamp = new Date().toISOString();
    const payload = metadata
      ? { ...metadata, level, timestamp }
      : { level, timestamp };

    const prefix = `[${namespace}]`;

    // Safely get console method with multiple fallbacks
    let consoleMethod = console.log; // Default fallback

    if (level === 'debug' && typeof console.debug === 'function') {
      consoleMethod = console.debug;
    } else if (level === 'info' && typeof console.log === 'function') {
      consoleMethod = console.log;
    } else if (level === 'warn' && typeof console.warn === 'function') {
      consoleMethod = console.warn;
    } else if (level === 'error' && typeof console.error === 'function') {
      consoleMethod = console.error;
    }

    // Final safety check before calling
    if (consoleMethod && typeof consoleMethod === 'function') {
      consoleMethod(prefix, message, payload);
    }

    // Forward to monitoring (skip in test environments)
    if (process.env.NODE_ENV !== 'test') {
      try {
        forwardToMonitoring(level, namespace, message, metadata);
      } catch {
        // Silently ignore monitoring errors
      }
    }
  } catch (err) {
    // Silently fail - we're in the logger, can't log this!
    // Do absolutely nothing to avoid any potential errors
  }
}

function forwardToMonitoring(
  level: LogLevel,
  namespace: string,
  message: string,
  metadata?: LogContext
): void {
  if (!shouldRecordBreadcrumb(level)) {
    return;
  }

  const breadcrumbData: Record<string, unknown> = {
    namespace,
    level,
  };

  if (metadata) {
    Object.assign(breadcrumbData, metadata);
  }

  recordBreadcrumb({
    category: resolveBreadcrumbCategory(namespace),
    message,
    data: breadcrumbData,
    level: LOG_LEVEL_TO_BREADCRUMB_LEVEL[level],
  });
}

function resolveBreadcrumbCategory(namespace: string): MonitoringBreadcrumbCategory {
  const match = BREADCRUMB_NAMESPACE_MAP.find(entry => entry.test.test(namespace));
  return match ? match.category : 'log';
}

function shouldRecordBreadcrumb(level: LogLevel): boolean {
  if (!isCrashReportingEnabled()) {
    return false;
  }

  if (__DEV__ && level === 'debug') {
    return false;
  }

  return true;
}

export type Logger = {
  info: LogMethod;
  debug: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  trackPerformance: <T>(
    operation: string,
    fn: () => Promise<T> | T,
    metadata?: LogContext
  ) => Promise<T>;
};

export function createLogger(namespace: string): Logger {
  // No-op functions for safety - only log if console is definitely available
  const safeEmit = (level: LogLevel, args: unknown[]) => {
    try {
      if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
        emitLog(level, namespace, args);
      }
    } catch {
      // Silently ignore
    }
  };

  const info: LogMethod = (...args) => safeEmit('info', args);
  const debug: LogMethod = (...args) => safeEmit('debug', args);
  const warn: LogMethod = (...args) => safeEmit('warn', args);
  const error: LogMethod = (...args) => safeEmit('error', args);

  const trackPerformance: Logger['trackPerformance'] = async (
    operation,
    fn,
    metadata
  ) => {
    const start = Date.now();
    try {
      const result = await fn();
      emitLog('info', namespace, [
        `${operation} completed`,
        {
          ...metadata,
          durationMs: Date.now() - start,
          operation,
          outcome: 'success',
        },
      ]);
      return result;
    } catch (err) {
      emitLog('error', namespace, [
        `${operation} failed`,
        {
          ...metadata,
          durationMs: Date.now() - start,
          operation,
          outcome: 'error',
          error: serializeError(err),
        },
      ]);
      throw err;
    }
  };

  return { info, debug, warn, error, trackPerformance };
}
