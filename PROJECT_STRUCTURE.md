# MachineMate - Complete File Structure

## Generated Files

### Core Application Files

**App.tsx** - Main entry point with machine context and theme
- Loads machines.json data
- Provides MachinesContext for all components
- Sets up NavigationContainer with React Native Paper theme
- Error handling for data loading

### Type Definitions (`src/types/`)

**machine.ts** - Core machine data types
- `MachineCategory` type
- `MachineDefinition` interface (id, name, category, muscles, difficulty, steps, tips)

**history.ts** - History tracking types
- `RecentHistoryItem` interface (machineId, viewedAt)

**navigation.ts** - Navigation type safety
- `RootTabParamList` - Bottom tab params
- `HomeStackParamList` - Home stack params
- `LibraryStackParamList` - Library stack params

### Data (`src/data/`)

**machines.json** - 5 seed machines with realistic content
- Leg Press (Lower Body, Beginner)
- Lat Pulldown (Back, Beginner)
- Chest Press (Chest, Beginner)
- Seated Row (Back, Beginner)
- Shoulder Press (Shoulders, Intermediate)

Each machine includes:
- Setup steps (3-5 detailed steps)
- How-to steps (4-5 movement instructions)
- Common mistakes (4-5 errors to avoid)
- Safety tips (4-5 safety guidelines)
- Beginner tips (4-5 helpful hints)

### Business Logic (`src/logic/`)

**identifyMachine.ts** - Machine identification (stub)
- `IdentificationResult` interface
- `identifyMachine()` function
- Returns primary machine + 2-3 candidates
- Designed to be easily swappable for real ML

**favoritesStorage.ts** - Favorites management
- `getFavorites()` - Load favorite IDs
- `setFavorites()` - Save favorite IDs
- `toggleFavorite()` - Toggle and return updated list
- `isFavorite()` - Check favorite status
- `clearFavorites()` - Clear all favorites

**historyStorage.ts** - History management
- `getRecentHistory()` - Load recent items
- `addToRecentHistory()` - Add machine to history (max 20 items)
- `clearHistory()` - Clear all history

### Navigation (`src/navigation/`)

**RootNavigator.tsx** - Bottom tab navigator
- Home tab (HomeStack)
- Library tab (LibraryStack)
- Settings tab (SettingsScreen)
- Material Community Icons

**HomeStack.tsx** - Home stack navigator
- Home → Camera → MachineResult flow

**LibraryStack.tsx** - Library stack navigator
- Library → MachineDetail flow

### Components (`src/components/`)

**MachineListItem.tsx** - Reusable machine list item
- Shows machine name, category chip
- Optional favorite toggle
- Handles press events

**SectionHeader.tsx** - Styled section header
- Used in machine detail screens
- Purple accent color

**PrimaryButton.tsx** - Reusable button component
- Wraps React Native Paper Button
- Customizable mode, icon, loading state

### Screens (`src/screens/`)

**HomeScreen.tsx** - Main entry screen
- Hero section with "Identify a Machine" button
- Recent machines list (last 5)
- Loads favorites and history on focus

**CameraScreen.tsx** - Camera capture
- expo-camera integration
- Permission handling with helpful UI
- Capture button
- Navigates to MachineResult with photo

**MachineResultScreen.tsx** - Identification result
- Shows captured photo thumbnail
- Machine info (name, category, muscles, difficulty)
- Alternative candidates (if wrong)
- Full guide (setup, how-to, mistakes, safety, tips)
- Favorite toggle
- Adds to history

**LibraryScreen.tsx** - Browse all machines
- Search bar (by name or muscle)
- Category filter chips
- Machine list
- Empty state

**MachineDetailScreen.tsx** - Full machine guide
- Same content as MachineResult but without photo
- Accessed from Library
- Favorite toggle
- Adds to history

**SettingsScreen.tsx** - Settings and info
- Clear favorites button (with confirmation)
- Clear history button (with confirmation)
- App version info
- Important disclaimer

### Assets

**assets/muscle-diagrams/** - Muscle diagram images (optional)
- README.md with instructions

**assets/test-photos/** - Test machine photos (optional)
- README.md with instructions

### Documentation

**README.md** - Comprehensive project documentation
- Features, tech stack, structure
- Installation and running instructions
- Testing guide
- Architecture decisions
- Future enhancements

**QUICKSTART.md** - Quick start guide
- 3-step setup
- Feature overview
- Next steps

**PROJECT_STRUCTURE.md** - This file
- Complete file listing and descriptions

## File Count Summary

- **Core:** 1 (App.tsx)
- **Types:** 3 (machine, history, navigation)
- **Data:** 1 (machines.json)
- **Logic:** 3 (identify, favorites, history)
- **Navigation:** 3 (root, home stack, library stack)
- **Components:** 3 (list item, header, button)
- **Screens:** 6 (home, camera, result, library, detail, settings)
- **Docs:** 3 + 2 asset READMEs

**Total:** 23 TypeScript/JSON files + documentation

## Key Design Decisions

1. **Context over Redux** - Simple read-only catalog doesn't need complex state management
2. **AsyncStorage** - Lightweight, perfect for favorites/history
3. **Stub Identification** - Maintains full UX while being easily swappable
4. **Type Safety** - Full TypeScript coverage with strict navigation types
5. **Offline First** - No network dependencies, works in airplane mode
6. **Component Composition** - Reusable components for consistent UI

All files include helpful comments explaining their purpose and usage.
