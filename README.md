# MachineMate - Mobile Gym Machine Guide

A React Native + Expo mobile app that helps gym beginners learn how to use gym machines safely and correctly.

## Features

- 📸 **Camera Identification**: Take or upload a photo of a machine to get instant guidance via the backend `/identify` API
- 📚 **Machine Library**: Browse and search 5 seed machines with detailed instructions
- ⭐ **Favorites**: Mark machines as favorites for quick access
- 🕒 **Recent History**: View your last 5 viewed machines
- 💡 **Comprehensive Guides**: Each machine includes:
  - Setup steps
  - How-to instructions
  - Common mistakes
  - Safety tips
  - Beginner tips
- 📱 **Offline-First**: All features work without internet connection

## Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and managed workflow
- **TypeScript** - Type safety and better DX
- **React Navigation** - Bottom tabs + stack navigation
- **React Native Paper** - Material Design UI components
- **AsyncStorage** - Local data persistence
- **expo-camera** - Camera functionality
- **expo-image-picker** - Importing photos from the device library

## Project Structure

```
MachineMate/
├── App.tsx                 # Main app with context & theme
├── src/
│   ├── app/                # Global app wiring (navigation, providers)
│   │   ├── navigation/
│   │   │   ├── HomeStack.tsx
│   │   │   ├── LibraryStack.tsx
│   │   │   └── RootNavigator.tsx
│   │   └── providers/
│   │       └── MachinesProvider.tsx
│   ├── data/               # Static datasets
│   │   └── machines.json
│   ├── features/           # Feature-oriented modules
│   │   ├── home/
│   │   │   └── screens/HomeScreen.tsx
│   │   ├── identification/
│   │   │   ├── components/MachinePickerModal.tsx
│   │   │   └── screens/
│   │   │       ├── CameraScreen.tsx
│   │   │       └── MachineResultScreen.tsx
│   │   ├── library/
│   │   │   └── screens/
│   │   │       ├── LibraryScreen.tsx
│   │   │       └── MachineDetailScreen.tsx
│   │   └── settings/
│   │       └── screens/SettingsScreen.tsx
│   ├── services/           # Cross-cutting business logic
│   │   ├── recognition/identifyMachine.ts
│   │   └── storage/
│   │       ├── favoritesStorage.ts
│   │       └── historyStorage.ts
│   ├── shared/             # Shared UI primitives
│   │   └── components/
│   │       ├── MachineListItem.tsx
│   │       ├── PrimaryButton.tsx
│   │       └── SectionHeader.tsx
│   └── types/              # TypeScript contracts
│       ├── env.d.ts
│       ├── history.ts
│       ├── machine.ts
│       └── navigation.ts
└── assets/
    ├── muscle-diagrams/   # Muscle diagram images (see README)
    └── test-photos/       # Test machine photos (see README)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app (for testing on physical devices)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Sync Expo native modules (run after pulling dependencies updates):**
   ```bash
   npx expo install expo-image-picker expo-image-manipulator expo-file-system
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on your device:**
   - **iOS Simulator** (Mac only): Press `i`
   - **Android Emulator**: Press `a`
   - **Physical Device**: Scan the QR code with Expo Go app

### Optional: Backend mock API

The mobile client now checks for `EXPO_PUBLIC_API_BASE_URL`. When present, it
uploads photos to the FastAPI prototype before falling back to the legacy
on-device pipeline.

1. Install backend dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```
2. Start the server:
   ```bash
   uvicorn backend.app.main:app --reload
   ```
   Configure the backend via environment variables, for example:
   ```bash
   export MACHINEMATE_VLM_API_BASE_URL=https://your-vlm-host
   export MACHINEMATE_VLM_API_KEY=your_token   # optional
   ```
3. Point the Expo app at the API:
   ```bash
   export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   npx expo start
   ```

The `/identify` endpoint currently returns mocked predictions so you can test
the end-to-end flow while the detector + VLM stack is developed.

## Running the App

### On iOS Simulator (Mac)
```bash
npx expo start
# Press 'i' to open iOS simulator
```

### On Android Emulator
```bash
npx expo start
# Press 'a' to open Android emulator
```

### On Physical Device
1. Install Expo Go from App Store or Play Store
2. Run `npx expo start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

## Seed Data

The app includes 6 pre-loaded machines:

1. **Leg Press** (Lower Body, Beginner)
2. **Lat Pulldown** (Back, Beginner)
3. **Chest Press** (Chest, Beginner)
4. **Seated Row** (Back, Beginner)
5. **Shoulder Press** (Shoulders, Intermediate)
6. **Treadmill** (Cardio, Beginner)

Each machine has complete, realistic guidance including setup steps, how-to instructions, common mistakes, safety tips, and beginner tips.

## Key Features Explained

### 1. Machine Identification Service

All recognition logic lives in `src/services/recognition/identifyMachine.ts`. The client:
- Uploads the captured photo to the backend `/identify` endpoint whenever `EXPO_PUBLIC_API_BASE_URL` is set. A `{ machine, confidence }` response ≥0.7 auto-navigates to the guide; lower confidence opens the manual picker with candidates tagged as `source: 'backend_api'`.
- Falls back to a deterministic catalog suggestion (hash-based so QA is repeatable) when the API is unavailable or returns an error. This keeps the flow usable offline while making it clear that results are low-confidence (`source: 'fallback'`).

### 2. Local-First Catalog

- Machine definitions, guides, and UI chrome ship in-app.
- AsyncStorage backs favorites and recent history.
- Recognition is the only network dependency; the rest of the UX works offline.

### 3. Type-Safe Navigation

All navigation uses TypeScript for compile-time safety:

```typescript
navigation.navigate('MachineResult', {
  photoUri,
  result: {
    kind: 'catalog',
    machineId,
    candidates: [machineId],
    confidence: null,
    lowConfidence: false,
    source: 'manual',
  },
});
```

## Testing the App

### Test Camera Flow

1. From Home screen, tap "Identify a Machine"
2. Grant camera permission when prompted
3. Take a photo of anything (low-confidence or unrecognized images will open the manual picker)
4. View the machine guide with all details

### Test Library

1. Navigate to Library tab
2. Search for machines or filter by category
3. Tap any machine to view full details

### Test Favorites & History

1. Mark a few machines as favorites (star icon)
2. View machines from Library or Camera flow
3. Return to Home to see recent history
4. Close and reopen app - favorites persist!

## Adding Assets (Optional)

### Muscle Diagrams

See `assets/muscle-diagrams/README.md` for instructions on adding muscle diagram images. The app works without them but shows a placeholder.

### Test Photos

See `assets/test-photos/README.md` for instructions on adding sample machine photos for testing.

## Acceptance Criteria ✅

All MVP acceptance criteria are met:

- ✅ Camera → Capture → Identification → Guidance flow works
- ✅ Library browsing with search and filters
- ✅ Recent machines displayed on Home screen
- ✅ Favorites persist across app restarts
- ✅ Catalog, favorites, and history work offline (recognition requires connectivity)

## Future Enhancements

The codebase is architected to support these future features:

- 🤖 **On-device / custom ML** - Extend `src/services/recognition/identifyMachine.ts` with additional models
- 🖼️ **Muscle diagrams** - Add images to visualize muscles worked
- 📹 **Video demonstrations** - Add video guides for each machine
- 🏋️ **Workout tracking** - Log sets, reps, and weight
- 👤 **User profiles** - Save personal records and preferences
- ☁️ **Cloud sync** - Sync data across devices
- 🌍 **Multi-language** - Internationalization support

## Troubleshooting

### Camera not working on iOS Simulator

Physical camera doesn't work in iOS Simulator. Use a physical device or test with saved photos.

### TypeScript errors

```bash
npx tsc --noEmit
```

Should show no errors. If you see errors, ensure all dependencies are installed.

### App won't start

1. Clear cache: `npx expo start -c`
2. Delete node_modules: `rm -rf node_modules && npm install`
3. Reset Metro bundler: `npx expo start --reset-cache`

## Development Notes

### Architecture Decisions

1. **Context for State**: Machine data shared via React Context (simple and sufficient for read-only catalog)
2. **AsyncStorage**: Lightweight and perfect for favorites/history (no complex state management needed)
3. **Pluggable Identification**: Recognition lives in one service with a stable interface, making it easy to swap Hugging Face for another provider or local model later.
4. **No Backend**: Keeps MVP simple and focuses on mobile UX

### Code Quality

- ✅ TypeScript strict mode
- ✅ Component-based architecture
- ✅ Separation of concerns (UI, logic, data, types)
- ✅ Comprehensive comments
- ✅ Type-safe navigation

## License

This is a sample MVP project for demonstration purposes.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed
3. Try clearing cache and restarting

---

**Built with ❤️ using React Native + Expo + TypeScript**
