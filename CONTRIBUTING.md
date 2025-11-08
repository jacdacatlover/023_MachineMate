# Contributing to MachineMate

We follow a feature-first architecture with lightweight packages so the app can ship quickly yet remain maintainable. This guide covers the day-to-day expectations for collaborators.

## Prerequisites

- Node 18 LTS and the Expo CLI (install via `npm i -g expo`).
- Xcode / Android Studio if you plan to run on simulators.
- Environment variables (set in `.env`, shell profile, or EAS secrets):
  - `APP_ENV` (`development`, `preview`, `production`)
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_SENTRY_DSN` (or `SENTRY_DSN_*` for env-specific builds)
  - `EAS_PROJECT_ID`, `SENTRY_ORG`, `SENTRY_PROJECT` when running EAS builds

## Development Workflow

1. **Branching** – use `feature/<short-description>` or `bugfix/<ticket>`.
2. **Install deps** – `npm install`.
3. **Run locally** – `npm start`, `npm run ios`, or `npm run android`.
4. **Quality gates** – before opening a PR run:
   - `npm run lint`
   - `npm run type-check`
   - `npm test`
5. **Commits** – imperative present tense (e.g., `Add search debounce logic`) with focused scope.

## Coding Standards

- **Language & Style** – TypeScript only, 2-space indent, functional React components + hooks.
- **Architecture** – keep navigation/providers in `src/app`, feature-specific UI/state in `src/features/<feature>`, and shared primitives under `src/shared`.
- **Imports** – aliases (`@app/*`, `@features/*`, `@shared/*`, `@typings/*`, `@data/*`) are required. Let ESLint’s `import/order` guide group spacing; run `npm run lint:fix` for quick sorting.
- **State & Hooks** – colocate feature hooks within their feature directory. Prefer our shared hooks (`useAsyncStorage`, `useNetworkStatus`, etc.) before adding new utilities.
- **Styling** – keep visual styles inside `<Component>.styles.ts` files next to the component.
- **Logging** – use `createLogger('namespace')`. It supports structured metadata and performance tracking via `logger.trackPerformance`. Avoid `console.log`.

## Observability & Monitoring

- Crash/error tracking uses Sentry via `sentry-expo`. Ensure `EXPO_PUBLIC_SENTRY_DSN` (or env-specific `SENTRY_DSN_*`) is set before running production or preview builds.
- `ErrorBoundary` will automatically report exceptions. Wrap risky feature areas with an additional boundary if needed.
- Sentry release uploads/source maps happen through the Expo plugin. Keep the `app.config.ts` plugin block intact.
- Performance-sensitive paths (e.g., machine identification) should log via `logger.trackPerformance` to surface duration metrics.
- Alerts: configure Sentry alert rules per environment (production: critical-only, preview: warnings allowed) so failures notify the on-call channel immediately.

## Testing

- React Native Testing Library + Jest power the unit tests under `__tests__/`.
- Favor hook/component tests that assert behavior (state changes, storage writes) rather than implementation details.
- Keep AsyncStorage/NetInfo mocked via `jest.setup.js`—add new mocks there if needed.

## Continuous Integration

- The GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, type-check, tests, and basic audits on every push/PR. CI must be green before merging.
- Optional Codecov upload runs automatically; ensure new code has at least smoke-test coverage.

## Releases

- Follow `RELEASE.md` for build + QA steps.
- Update `app.config.ts` version + runtimeVersion when shipping to stores.
- Document manual validation in the PR description (device, OS, outcome, screenshots for UI).

Thanks for helping keep MachineMate production-ready! Reach out in `#machinemate-dev` if you have questions.
