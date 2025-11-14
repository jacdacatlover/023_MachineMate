## Current Issues

### 1. Supabase client hard-fails without secrets
- **File:** `src/services/api/supabaseClient.ts:60-74`
- The module throws during import when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing. Any test or Metro run that touches favorites/history hooks now dies with `Missing Supabase configuration…`. `npm test -- --runTestsByPath src/features/library/hooks/__tests__/useFavorites.test.tsx` reproduces.
- **Impact:** CI/Jest/Metro cannot run unless developers inject real secrets; breaks local workflows.
- **Fix:** Defer client creation or read defaults from `Constants.expoConfig?.extra`/dev fallbacks so tooling works without production creds.

### 2. Screens bypass new API layer
- **Files:** `src/features/home/screens/HomeScreen.tsx`, `src/features/library/screens/LibraryScreen.tsx`, `src/features/identification/screens/MachineResultScreen.tsx`, `src/features/library/screens/MachineDetailScreen.tsx`, `src/features/settings/screens/SettingsScreen.tsx`
- These components still call `favoritesStorage`/`historyStorage` directly. None consume `useFavorites`/`useRecentHistory` or the REST services, so favorites/history remain device-local and never sync to Supabase.
- **Impact:** Newly added backend services are unused; no multi-device sync; code duplication.
- **Fix:** Refactor screens to use the hooks/services (or context) so API data flows through Supabase.

### 3. Clear flows never touch backend
- **Files:** `src/features/settings/screens/SettingsScreen.tsx:42-120`, `src/features/library/hooks/useFavorites.ts:229-238`, `src/features/library/hooks/useRecentHistory.ts:201-210`
- Clearing favorites/history only wipes AsyncStorage. Server data persists and reappears on next sync; there is no backend delete/bulk removal.
- **Impact:** Users cannot actually clear Supabase data; confusing UX.
- **Fix:** Add DELETE endpoints (or RPC) and call them when clearing; update hooks/screens accordingly.

### 4. Invalid IDs aren’t persisted after cleanup
- **Files:** `src/features/library/hooks/useFavorites.ts:82-111`, `src/features/library/hooks/useRecentHistory.ts:86-125`
- Cleanup callbacks log that invalid machine IDs were removed but never write the filtered arrays back. AsyncStorage remains corrupted.
- **Impact:** Invalid entries keep returning; logs are misleading.
- **Fix:** After filtering, persist the sanitized list (guarding against infinite loops).

### 5. Monitoring/logging disabled
- **Files:** `App.tsx:37-38`, `src/shared/logger.ts:166-171`
- `initMonitoring()` and `forwardToMonitoring` are commented out (“temporarily disable monitoring”), so Sentry never initializes and breadcrumbs aren’t recorded.
- **Impact:** No crash/perf telemetry; ErrorBoundary reports drop on the floor.
- **Fix:** Restore these calls (or gate them with env) once the original investigation ends.
