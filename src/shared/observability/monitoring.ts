import Constants from 'expo-constants';
import * as Sentry from 'sentry-expo';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type ExtraConfig = Partial<{
  environment: string;
  enableCrashReporting: boolean;
  logLevel: LogLevel;
  sentryDsn: string;
}>;

let initialized = false;
let crashReportingEnabled = false;

const getExtra = (): ExtraConfig =>
  ((Constants?.expoConfig?.extra as ExtraConfig | undefined) ??
    {}) as ExtraConfig;

export function initMonitoring(): void {
  if (initialized) {
    return;
  }

  const extra = getExtra();
  const dsn =
    extra?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_DSN;

  crashReportingEnabled = Boolean(dsn) && (extra.enableCrashReporting ?? true);

  if (crashReportingEnabled && dsn) {
    Sentry.init({
      dsn,
      enableInExpoDevelopment: true,
      debug: extra.logLevel === 'debug',
      environment:
        extra.environment ||
        process.env.APP_ENV ||
        (__DEV__ ? 'development' : 'production'),
      tracesSampleRate: extra.environment === 'production' ? 0.2 : 0.5,
      enableNative: true,
    });
  }

  initialized = true;
}

export function reportError(
  error: Error,
  context?: {
    componentStack?: string;
    extras?: Record<string, unknown>;
  }
): void {
  if (!initialized || !crashReportingEnabled) {
    return;
  }

  Sentry.Native.captureException(error, {
    contexts: context?.componentStack
      ? { react: { componentStack: context.componentStack } }
      : undefined,
    extra: context?.extras,
  });
}

export function withMonitoringScope(
  callback: Parameters<typeof Sentry.Native.configureScope>[0]
): void {
  if (!initialized || !crashReportingEnabled) {
    return;
  }

  Sentry.Native.configureScope(callback);
}

export function isCrashReportingEnabled(): boolean {
  return crashReportingEnabled;
}
