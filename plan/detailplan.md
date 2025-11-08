## MachineMate Architecture Detail Plan

### 1. Platform Hardening & Compliance
- **Objectives**
  - Deliver a consistent dark-mode experience from splash to runtime, satisfy App Store/Play Store privacy requirements, and make configuration predictable across environments.
- **Tasks**
  1. Update `app.json` / `eas.json`:
     - Set `userInterfaceStyle: "dark"` (or `automatic` with themed assets), add localized `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`, and mirror the same rationale inside `android.permissions`.
     - Introduce `extra` keys for `apiBaseUrl`, `env`, and `buildNumber`, referencing Expo config plugins when needed.
  2. Create `app.config.ts` helper that reads environment variables (dev/preview/prod) and feeds Expo constants plus `Constants.expoConfig?.
  3. Document a release checklist (TestFlight/Internal App Sharing builds, required screenshots, privacy question answers) and store it under `docs/release-checklist.md`.
  4. Verify changes via `expo prebuild --clean` in CI to catch Info.plist/AndroidManifest regressions.
- **Acceptance**
  - Builds install without manual permission edits, project compiles under `npm run type-check`, and QA can follow the release checklist end-to-end.

### 2. Feature-First Architecture & Imports
- **Objectives**
  - Finish the domain-based folder migration so each feature encapsulates screens, services, hooks, and types; reduce brittle relative imports.
- **Tasks**
  1. Apply the structure outlined in `nextstep/migration_steps.md`, moving Identification, Library, Settings, and shared UI into their respective `src/features/*` or `src/shared/*` buckets.
  2. Add path aliases:
     - Update `tsconfig.json` with `baseUrl: "src"` and `paths` for `@app/*`, `@features/*`, `@shared/*`, `@services/*`.
     - Configure Babel (`babel.config.js`) and ESLint import resolvers to match.
  3. Create barrel files per feature to expose only the intended surface. Example: `src/features/identification/index.ts` re-exporting screens, hooks, services.
  4. Split dense components into `Component.tsx`, `Component.styles.ts`, and (eventually) `Component.test.tsx` to reduce merge conflicts.
  5. Run `npm run lint && npm run type-check` and fix every broken import.
- **Acceptance**
  - No file imports via `../../..`, navigation stacks consume feature barrels, and CI stays green.

### 3. Performance & Bundle Efficiency
- **Objectives**
  - Keep the app lightweight while ensuring a fluid camera → recognition → results loop on constrained devices.
- **Tasks**
  1. Self-host fonts: download the Inter/Space Grotesk TTFs into `assets/fonts`, register them via `Font.loadAsync`, and drop runtime CDN fetches.
  2. Lazy-load heavy modules (`AnimatedBodyHighlighter`, potential ML helpers) with `React.lazy` and show skeleton placeholders while loading.
  3. Audit bundle size using `expo bundle:analyze`; set <12 MB target for JS bundle and <40 MB APK/IPA after assets.
  4. Cache recognition assets and create a preflight step that resizes images before upload to cut bandwidth.
  5. Add a “Performance budget” doc capturing benchmarks: cold start <2.5s on Pixel 4a, navigation <300ms, identify → result <4s on fallback.
- **Acceptance**
  - Benchmark script (Detox or custom Expo-CLI timing) records metrics under thresholds; Play Console size warnings resolved.

### 4. Recognition Reliability & Data Quality
- **Objectives**
  - Ensure backend/API failures degrade gracefully and catalog updates never corrupt local storage.
- **Tasks**
  1. Expand `identifyMachine`:
     - Add retry-with-backoff on network errors, differentiate between offline vs API failure, and log trace IDs.
     - Send device + build metadata to the backend for better triage.
  2. Validate machine data:
     - Add a `schema/machine.schema.json` or Zod schema and run it in a pre-commit script.
     - Enhance `services/storage/validation.ts` with structured warning logs through `shared/logger`.
  3. Create deterministic fixtures for history/favorites; add Jest tests that simulate missing IDs, corrupt JSON, and AsyncStorage failures.
  4. Introduce migration helpers so catalog changes (renamed IDs) can map old favorites/history entries to new IDs.
- **Acceptance**
  - Automated validation fails CI when catalog JSON is invalid, manual QA verifies that capturing without network falls back cleanly, and history/favorites stay accurate after catalog edits.

### 5. Observability, QA, and Release Discipline
- **Objectives**
  - Gain insight into crashes and user behavior, enforce quality gates, and codify manual test passes per release.
- **Tasks**
  1. Integrate Sentry (or Expo Insights):
     - Initialize in `App.tsx`, wrap navigation with an error boundary, and capture breadcrumbs for recognition attempts.
  2. Specify analytics events (e.g., “IdentifyAttempt”, “FavoriteToggled”) and implement via Expo’s `Analytics` or Segment.
  3. Stand up CI (GitHub Actions):
     - Jobs for `npm ci`, `npm run lint`, `npm run type-check`, optional Jest smoke tests, and `expo doctor`.
  4. Document manual QA suites covering: onboarding, permissions, camera capture, photo upload, library search, favorites/history, settings clear actions, offline behavior.
  5. Create a release runbook referencing similar fitness apps (e.g., Nike Training Club) emphasizing privacy copy, screenshot specs, and App Review Q&A templates.
- **Acceptance**
  - Each pull request surfaces lint/type-check status, Sentry dashboard receives sample events from dev builds, and release runbook is used for the next store submission.

### Implementation Notes
- Prioritize platform hardening + architecture work in parallel streams; other initiatives can branch from the stabilized codebase.
- Sequence: Platform Hardening → Feature Architecture → Observability while Performance/Reliability tasks run incrementally.
- Reassess roadmap quarterly; adjust based on backend maturity and any new feature pillars (Auth, personalized programs).
