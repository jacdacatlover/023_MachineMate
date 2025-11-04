# Gemini Project Context: MachineMate

## Project Overview

This is a React Native mobile application built with Expo and TypeScript. The app, named MachineMate, is designed to be a mobile guide for gym beginners, helping them learn how to use gym machines safely and correctly.

### Key Features:

*   **Camera-based machine identification:** Users can take a photo of a gym machine to get instant guidance. (Currently implemented as a stub with random selection).
*   **Machine Library:** A searchable library of gym machines with detailed instructions.
*   **Favorites and History:** Users can mark machines as favorites for quick access and view their recently viewed machines.
*   **Offline-first:** The app is designed to work without an internet connection.

### Tech Stack:

*   **Core:** React Native, Expo, TypeScript
*   **Navigation:** React Navigation (Bottom Tabs and Stack)
*   **UI:** React Native Paper (Material Design)
*   **Local Storage:** AsyncStorage

## Building and Running

### Prerequisites

*   Node.js 18+ and npm
*   iOS Simulator (macOS only) or Android Emulator
*   Expo Go app (for testing on physical devices)

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the development server:**
    ```bash
    npx expo start
    ```
2.  **Run on a simulator or device:**
    *   Press `i` to run on the iOS Simulator.
    *   Press `a` to run on the Android Emulator.
    *   Scan the QR code with the Expo Go app to run on a physical device.

### Type Checking

To run the TypeScript compiler and check for type errors, use the following command:

```bash
npx tsc --noEmit
```

## Development Conventions

*   **Component-based architecture:** The application is structured with reusable UI components located in `src/components`.
*   **Separation of concerns:** The codebase is organized into `data`, `logic`, `navigation`, `screens`, and `types` directories, promoting a clean architecture.
*   **Type safety:** The project uses TypeScript with strict mode enabled. All navigation is type-safe.
*   **State Management:** React Context is used for sharing machine data, and AsyncStorage is used for persisting favorites and history.
*   **Stubbed Services:** The machine identification feature is currently a stub located in `src/logic/identifyMachine.ts`. This allows for easy integration of a real machine learning model in the future without affecting the UI.
