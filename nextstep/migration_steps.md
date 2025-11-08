# MachineMate — Practical Steps to Migrate to a Feature‑Based Structure

This guide helps you reorganize the project to a **feature-first** layout while keeping shared utilities small and generic. Estimated effort: **1–2 hours**.

---

## 1) Target Folder Structure (Hybrid: Feature‑Based + Light Shared)

```
src/
  app/
    navigation/
    providers/
    theme/
  features/
    identification/
      screens/
      components/
      hooks/
      services/
      state/
      tests/
      index.ts
    library/
      screens/
      components/
      hooks/
      services/
      state/
      tests/
      index.ts
    auth/                # (soon) login/register screens & services
      screens/
      services/
      hooks/
      state/
  shared/
    components/          # Button, Card, ListItem, Modal...
    hooks/               # useNetInfo, useAppState, useDebounce...
    services/            # httpClient, logger
    utils/               # formatting, constants
    types/               # cross‑cutting types
    assets/              # truly global assets (fonts, icons)
  data/                  # optional: seeds like machines.json
```

> **Rule of thumb**: if a file is domain‑specific (e.g. uses `Machine` types), put it **inside that feature**. If it’s generic UI/infrastructure, put it in **shared/**.

---

## 2) Move Existing Files (map old → new)

- `src/features/identification/screens/CameraScreen.tsx`
- `src/features/identification/screens/MachineResultScreen.tsx`
- `src/features/identification/services/identifyMachine.ts`
- `src/features/library/screens/LibraryScreen.tsx`
- `src/features/library/screens/MachineDetailScreen.tsx`
- `src/features/library/components/MachineListItem.tsx` (if used only by Library)
- Keep `src/shared/components/PrimaryButton.tsx` (generic)
- Keep or move `src/data/machines.json`:
  - If **only** Identification/Library needs it, place near consumers (e.g., `features/library/services/`).
  - If other features will read it, leave in `src/data/`.

Create feature index barrels:
```
src/features/identification/index.ts
src/features/library/index.ts
```

Example `src/features/identification/index.ts`:
```ts
export { default as CameraScreen } from './screens/CameraScreen';
export { default as MachineResultScreen } from './screens/MachineResultScreen';
export * from './hooks';
export * from './services';
```

---

## 3) Add Path Aliases (TypeScript)

**tsconfig.json**
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@app/*": ["app/*"],
      "@features/*": ["features/*"],
      "@shared/*": ["shared/*"]
    }
  }
}
```

**babel.config.js** (if using module resolver)
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: {
          '@app': './src/app',
          '@features': './src/features',
          '@shared': './src/shared',
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }]
    ]
  };
};
```

Update imports:
```ts
// Before
import CameraScreen from '../../features/identification/screens/CameraScreen';
// After
import { CameraScreen } from '@features/identification';
```

---

## 4) Split Styles & Co‑Locate Tests

- For each screen/component:
  - Create `ComponentName.styles.ts` and import styles.
  - Add `ComponentName.test.tsx` or adjacent tests under `tests/` folder.
- Benefits: cleaner components, easier tree‑shaking, faster onboarding.

Example:
```
features/identification/components/
  PoseOverlay.tsx
  PoseOverlay.styles.ts
  PoseOverlay.test.tsx
```

---

## 5) State Management Placement

- **Local UI state** → inside component/hook.
- **Feature state** → `features/<name>/state` (Zustand or Redux slice when needed).
- **Global cross‑feature state** → `app/providers` or `shared/state` (e.g., auth token, theme).

Minimal Zustand store example:
```ts
// src/features/identification/state/useIdentificationStore.ts
import { create } from 'zustand';

type State = {
  isUploading: boolean;
  setUploading: (v: boolean) => void;
};

export const useIdentificationStore = create<State>((set) => ({
  isUploading: false,
  setUploading: (v) => set({ isUploading: v }),
}));
```

---

## 6) Navigation Updates

- In navigators, import from feature barrels:
```ts
import { CameraScreen, MachineResultScreen } from '@features/identification';
import { LibraryScreen, MachineDetailScreen } from '@features/library';
```
- Keep stacks co‑located under `app/navigation/` while features own their screens.

---

## 7) Shared Layer Boundaries (What goes in `shared/`)

- **components/**: purely presentational UI blocks used by multiple features (Button, Card, ListItem).
- **hooks/**: infra‑level hooks (e.g., `useNetInfo`, `useAppState`, `useDebounce`).
- **services/**: `httpClient`, logging, Sentry bridge.
- **utils/**: formatting, constants.
- **types/**: global primitives used across features.

Avoid domain types (like `Machine`, `IdentificationResult`) in `shared/`—keep them inside the feature or a dedicated domain module.

---

## 8) Clean Imports & Linting

- Enforce import order and formatting via ESLint/Prettier.
- Example import order: built‑ins → third‑party → aliases → relatives.
- Add lint rule/plugins for import grouping (eslint‑plugin‑import).

---

## 9) Progressive Hardening (Optional but recommended)

- **ErrorBoundary** at the app root.
- **Lazy‑load** heavy screens with `React.lazy` and `Suspense`.
- **Asset optimization**: compress images, ship only used fonts.
- **Performance**: enable Hermes (if bare workflow), test in release mode.
- **Testing**: add Jest + RTL for core flows (identification, library).

---

## 10) Migration Checklist (Tick as you go)

- [ ] Create `features/identification` and `features/library` folders.
- [ ] Move screens/components/services into their feature folders.
- [ ] Create feature `index.ts` barrels.
- [ ] Add TS path aliases (and Babel module‑resolver if used).
- [ ] Update imports across the app.
- [ ] Split styles and co‑locate tests.
- [ ] Introduce (optional) lightweight feature store where helpful.
- [ ] Verify navigation compiles after path updates.
- [ ] Run on device/emulator and verify flows.
- [ ] Commit: `feat(structure): migrate to feature-based layout`.

---

### Rollback Plan

If something breaks, keep a `pre-migration` branch:
```bash
git checkout -b pre-migration
git checkout -b feature-structure
# migrate changes
# if needed: git diff pre-migration..feature-structure
```
You can cherry-pick files or revert quickly.

---

**Done!** You now have a scalable feature‑first structure with a minimal, stable shared layer. This keeps MachineMate lightweight today and ready for Auth/History/Workouts tomorrow.
