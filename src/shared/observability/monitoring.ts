import Constants from 'expo-constants';
import * as Sentry from 'sentry-expo';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type ExtraConfig = Partial<{
  environment: string;
  enableCrashReporting: boolean;
  logLevel: LogLevel;
  sentryDsn: string;
  cloudRunRelease: string;
}>;

export type MonitoringUserContext = {
  id?: string;
  email?: string;
  role?: string;
  metadata?: Record<string, unknown>;
};

type NativeBreadcrumb = Parameters<typeof Sentry.Native.addBreadcrumb>[0];
type BreadcrumbLevel = NativeBreadcrumb['level'];

export type MonitoringBreadcrumbCategory =
  | 'log'
  | 'auth'
  | 'recognition'
  | 'uploads';

type BreadcrumbPayload = {
  category: MonitoringBreadcrumbCategory;
  message: string;
  data?: Record<string, unknown>;
  level?: BreadcrumbLevel;
};

type ScopeArg = Parameters<typeof Sentry.Native.configureScope>[0] extends (
  scope: infer T
) => void
  ? T
  : never;

let initialized = false;
let crashReportingEnabled = false;
let userContext: MonitoringUserContext | null = null;
let cachedEnvironment: string | undefined;
let cachedCloudRunRelease: string | undefined;
let cachedAppVersion: string | undefined;
let cachedRuntimeVersion: string | undefined;

const getExtra = (): ExtraConfig =>
  ((Constants?.expoConfig?.extra as ExtraConfig | undefined) ?? {}) as ExtraConfig;

const resolveEnvironment = (extra: ExtraConfig): string =>
  extra.environment ||
  (Constants?.expoConfig?.extra?.environment as string | undefined) ||
  process.env.APP_ENV ||
  (__DEV__ ? 'development' : 'production');

const resolveCloudRunRelease = (extra: ExtraConfig): string | undefined =>
  extra.cloudRunRelease ||
  process.env.EXPO_PUBLIC_CLOUD_RUN_RELEASE ||
  process.env.CLOUD_RUN_RELEASE ||
  undefined;

const resolveRuntimeVersion = (): string | undefined => {
  const runtime = Constants?.expoConfig?.runtimeVersion;

  if (!runtime) {
    return undefined;
  }

  if (typeof runtime === 'string') {
    return runtime;
  }

  if (typeof runtime === 'object' && runtime !== null && 'value' in runtime && typeof runtime.value === 'string') {
    return runtime.value;
  }

  if (typeof runtime === 'object' && runtime !== null && 'policy' in runtime && typeof runtime.policy === 'string') {
    return runtime.policy;
  }

  return undefined;
};

const resolveAppVersion = (): string | undefined => {
  const version = Constants?.expoConfig?.version;
  return typeof version === 'string' ? version : undefined;
};

const applyStaticScopeMetadata = (scope: ScopeArg): void => {
  if (cachedEnvironment) {
    scope.setTag('app.environment', cachedEnvironment);
  }

  if (cachedAppVersion) {
    scope.setTag('app.version', cachedAppVersion);
  }

  if (cachedRuntimeVersion) {
    scope.setTag('expo.runtimeVersion', cachedRuntimeVersion);
  }

  if (cachedCloudRunRelease) {
    scope.setTag('cloud_run_release', cachedCloudRunRelease);
  }
};

const applyUserContext = (scope: ScopeArg, context: MonitoringUserContext | null): void => {
  if (!context) {
    scope.setUser(null);
    scope.setTag('supabase.user_id', 'anonymous');
    scope.setTag('user.role', 'unset');
    scope.setContext('user_metadata', null);
    return;
  }

  const normalizedUser: Record<string, string> = {};
  if (context.id) {
    normalizedUser.id = context.id;
  }
  if (context.email) {
    normalizedUser.email = context.email;
  }

  if (Object.keys(normalizedUser).length) {
    scope.setUser(normalizedUser);
  } else {
    scope.setUser(null);
  }

  scope.setTag('supabase.user_id', context.id ?? 'anonymous');
  scope.setTag('user.role', context.role ?? 'unset');

  if (context.metadata && Object.keys(context.metadata).length) {
    scope.setContext('user_metadata', context.metadata);
  } else {
    scope.setContext('user_metadata', null);
  }
};

const configureScope = (): void => {
  if (!initialized || !crashReportingEnabled) {
    return;
  }

  Sentry.Native.configureScope(scope => {
    applyStaticScopeMetadata(scope);
    applyUserContext(scope, userContext);
  });
};

export function initMonitoring(): void {
  if (initialized) {
    return;
  }

  const extra = getExtra();
  const dsn = extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  cachedEnvironment = resolveEnvironment(extra);
  cachedCloudRunRelease = resolveCloudRunRelease(extra);
  cachedAppVersion = resolveAppVersion();
  cachedRuntimeVersion = resolveRuntimeVersion();

  crashReportingEnabled = Boolean(dsn) && (extra.enableCrashReporting ?? true);

  if (crashReportingEnabled && dsn) {
    Sentry.init({
      dsn,
      enableInExpoDevelopment: true,
      debug: extra.logLevel === 'debug',
      environment: cachedEnvironment,
      release: cachedAppVersion ?? undefined,
      dist: cachedRuntimeVersion ?? undefined,
      tracesSampleRate: cachedEnvironment === 'production' ? 0.2 : 0.5,
      enableNative: true,
    });

    configureScope();
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

export function setMonitoringUser(user: MonitoringUserContext | null): void {
  userContext = user;

  if (!initialized || !crashReportingEnabled) {
    return;
  }

  configureScope();
}

export function resetMonitoringForTests(): void {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  initialized = false;
  crashReportingEnabled = false;
  userContext = null;
  cachedEnvironment = undefined;
  cachedCloudRunRelease = undefined;
  cachedAppVersion = undefined;
  cachedRuntimeVersion = undefined;
}

export function recordBreadcrumb(payload: BreadcrumbPayload): void {
  if (!initialized || !crashReportingEnabled) {
    return;
  }

  Sentry.Native.addBreadcrumb({
    category: payload.category,
    message: payload.message,
    data: payload.data,
    level: payload.level ?? 'info',
  });
}

export function recordRecognitionBreadcrumb(
  message: string,
  data?: Record<string, unknown>
): void {
  recordBreadcrumb({
    category: 'recognition',
    message,
    data,
  });
}

export function recordAuthBreadcrumb(message: string, data?: Record<string, unknown>): void {
  recordBreadcrumb({
    category: 'auth',
    message,
    data,
  });
}

export function recordUploadBreadcrumb(message: string, data?: Record<string, unknown>): void {
  recordBreadcrumb({
    category: 'uploads',
    message,
    data,
  });
}

export function isCrashReportingEnabled(): boolean {
  return crashReportingEnabled;
}
