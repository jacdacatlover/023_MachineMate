/* eslint-disable @typescript-eslint/no-unused-vars */

declare const process: {
  env: {
    APP_ENV?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
    EXPO_PUBLIC_SENTRY_DSN?: string;
    SENTRY_DSN?: string;
    SENTRY_DSN_DEV?: string;
    SENTRY_DSN_PREVIEW?: string;
    SENTRY_DSN_PROD?: string;
    [key: string]: string | undefined;
  };
};

export {};
