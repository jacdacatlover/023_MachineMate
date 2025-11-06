# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` wires providers, navigation, and shared theme.
- `src/app` contains navigation stacks and React context providers.
- `src/features` groups screens by domain (home, identification, library, settings); colocate UI state with its feature.
- `src/services` holds machine recognition and storage logic; prefer reusing helpers here before adding new utilities elsewhere.
- Static assets live in `assets/`, while backend proof-of-concept code resides under `backend/` for the FastAPI service.

## Build, Test, and Development Commands
- `npm start` launches the Expo development server; use `npm run ios` or `npm run android` for platform-specific bootstrapping.
- `npm run lint` checks the TypeScript/TSX surfaces under `src/` and `App.tsx`; follow up with `npm run lint:fix` when safe.
- `npm run format` applies Prettier to `App.tsx` and `src/**/*.{ts,tsx}`; run after large refactors.
- `npm run type-check` validates types without emitting output; keep the pass green before opening a PR.
- `node scripts/embedReferences.js` refreshes derived content when machine guidance copy changes.

## Coding Style & Naming Conventions
- Stick to TypeScript with functional React components and hooks; default indentation is two spaces.
- Use PascalCase for components (`MachineDetailScreen`) and camelCase for hooks, helpers, and props.
- Keep shared UI in `src/shared/components`; reuse existing primitives before adding new design tokens.
- Run Prettier and ESLint prior to commits to maintain consistent formatting and lint cleanliness.

## Testing Guidelines
- No automated test harness exists yet; smoke-test flows via Expo Go or emulators before merging.
- Exercise camera identification, machine library search, and favorites/history persistence on both iOS and Android when possible.
- When touching machine data, verify JSON validity and rerun `npm run type-check` to catch shape regressions.

## Commit & Pull Request Guidelines
- Follow the existing history: imperative, present-tense messages (`Add backend API integration`) without trailing periods.
- Scope each commit to a focused concern; include follow-up cleanup separately.
- In PRs, describe the user-visible outcome, list validation steps (simulator commands, lint results), and attach screenshots for UI work.
- Reference related issues or agents, and mention environment variables (`EXPO_PUBLIC_API_BASE_URL`) if setup steps changed.
