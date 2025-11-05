// Type definitions for React Navigation

import { NavigatorScreenParams } from '@react-navigation/native';
import { IdentificationResult } from './identification';

// Root tab navigator params
export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  LibraryTab: NavigatorScreenParams<LibraryStackParamList>;
  SettingsTab: undefined;
};

// Home stack params
export type HomeStackParamList = {
  Home: undefined;
  Camera: undefined;
  MachineResult: {
    photoUri?: string;
    result: IdentificationResult;
  };
};

// Library stack params
export type LibraryStackParamList = {
  Library: undefined;
  MachineDetail: {
    machineId: string;
  };
};
