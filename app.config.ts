import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Environment-aware Expo configuration
 *
 * Supports three environments:
 * - development: Local development
 * - preview: Staging/preview builds
 * - production: Production app store builds
 *
 * Usage:
 * - Set APP_ENV environment variable
 * - Or use EAS build profiles (eas.json)
 */

type AppEnvironment = 'development' | 'preview' | 'production';

interface EnvironmentConfig {
  apiUrl: string;
  apiTimeout: number;
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  sentryDsn?: string;
}

const ENV_CONFIG: Record<AppEnvironment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    apiTimeout: 10000,
    enableAnalytics: false,
    enableCrashReporting: false,
    logLevel: 'debug',
    sentryDsn: process.env.SENTRY_DSN_DEV,
  },
  preview: {
    apiUrl: 'https://preview-api.machinemate.com/api',
    apiTimeout: 8000,
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'info',
    sentryDsn: process.env.SENTRY_DSN_PREVIEW ?? process.env.SENTRY_DSN,
  },
  production: {
    apiUrl: 'https://api.machinemate.com/api',
    apiTimeout: 8000,
    enableAnalytics: true,
    enableCrashReporting: true,
    logLevel: 'warn',
    sentryDsn: process.env.SENTRY_DSN ?? process.env.SENTRY_DSN_PROD,
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = (process.env.APP_ENV || 'development') as AppEnvironment;
  const envConfig = ENV_CONFIG[environment];

  const isDev = environment === 'development';
  const isPreview = environment === 'preview';

  return {
    ...config,
    name: isDev ? 'MachineMate (Dev)' : isPreview ? 'MachineMate (Preview)' : 'MachineMate',
    slug: 'MachineMate',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: isDev
        ? 'com.machinemate.app.dev'
        : isPreview
          ? 'com.machinemate.app.preview'
          : 'com.machinemate.app',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription:
          'MachineMate needs camera access to identify gym machines and provide you with usage instructions.',
        NSPhotoLibraryUsageDescription:
          'MachineMate needs access to your photo library to identify gym machines from existing photos.',
        NSPhotoLibraryAddUsageDescription:
          'MachineMate needs permission to save identified machine photos to your library.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: isDev
        ? 'com.machinemate.app.dev'
        : isPreview
          ? 'com.machinemate.app.preview'
          : 'com.machinemate.app',
      versionCode: 1,
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission: 'Allow MachineMate to access your camera to identify gym machines.',
          microphonePermission: false,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow MachineMate to access your photos to identify gym machines.',
        },
      ],
      [
        'sentry-expo',
        {
          organization: process.env.SENTRY_ORG || 'machinemate',
          project: process.env.SENTRY_PROJECT || 'machinemate-app',
          deployEnv: environment,
          setCommits: false,
        },
      ],
    ],
    extra: {
      ...envConfig,
      environment,
      sentryDsn:
        envConfig.sentryDsn ||
        process.env.EXPO_PUBLIC_SENTRY_DSN ||
        process.env.SENTRY_DSN ||
        '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID || 'your-project-id-here',
      },
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID || 'your-project-id-here'}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  };
};
