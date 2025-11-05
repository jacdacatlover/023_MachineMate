# MachineMate - Complete File Structure

## Generated Files

### Core Application Files

**App.tsx** – Loads the machine catalog from JSON, manages loading/error fallbacks, applies the React Native Paper theme, and mounts the navigation container. Wraps the tree in `MachinesProvider` so every feature can call `useMachines()`.

### App Layer (`src/app/`)

- **providers/MachinesProvider.tsx** – Lightweight React context + hook for machine data.
- **navigation/HomeStack.tsx** – Home → Camera → MachineResult stack with consistent header styling.
- **navigation/LibraryStack.tsx** – Library → MachineDetail stack.
- **navigation/RootNavigator.tsx** – Bottom-tab shell that hosts Home, Library, and Settings.

### Type Definitions (`src/types/`)

- **machine.ts** – `MachineDefinition`, `MachineCategory`, and difficulty enums.
- **history.ts** – `RecentHistoryItem` for AsyncStorage history entries.
- **navigation.ts** – Strongly typed param lists for every navigator.
- **env.d.ts** – Expo env typings (e.g., `EXPO_PUBLIC_HF_TOKEN`).

### Data (`src/data/`)

- **machines.json** – Six realistic machines with setup/how-to/mistakes/safety/beginner copy.
- **gymMachineLabels.ts** – Zero-shot vocabulary used to label embeddings.
- **labelSynonyms.ts** – Maps broad labels to catalog machine ids.
- **referenceMachineEmbeddings.ts** – Generated SigLIP vectors for curated reference photos.

### Services (`src/services/`)

- **recognition/identifyMachine.ts** – Hugging Face SigLIP integration, photo pre-processing, domain gating, label + reference fusion scoring, embedding caches, and confidence gating with fallbacks.
- **storage/favoritesStorage.ts** – AsyncStorage helpers for favorites (`getFavorites`, `toggleFavorite`, `isFavorite`, `clearFavorites`).
- **storage/historyStorage.ts** – AsyncStorage helpers for recents (`getRecentHistory`, `addToRecentHistory`, `clearHistory`).

### Shared UI (`src/shared/components/`)

- **PrimaryButton.tsx** – Branded CTA button with icons/loading support.
- **SectionHeader.tsx** – Consistent section headings for detail screens.
- **MachineListItem.tsx** – Reusable list row with optional favorite toggle.

### Features (`src/features/`)

- **home/screens/HomeScreen.tsx** – Welcome hero, identify CTA, and recent machines list.
- **identification/screens/CameraScreen.tsx** – Camera capture, permission UX, and gallery picker.
- **identification/screens/MachineResultScreen.tsx** – Recognition outcome, confidence display, full machine guide; uses **identification/components/MachinePickerModal.tsx** for manual overrides.
- **library/screens/LibraryScreen.tsx** – Searchable, filterable machine directory.
- **library/screens/MachineDetailScreen.tsx** – Detailed guide view launched from the library.
- **settings/screens/SettingsScreen.tsx** – Data management actions and app disclaimer.

### Assets

- **assets/muscle-diagrams/** – Placeholder diagrams with README.
- **assets/test-photos/** – Sample images for local testing.
- **assets/reference-machines/** – Curated photos used to generate reference embeddings (optional).

### Documentation

- **README.md** – End-to-end overview, setup, testing, and architecture notes.
- **QUICKSTART.md** – Condensed setup checklist.
- **PROJECT_STRUCTURE.md** – This document.

## File Count Summary

- **Core:** 1 (App.tsx)
- **App Layer:** 4 (MachinesProvider + 3 navigators)
- **Types:** 5 (machine, history, navigation, identification, env)
- **Data:** 4 (machines, labels, label synonyms, reference embeddings)
- **Services:** 3 (recognition, favorites storage, history storage)
- **Shared UI:** 5 (button, header, list item, body highlighter, exercise player)
- **Features:** 7 (home, camera, machine result, picker modal, library, machine detail, settings)
- **Docs:** 3 + 2 asset READMEs

**Total:** 32 TypeScript/JSON files + documentation

## Key Design Decisions

1. **Context over Redux** – Machines are read-only static data; a simple provider + hook keeps things lean.
2. **AsyncStorage** – Lightweight persistence for favorites and recents without extra services.
3. **Modular Identification** – All machine recognition logic is isolated behind one service to enable swaps (e.g., on-device ML) without UI churn.
4. **Type Safety** – Navigation and domain models are strongly typed for compile-time guarantees.
5. **Local-First UX** – Catalog, favorites, and history work offline; only recognition depends on Hugging Face.
6. **Shared UI Primitives** – A small set of reusable components keeps feature screens thin and consistent.
