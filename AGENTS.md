# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` wires providers, navigation, and shared theme.
- `src/app` contains navigation stacks and React context providers.
- `src/features` groups screens by domain (home, identification, library, settings); colocate UI state with its feature.
- `src/services` holds machine recognition and storage logic; prefer reusing helpers here before adding new utilities elsewhere.
- Static assets live in `assets/`, while backend proof-of-concept code resides under `backend/` for the FastAPI service.

## Build, Test, and Development Commands
- `npm start` launches the Expo development server; use `npm run ios` or `npm run android` for platform-specific bootstrapping.
- `npm run lint` (and `npm run lint:fix`) cover `App.tsx` and everything under `src/`.
- `npm run type-check` keeps the TS project healthy; run before every commit.
- `npm test`, `npm run test:watch`, and `npm run test:coverage` execute the Jest + React Native Testing Library suites.
- `npm run format` applies Prettier to `App.tsx` and `src/**/*.{ts,tsx}`; run after large refactors.
- `node scripts/embedReferences.js` refreshes derived content when machine guidance copy changes.

## Coding Style & Naming Conventions
- Stick to TypeScript with functional React components and hooks; default indentation is two spaces.
- Use PascalCase for components (`MachineDetailScreen`) and camelCase for hooks, helpers, and props.
- Keep shared UI in `src/shared/components`; reuse existing primitives before adding new design tokens.
- Run Prettier and ESLint prior to commits to maintain consistent formatting and lint cleanliness.

## Testing & Quality Gates
- Jest + React Native Testing Library live under `src/**/__tests__`; keep AsyncStorage/NetInfo mocks up to date in `jest.setup.js`.
- The CI workflow (`.github/workflows/ci.yml`) runs `npm ci`, lint, type-check, and the Jest suite on every push/PR—keep them green before merging.
- Manual smoke tests (camera identification, library search, favorites/history, offline flows) still matter before tagging a release.
- When touching machine data, verify JSON validity and rerun `npm run type-check` to catch shape regressions.

## Monitoring & Logging
- `createLogger(namespace)` in `src/shared/logger.ts` provides structured log levels and performance tracking; avoid raw `console.log`.
- Crash reporting goes through Sentry (`sentry-expo`). Ensure `EXPO_PUBLIC_SENTRY_DSN` / `SENTRY_DSN_*` secrets are set for preview/production builds.
- Wrap new risky surfaces with `ErrorBoundary` where it improves UX; errors automatically report through `reportError`.

## Commit & Pull Request Guidelines
- Follow the existing history: imperative, present-tense messages (`Add backend API integration`) without trailing periods.
- Scope each commit to a focused concern; include follow-up cleanup separately.
- In PRs, describe the user-visible outcome, list validation steps (simulator commands, lint/type/test results), and attach screenshots for UI work.
- Reference related issues or agents, and mention environment variables (`APP_ENV`, `EXPO_PUBLIC_API_BASE_URL`, Sentry keys) if setup steps changed.
