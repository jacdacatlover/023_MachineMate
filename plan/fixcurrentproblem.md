## Remediation Plan

### 1. Supabase client fails when env vars absent
1. Teach `supabaseClient.ts` to read defaults from `Constants.expoConfig?.extra` and only throw when neither runtime env nor Expo extra provides values.
2. Defer client creation until first use (export factory or lazy getter) so Jest can mock it without touching SecureStore.
3. Add test-only fallbacks (e.g., honor `process.env.TEST_SUPABASE_*`) and document in README/test setup.
4. Verify `npm test`, `npm run lint`, and Metro start with no `.env` present.

### 2. Screens bypass API hooks
1. Introduce a shared `FavoritesContext`/`HistoryContext` built atop `useFavorites`/`useRecentHistory` (or export hooks directly).
2. Refactor Home, Library, MachineDetail, MachineResult, and Settings screens to consume the hooks/context instead of `favoritesStorage`/`historyStorage`.
3. Remove redundant direct AsyncStorage calls and ensure components handle loading/error states from hooks.
4. Smoke-test flows (favorites toggle, recent history) to confirm Supabase sync occurs.

### 3. Clear flows ignore backend
1. Add DELETE endpoints (or bulk clear RPC) to backend favorites/history routers plus client helpers in `favoritesApi`/`historyApi`.
2. Update `useFavorites.clearFavorites` and `useRecentHistory.clearHistory` to call the new endpoints before clearing cache.
3. Wire Settings screen buttons to the hooks so UI clears both server and local data.
4. Extend backend tests covering new endpoints and add Jest tests verifying hook behavior on success/failure.

### 4. Sanitized data not persisted
1. In `useFavorites`/`useRecentHistory`, when detecting invalid IDs, call `setData` with filtered lists (guard with ref to avoid infinite loops or run inside `useEffect` watching `rawFavorites/rawHistory`).
2. Consider a dedicated `cleanupInvalidEntries` helper to keep logic DRY and ensure AsyncStorage is updated once per load.
3. Add unit tests asserting corrupted entries are removed from storage (mock AsyncStorage writes).

### 5. Monitoring/logging disabled
1. Re-enable `initMonitoring()` in `App.tsx`, but guard it with a env flag (e.g., skip in tests) if needed.
2. Restore `forwardToMonitoring` calls in logger; add try/catch around monitoring init if necessary.
3. Confirm Sentry DSN is sourced from env/expo extras and provide docs on enabling/disabling in dev/test.
4. Manually validate by triggering a boundary error in dev and checking Sentry/log output.
