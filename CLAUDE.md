# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MachineMate is a React Native mobile app that helps gym-goers identify workout equipment using computer vision. Users take photos of machines, and the app uses Hugging Face's SigLIP model to identify them and provide detailed usage guides with muscle visualizations.

**Core Stack:**
- React Native 0.81.5 + Expo SDK 54 (New Architecture enabled)
- TypeScript 5.9.2 (strict mode)
- React Navigation 7.x (native-stack + bottom-tabs)
- React Native Paper 5.14.5 (Material Design 3)
- Hugging Face SigLIP (google/siglip-so400m-patch14-384) for zero-shot image classification
- AsyncStorage for local persistence

## Development Commands

```bash
# Start development server
npm start                        # Launch Expo with QR code
npm run ios                      # Open iOS Simulator
npm run android                  # Open Android Emulator
npx expo start -c                # Clear cache and start
npx expo start --offline         # Start without network

# Type checking
npx tsc --noEmit                 # Check types without building

# ML embeddings generation
npm run embed:references         # Generate SigLIP embeddings for reference photos
                                 # Requires EXPO_PUBLIC_HF_TOKEN environment variable
                                 # Reads from assets/reference-machines/<labelId>/
                                 # Writes to src/data/referenceMachineEmbeddings.ts
```

## Architecture

### Folder Structure

```
src/
├── app/                         # Global application wiring
│   ├── navigation/              # RootNavigator (bottom tabs) + feature stacks
│   └── providers/               # MachinesProvider (Context API for catalog)
│
├── features/                    # Feature modules (domain-oriented)
│   ├── home/screens/            # HomeScreen with hero + recent machines
│   ├── identification/          # Camera + result screens + picker modal
│   ├── library/                 # Browsable machine directory + detail view
│   └── settings/                # Data management (clear favorites/history)
│
├── services/                    # Cross-cutting business logic
│   ├── recognition/             # identifyMachine.ts - 6-step ML pipeline
│   └── storage/                 # favoritesStorage.ts, historyStorage.ts
│
├── shared/                      # Reusable UI components
│   └── components/              # PrimaryButton, SectionHeader, MachineListItem, etc.
│
├── data/                        # Static datasets
│   ├── machines.json            # 6 seed machines with full guides
│   ├── gymMachineLabels.ts      # 12 zero-shot recognition labels
│   ├── labelSynonyms.ts         # Maps labels → catalog machine IDs
│   └── referenceMachineEmbeddings.ts  # Precomputed SigLIP embeddings
│
└── types/                       # TypeScript contracts
    ├── machine.ts               # MachineDefinition, MachineCategory
    ├── navigation.ts            # Type-safe navigation params
    ├── identification.ts        # IdentificationResult discriminated unions
    └── history.ts               # RecentHistoryItem
```

### Key Architectural Patterns

1. **Feature-First Organization**: Each feature (home, identification, library, settings) is self-contained with screens, components, and local logic. Cross-cutting concerns live in services/.

2. **Layered Architecture**: Clear separation between UI (features/shared), business logic (services), and data (types/data).

3. **Type-Safe Navigation**: All navigation uses strongly-typed param lists defined in src/types/navigation.ts. Example:
   ```typescript
   // Navigate with type safety
   navigation.navigate('MachineResult', {
     photoUri: uri,
     result: identificationResult
   });
   ```

4. **Local-First Design**: The machine catalog, favorites, and history all work offline. Only the recognition service requires network (with graceful fallback).

5. **Context for Read-Only Global State**: `MachinesProvider` (src/app/providers/) provides the machine catalog via `useMachines()` hook. No Redux/MobX needed.

6. **AsyncStorage for Persistence**:
   - Favorites: `@machinemate_favorites` (string[] of machine IDs)
   - History: `@machinemate_history` (RecentHistoryItem[], max 20, most recent first)
   - Embedding cache: `machinemate_embedding_v3_*` (versioned to prevent stale data)

### Navigation Flow

```
RootNavigator (Bottom Tabs)
├── HomeTab → HomeStack
│   ├── Home (welcome hero, identify CTA, recent machines)
│   ├── Camera (capture/select photo, call ML service)
│   └── MachineResult (show identification outcome + guide)
│
├── LibraryTab → LibraryStack
│   ├── Library (searchable, filterable machine directory)
│   └── MachineDetail (detailed guide with muscle diagram)
│
└── SettingsTab → SettingsScreen (no stack)
    └── Settings (clear favorites/history)
```

**Navigation Conventions:**
- Use `navigation.replace()` when transitioning after async operations
- Pass structured result objects (not just IDs) to preserve metadata
- Load data on screen focus using `useFocusEffect` hook

## Machine Identification Pipeline

**Location**: src/services/recognition/identifyMachine.ts (800 lines)

**6-Step Recognition Flow:**

```
1. Photo Preprocessing
   - Resize to 640px width
   - Center crop to 90% square
   - Final resize to 384x384 (SigLIP input size)

2. SigLIP Embedding
   - Convert preprocessed image to base64
   - POST to Hugging Face Inference API
   - Extract 1152-dimensional embedding vector

3. Domain Classification (gym vs not_gym)
   - Compare photo embedding against positive/negative domain prompts
   - Threshold: 0.35 confidence + 0.05 margin
   - Return 'not_gym' result if confidence too low

4. Label Ranking
   - Embed 12 label prompts (cached in AsyncStorage)
   - Compute text similarity (cosine distance)
   - Compute reference photo similarity (if available)
   - Fuse: 60% text + 40% reference
   - Sort by fused confidence

5. Label → Machine Mapping
   - Map top label to catalog machine using labelSynonyms.ts
   - Return 'catalog' result if mapping exists
   - Return 'generic' result if label unmapped (opens manual picker)

6. Fallback (if API fails)
   - Deterministic hash-based recommendation
   - Opens manual picker with lowConfidence: true
   - User never sees network error
```

**Key Configuration (in identifyMachine.ts):**
- `DOMAIN_CONFIDENCE_THRESHOLD = 0.35` - Below this → not_gym
- `LABEL_CONFIDENCE_THRESHOLD = 0.45` - Below this → low confidence
- `HIGH_CONFIDENCE_THRESHOLD = 0.65` - Above this → skip gap check
- `CONFIDENCE_GAP = 0.08` - Required gap between top and runner-up label
- `TEXT_WEIGHT = 0.6` - Weight for text similarity in fusion
- `REFERENCE_WEIGHT = 0.4` - Weight for reference photo similarity

**Data Files:**
- `gymMachineLabels.ts` - 12 zero-shot labels with prompts, synonyms, categories
- `labelSynonyms.ts` - Maps 6 labels to catalog machines (e.g., lat_pulldown_station → lat_pulldown)
- `referenceMachineEmbeddings.ts` - Precomputed embeddings for curated reference photos

**Hugging Face Token:**
- Stored in app.json as `extra.huggingFaceToken`
- Accessed in app via `expo-constants`: `Constants.expoConfig.extra.huggingFaceToken`
- For scripts, use `EXPO_PUBLIC_HF_TOKEN` environment variable

## Component Conventions

**Naming:**
- Components: PascalCase (e.g., `HomeScreen.tsx`, `PrimaryButton.tsx`)
- Services: camelCase (e.g., `identifyMachine.ts`, `favoritesStorage.ts`)
- Types: camelCase (e.g., `machine.ts`, `navigation.ts`)

**Props & Types:**
- Component props: `{ComponentName}Props`
- Navigation props: `{ScreenName}NavigationProp`
- Default exports for screens/components, named exports for services/types

**Styling:**
- Use `StyleSheet.create` at bottom of file
- Theme colors: Primary `#6200ee` (purple), Secondary `#03dac6` (teal)
- React Native Paper text variants: `headlineSmall`, `titleLarge`, `bodyMedium`
- Material Community Icons for all icons (20-24px inline, 40-64px hero)
- Padding: 16-24px containers, 8-12px spacing
- Border radius: 999px for pill buttons, 8px for cards

**Common Patterns:**
- Permission handling: Separate state, friendly UX, deep link to system settings
- Loading states: ActivityIndicator, disabled buttons, loading text
- Empty states: Centered layout with icon and guidance
- Error handling: Try/catch with console.error, Alert.alert for user-facing errors
- Data reload: `useFocusEffect` to refresh favorites/history on screen focus

## Data Flow & State Management

**Global State (Context API):**
```typescript
// App.tsx loads catalog once
const [machines, setMachines] = useState<MachineDefinition[]>([]);

// Wrap app in provider
<MachinesProvider value={machines}>

// Consume in any component
const machines = useMachines();
```

**Local Persistence (AsyncStorage):**
```typescript
// Favorites
await toggleFavorite(machineId);  // Add/remove from favorites
const favorites = await getFavorites();  // Load on screen focus

// History
await addToRecentHistory(machineId);  // Add to history (auto-deduplicates, max 20)
const history = await getRecentHistory();  // Load on screen focus

// Embedding cache (managed by identifyMachine service)
// Keys: machinemate_embedding_v3_*, machinemate_label_embedding_v2_*
// Versioned to prevent stale data after algorithm changes
```

## Common Development Tasks

### Adding a New Machine to Catalog

1. Edit `src/data/machines.json`:
   ```json
   {
     "id": "new_machine_id",
     "name": "Machine Name",
     "category": "strength",
     "muscleGroups": ["back", "biceps"],
     "primaryMuscles": ["back"],
     "difficulty": "beginner",
     "description": "Brief description",
     "instructions": ["Step 1", "Step 2", ...],
     "commonMistakes": ["Mistake 1", ...],
     "tips": ["Tip 1", ...],
     "imageUrl": "local"
   }
   ```

2. Add machine image to `assets/machines/new_machine_id.jpg`

3. Update `src/data/labelSynonyms.ts` if you want ML to recognize it:
   ```typescript
   export const labelSynonyms: Record<string, string> = {
     existing_label_id: 'new_machine_id',
     // ...
   };
   ```

### Adding a New Recognition Label

1. Edit `src/data/gymMachineLabels.ts`:
   ```typescript
   {
     id: 'new_label_id',
     name: 'Label Name',
     prompt: 'Visual description for SigLIP (e.g., "a cable machine with...")',
     synonyms: ['synonym1', 'synonym2'],
     category: 'strength',
     keywords: ['keyword1', 'keyword2']
   }
   ```

2. Optionally add reference photos to `assets/reference-machines/new_label_id/` (any count)

3. Regenerate embeddings:
   ```bash
   EXPO_PUBLIC_HF_TOKEN=your_token npm run embed:references
   ```

4. Update `src/data/labelSynonyms.ts` to map label to catalog machine

### Tuning Recognition Accuracy

**Adjust confidence thresholds** in `src/services/recognition/identifyMachine.ts`:
- Lower `DOMAIN_CONFIDENCE_THRESHOLD` (0.35) to be more strict about gym scenes
- Lower `LABEL_CONFIDENCE_THRESHOLD` (0.45) to reduce false positives
- Increase `CONFIDENCE_GAP` (0.08) to require clearer winner

**Improve label prompts** in `src/data/gymMachineLabels.ts`:
- Add specific visual keywords (e.g., "red seat", "vertical handles")
- Reference unique features (e.g., "plate-loaded" vs "selectorized")

**Add reference photos**:
- Place curated photos in `assets/reference-machines/<labelId>/`
- Run `npm run embed:references` to regenerate embeddings
- Adjust `TEXT_WEIGHT` and `REFERENCE_WEIGHT` in identifyMachine.ts

### Clearing Embedding Cache

Users can clear from Settings screen, or manually:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clear all embedding caches
const keys = await AsyncStorage.getAllKeys();
const embeddingKeys = keys.filter(k => k.startsWith('machinemate_embedding'));
await AsyncStorage.multiRemove(embeddingKeys);
```

Cache is versioned (`v3`, `v2`) - increment version in code to auto-invalidate on next run.

## Important Notes

**Offline Behavior:**
- Catalog, favorites, and history work without network
- Recognition requires Hugging Face API (graceful fallback if offline)
- Fallback uses deterministic hash to suggest a machine + opens manual picker

**Performance:**
- Embedding cache prevents redundant API calls (saves cost + latency)
- Image preprocessing reduces payload size (640px → 384px)
- FlatList for efficient scrolling in Library

**Security:**
- HF token in app.json is not ideal for production (use Expo Secrets or .env in production)
- No sensitive user data stored locally
- No authentication/authorization implemented yet

**Testing:**
- No automated tests currently
- Manual testing via Expo dev builds on iOS/Android/Web
- See `src/.claude/agents/qa-tester-validator.md` for structured testing approach
- TypeScript strict mode provides compile-time safety

**Extension Points:**
- Recognition service has stable interface - easy to swap Hugging Face for on-device model
- Label vocabulary can expand without UI changes (just update gymMachineLabels.ts)
- Navigation structure supports adding new feature tabs or stacks
- Reference embeddings regenerate via script (no manual data entry)

## Troubleshooting

**"Network request failed" errors:**
- Check `EXPO_PUBLIC_HF_TOKEN` environment variable is set
- Verify app.json has `extra.huggingFaceToken` configured
- Try `npx expo start -c` to clear cache

**"Cannot find module" TypeScript errors:**
- Run `npm install` to ensure dependencies are installed
- Check `tsconfig.json` extends `expo/tsconfig.base`
- Verify import paths are correct (use absolute imports from `src/`)

**Recognition always returns low confidence:**
- Check Hugging Face API quota/rate limits
- Verify images are well-lit and machine is centered
- Try lowering confidence thresholds in identifyMachine.ts
- Add more reference photos and regenerate embeddings

**App crashes on camera screen:**
- Check camera permissions are granted
- Try on physical device (simulators have limited camera support)
- Check expo-camera version matches Expo SDK

**Stale data in favorites/history:**
- Clear app data in device settings
- Or use Settings screen to clear favorites/history
- Check AsyncStorage keys are correct (`@machinemate_*`)
