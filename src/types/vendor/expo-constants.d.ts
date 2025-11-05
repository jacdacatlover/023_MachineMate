declare module 'expo-constants' {
  interface ExpoExtra {
    [key: string]: unknown;
  }

  interface ExpoConfig {
    extra?: ExpoExtra;
    [key: string]: unknown;
  }

  const Constants: {
    expoConfig?: ExpoConfig;
    manifest?: ExpoConfig;
    [key: string]: unknown;
  };

  export default Constants;
}
