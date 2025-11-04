# MachineMate - Mobile Gym Machine Guide

A React Native + Expo mobile app that helps gym beginners learn how to use gym machines safely and correctly.

## Features

- 📸 **Camera Identification**: Take a photo of a machine to get instant guidance (MVP uses stub/random selection)
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

## Project Structure

```
MachineMate/
├── App.tsx                 # Main app with context & theme
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── MachineListItem.tsx
│   │   ├── PrimaryButton.tsx
│   │   └── SectionHeader.tsx
│   ├── data/              # Static data
│   │   └── machines.json  # 5 seed machines
│   ├── logic/             # Business logic
│   │   ├── favoritesStorage.ts
│   │   ├── historyStorage.ts
│   │   └── identifyMachine.ts
│   ├── navigation/        # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── HomeStack.tsx
│   │   └── LibraryStack.tsx
│   ├── screens/           # All app screens
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── MachineResultScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   ├── MachineDetailScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── types/             # TypeScript types
│       ├── machine.ts
│       ├── history.ts
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

2. **Start the development server:**
   ```bash
   npx expo start
   ```

3. **Run on your device:**
   - **iOS Simulator** (Mac only): Press `i`
   - **Android Emulator**: Press `a`
   - **Physical Device**: Scan the QR code with Expo Go app

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

The app includes 5 pre-loaded machines:

1. **Leg Press** (Lower Body, Beginner)
2. **Lat Pulldown** (Back, Beginner)
3. **Chest Press** (Chest, Beginner)
4. **Seated Row** (Back, Beginner)
5. **Shoulder Press** (Shoulders, Intermediate)

Each machine has complete, realistic guidance including setup steps, how-to instructions, common mistakes, safety tips, and beginner tips.

## Key Features Explained

### 1. Machine Identification (Stub)

The camera flow works end-to-end, but currently uses **random selection** as a placeholder for real ML/AI. The identification logic is in `src/logic/identifyMachine.ts` and is designed to be easily swappable:

```typescript
export async function identifyMachine(
  photoUri: string,
  allMachines: MachineDefinition[]
): Promise<IdentificationResult>
```

**To add real ML later:**
- Replace the function body with your ML model
- The UI is completely decoupled and won't need changes
- Could use TensorFlow, CLIP, or an API call

### 2. Offline-First Architecture

- No network calls in the entire app
- All data stored locally (AsyncStorage)
- Machine catalog bundled with the app
- Works perfectly in airplane mode

### 3. Type-Safe Navigation

All navigation uses TypeScript for compile-time safety:

```typescript
navigation.navigate('MachineResult', {
  photoUri: string,
  primaryMachineId: string,
  candidateIds: string[]
});
```

## Testing the App

### Test Camera Flow

1. From Home screen, tap "Identify a Machine"
2. Grant camera permission when prompted
3. Take a photo of anything (stub will randomly select a machine)
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
- ✅ Fully functional offline

## Future Enhancements

The codebase is architected to support these future features:

- 🤖 **Real ML identification** - Replace stub in `identifyMachine.ts`
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
3. **Stub Identification**: Random selection maintains the full UX flow while being easily swappable later
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
