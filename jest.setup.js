// Jest setup file for React Native Testing Library
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

// Mock Expo modules
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [
    { granted: true, canAskAgain: true, status: 'granted' },
    jest.fn(),
  ]),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  useMediaLibraryPermissions: jest.fn(() => [
    { granted: true, canAskAgain: true, status: 'granted' },
    jest.fn(),
  ]),
  MediaType: { Images: 'images' },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(async uri => ({
    uri,
    width: 1000,
    height: 1000,
    base64: null,
  })),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'https://mock.api',
      apiBaseUrl: 'https://mock.api',
      logLevel: 'debug',
      environment: 'test',
      enableCrashReporting: false,
      sentryDsn: '',
    },
  },
  manifest: {},
  platform: { ios: {}, android: {} },
}));

process.env.EXPO_PUBLIC_LOG_LEVEL = 'debug';

// Mock react-native-body-highlighter
jest.mock('react-native-body-highlighter', () => 'Body');

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
