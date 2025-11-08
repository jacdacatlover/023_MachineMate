/* eslint-disable no-console */

import Constants from 'expo-constants';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;
type InternalLogContext = LogContext & { extra?: unknown[] };

type LogMethod = (...args: unknown[]) => void;

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
  if (!shouldLog(level)) {
    return;
  }

  const { message, metadata } = normalizeArgs(args);
  const timestamp = new Date().toISOString();
  const payload = metadata
    ? { ...metadata, level, timestamp }
    : { level, timestamp };

  const prefix = `[${namespace}]`;
  const consoleMethod =
    level === 'debug'
      ? console.debug ?? console.log
      : level === 'info'
        ? console.log
        : level === 'warn'
          ? console.warn
          : console.error;

  if (metadata) {
    consoleMethod(prefix, message, payload);
  } else {
    consoleMethod(prefix, message, payload);
  }
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
  const info: LogMethod = (...args) => emitLog('info', namespace, args);
  const debug: LogMethod = (...args) => emitLog('debug', namespace, args);
  const warn: LogMethod = (...args) => emitLog('warn', namespace, args);
  const error: LogMethod = (...args) => emitLog('error', namespace, args);

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
