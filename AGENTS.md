# Repository Guidelines

## Project Structure & Module Organization
MachineMate is an Expo-managed React Native app, and all active source lives inside `MachineMate/`. `App.tsx` loads the machine catalog, applies theming, and mounts navigation while delegating shared data to `MachinesProvider`. The `src/` subfolders group responsibilities: `app/` for providers + navigation, `features/` for screen logic, `services/` for AsyncStorage + recognition helpers, `shared/` for reusable UI, `types/` for domain contracts, and `data/` for the `machines.json` seed catalog. Assets for demos or diagrams sit in `MachineMate/assets`. The root-level `src` mirrors this layout for reference; edit the Expo copy first to keep Metro builds in sync.

## Build, Test, and Development Commands
Install dependencies once with `npm install` inside `MachineMate/`. Key scripts:
- `npm run start` — launch Expo Dev Tools and the Metro bundler.
- `npm run ios` / `npm run android` / `npm run web` — open the platform-specific clients.
If Metro caches misbehave, restart via `npm run start -- --clear`.

## Coding Style & Naming Conventions
Code is TypeScript-first with strict navigation typing. Keep 2-space indentation, single quotes, trailing semicolons, and `StyleSheet.create` for styles. Components, screens, and files use PascalCase (e.g., `CameraScreen.tsx`); hooks and helpers stay camelCase. Favor descriptive prop names over abbreviations, and colocate feature data or assets in the matching folder. Run `npx tsc --noEmit` before submitting significant changes.

## Testing Guidelines
No automated harness ships yet, so rely on manual verification. Exercise the Home → Camera → Result and Library flows on at least one platform via Expo, confirm favorites/history persistence with hot reloads disabled, and watch Metro logs for runtime warnings. Add Jest-based unit tests when introducing complex logic; place them alongside the module in a `__tests__/` folder.

## Commit & Pull Request Guidelines
Git history currently uses plain imperative messages; follow that pattern (e.g., `Add fuzzy camera identification`). Scope commits around a single concern and include related assets or JSON updates together. PRs should summarize the change, list manual test steps, call out new data files, and attach screenshots or recordings for UI updates. Link issues using `Fixes #id` when applicable.

## Data & Configuration Tips
`machines.json` drives the catalog; preserve id stability and keep arrays sorted for predictable renders. Async storage helpers expect string id arrays, so validate new persisted fields accordingly. If you add secrets or remote endpoints, surface them via Expo config and avoid hardcoding credentials inside the repo.
