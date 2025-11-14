# MachineMate E2E Testing Guide

**Version:** 1.0
**Last Updated:** 2025-11-12
**Backend URL (Production):** https://machinemate-api-buz66rae7q-uc.a.run.app

## Overview

This document provides comprehensive end-to-end (E2E) testing procedures for the MachineMate mobile application, focusing on production readiness with the Cloud Run backend.

### Test Environment Setup

#### Prerequisites
- Two iOS/Android devices for cross-device sync testing
- Stable internet connection
- Ability to toggle network connectivity
- Terminal access for API testing (curl)
- Supabase account credentials

#### Configuration for Production Testing

Update `.env` for production testing:
```bash
APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://machinemate-api-buz66rae7q-uc.a.run.app
EXPO_PUBLIC_SUPABASE_URL=https://gemxkgkpkaombqkycegc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Restart Expo after changing environment:
```bash
npx expo start --clear
```

---

## Test Suite A: JWT Authentication Flow

### Overview
Tests the complete authentication lifecycle including token generation, storage, refresh, and validation.

### A1: User Sign-Up Flow

**Objective:** Verify new user registration and JWT token generation

**Steps:**
1. Open MachineMate app
2. Navigate to Sign Up screen
3. Enter test credentials:
   - Email: `test-user-$(date +%s)@machinemate.test`
   - Password: `TestPass123!`
4. Submit registration

**Expected Results:**
- [ ] Registration succeeds with 200 OK
- [ ] JWT access token received and stored in secure storage
- [ ] User redirected to home screen
- [ ] Session persists after app restart

**API Verification (curl):**
```bash
# Sign up via API
curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: <your-supabase-anon-key>" \
  -d '{
    "email": "test-user@machinemate.test",
    "password": "TestPass123!"
  }' | jq '.'

# Verify response contains:
# - access_token (JWT)
# - refresh_token
# - expires_in
# - user object with id and email
```

**Pass Criteria:**
- JWT token in response
- Token stored in device secure storage (expo-secure-store)
- Sentry user context set with user ID

---

### A2: User Login Flow

**Objective:** Verify existing user authentication

**Steps:**
1. If logged in, sign out first
2. Navigate to Login screen
3. Enter existing credentials
4. Submit login

**Expected Results:**
- [ ] Login succeeds
- [ ] New JWT access token received
- [ ] Session restored with user data
- [ ] Navigation to home screen

**API Verification:**
```bash
# Login via API
curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <your-supabase-anon-key>" \
  -d '{
    "email": "test-user@machinemate.test",
    "password": "TestPass123!"
  }' | jq '.'
```

---

### A3: Authenticated API Request

**Objective:** Verify JWT token is included in API requests

**Steps:**
1. Login to app
2. Navigate to Library tab (triggers favorites API call)
3. Monitor network traffic

**Expected Results:**
- [ ] API request includes `Authorization: Bearer <jwt-token>` header
- [ ] Backend accepts token and returns 200 OK
- [ ] No 401 Unauthorized errors

**API Verification:**
```bash
# Save token from login response
TOKEN="<your-jwt-token>"

# Test authenticated request
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: <your-supabase-anon-key>" | jq '.'

# Expected: 200 OK with favorites array
```

**Debugging:**
Check `apiClient.ts:apiRequest()` function - it should automatically fetch session token from Supabase and inject it.

---

### A4: Token Refresh on 401

**Objective:** Verify automatic token refresh when token expires

**Steps:**
1. Login to app
2. Manually expire token (or wait for expiration ~1 hour)
3. Trigger an API call (e.g., navigate to Library)

**Expected Results:**
- [ ] First request returns 401 Unauthorized
- [ ] App automatically requests new token via refresh token
- [ ] Original request retried with new token
- [ ] User not logged out

**Manual Token Expiration Test:**
```bash
# Use an expired or invalid token
EXPIRED_TOKEN="invalid.jwt.token"

curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -H "apikey: <your-supabase-anon-key>"

# Expected: 401 Unauthorized
# App should handle this by refreshing token
```

**Code Reference:**
- `src/services/api/apiClient.ts` - Token refresh logic in `apiRequest()` function
- `src/services/api/supabaseClient.ts` - Supabase session management

---

### A5: Logout Flow

**Objective:** Verify proper session cleanup on logout

**Steps:**
1. Login to app
2. Navigate to Settings tab
3. Tap "Sign Out"
4. Confirm logout

**Expected Results:**
- [ ] JWT token removed from secure storage
- [ ] User redirected to login screen
- [ ] Supabase session cleared
- [ ] Subsequent API calls fail with 401 (no token)
- [ ] Sentry user context cleared

**API Verification:**
```bash
# After logout, verify token is invalid
curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/auth/v1/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: <your-supabase-anon-key>"

# Expected: 204 No Content
```

---

## Test Suite B: Favorites Sync

### Overview
Tests favorites functionality including online/offline sync and cross-device synchronization.

### B1: Add Favorite (Online)

**Objective:** Add a favorite machine while online and verify backend sync

**Steps:**
1. Ensure device is online
2. Login to app
3. Navigate to Home tab
4. Identify a machine (or select from library)
5. Tap the star icon to favorite
6. Wait 1-2 seconds for sync

**Expected Results:**
- [ ] Star icon changes to filled state immediately (optimistic update)
- [ ] API POST request sent to `/api/v1/favorites`
- [ ] Success toast notification displayed
- [ ] Favorite persists in Library tab
- [ ] Favorite persists after app restart

**API Verification:**
```bash
# Get auth token first (from login)
TOKEN="<your-jwt-token>"

# Add favorite via API
curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"machine_id": "machine_123"}' | jq '.'

# Verify it was added
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Array containing {"machine_id": "machine_123", ...}
```

**Code Reference:**
- `src/features/library/hooks/useFavorites.ts:addFavorite()`
- `src/features/library/services/favoritesApi.ts:addFavorite()`

---

### B2: Remove Favorite (Online)

**Objective:** Remove a favorite while online

**Steps:**
1. With at least one favorite added
2. Tap the filled star icon to unfavorite
3. Confirm removal if prompted

**Expected Results:**
- [ ] Star icon changes to outline state immediately
- [ ] API DELETE request sent to `/api/v1/favorites/:machineId`
- [ ] Favorite removed from Library tab
- [ ] Change persists after app restart

**API Verification:**
```bash
# Remove favorite via API
curl -X DELETE https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites/machine_123 \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content

# Verify removal
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Array without machine_123
```

---

### B3: Add Favorite (Offline)

**Objective:** Add favorite while offline and verify sync when back online

**Steps:**
1. Turn on Airplane Mode or disable Wi-Fi
2. In the app, try to add a favorite
3. Observe behavior
4. Turn network back on
5. Wait for sync

**Expected Results:**
- [ ] Favorite added to local cache (AsyncStorage) immediately
- [ ] Star icon shows filled state
- [ ] Backend sync fails gracefully (no crash)
- [ ] When online: automatic sync attempt on next API call
- [ ] Favorite appears in Library tab offline
- [ ] After going online: favorite syncs to backend

**Verification:**
```bash
# Check AsyncStorage (requires React Native Debugger or adb)
# Key: @machinemate_favorites
# Value: ["machine_123", "machine_456"]
```

**Code Reference:**
- `src/features/library/hooks/useFavorites.ts` - Handles offline with try/catch
- `src/shared/hooks/useNetworkStatus.ts` - Network detection

---

### B4: Cross-Device Sync

**Objective:** Verify favorites sync across multiple devices

**Prerequisites:** Two devices with MachineMate installed

**Steps:**
1. **Device 1:** Login with test account
2. **Device 1:** Add favorites: machine_A, machine_B
3. **Device 1:** Wait for sync (check network tab)
4. **Device 2:** Login with same test account
5. **Device 2:** Navigate to Library tab
6. **Device 2:** Pull to refresh if favorites don't appear

**Expected Results:**
- [ ] Device 2 shows machine_A and machine_B in favorites
- [ ] Both devices have identical favorite lists
- [ ] Adding favorite on Device 2 appears on Device 1 after refresh
- [ ] Removing favorite on Device 1 removes from Device 2

**API Verification:**
```bash
# From any device/terminal, fetch favorites for user
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Same favorites list across all clients
```

---

### B5: Favorite Validation & Cleanup

**Objective:** Verify app handles invalid machine IDs gracefully

**Steps:**
1. Manually add invalid favorite via API:
   ```bash
   curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"machine_id": "INVALID_ID_12345"}'
   ```
2. Open app and navigate to Library
3. Observe error handling

**Expected Results:**
- [ ] Invalid favorites automatically removed from cache
- [ ] No app crash
- [ ] User not shown invalid machines
- [ ] Sentry logs validation error (if configured)

**Code Reference:**
- `src/features/library/hooks/useFavorites.ts` - Validation logic around line 80-100

---

## Test Suite C: History Tracking

### Overview
Tests recent history functionality including machine view tracking and sync.

### C1: Add Machine to History (Online)

**Objective:** View a machine and verify it's added to history

**Steps:**
1. Ensure online
2. Login to app
3. Identify a machine via camera or select from library
4. View machine details screen
5. Navigate to Library tab > History section

**Expected Results:**
- [ ] Machine appears at top of history list
- [ ] API POST request sent to `/api/v1/history`
- [ ] Timestamp shows "Just now"
- [ ] History limited to 10 items (oldest removed)
- [ ] Duplicate views update timestamp, don't create new entry

**API Verification:**
```bash
# Add to history
curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"machine_id": "machine_history_test"}' | jq '.'

# Fetch history
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Array with machine_history_test at index 0
```

**Code Reference:**
- `src/features/library/hooks/useRecentHistory.ts:addToHistory()`
- `src/features/library/services/historyApi.ts`

---

### C2: History Deduplication

**Objective:** Verify viewing same machine twice updates rather than duplicates

**Steps:**
1. View machine A (adds to history)
2. View machine B (adds to history)
3. View machine A again
4. Check history order

**Expected Results:**
- [ ] Machine A moves to top of history
- [ ] Machine A appears only once (no duplicate)
- [ ] Updated timestamp reflects latest view
- [ ] Machine B moves to second position

---

### C3: History Limit (10 items)

**Objective:** Verify history respects 10-item limit

**Steps:**
1. View 15 different machines sequentially
2. Navigate to Library > History
3. Count items

**Expected Results:**
- [ ] Only 10 most recent machines shown
- [ ] Oldest 5 machines automatically removed
- [ ] Backend storage also limited to 10 items

**API Verification:**
```bash
# Add 15 machines to history
for i in {1..15}; do
  curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"machine_id\": \"machine_$i\"}"
done

# Fetch history
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 10
```

---

### C4: History Sync Offline

**Objective:** Test history tracking while offline

**Steps:**
1. Go offline (Airplane Mode)
2. View 3 machines
3. Go back online
4. Navigate to Library > History

**Expected Results:**
- [ ] Machines added to local history cache while offline
- [ ] Fire-and-forget sync attempts don't crash app
- [ ] When online: history syncs to backend on next app open
- [ ] History persists across app restarts

**Note:** Unlike favorites, history uses "fire-and-forget" sync (no rollback on failure).

---

### C5: Clear History

**Objective:** Verify clear history functionality

**Steps:**
1. With history populated (5+ items)
2. Navigate to Library > History
3. Tap "Clear History" button
4. Confirm action

**Expected Results:**
- [ ] History list emptied immediately
- [ ] AsyncStorage cleared
- [ ] Backend history cleared via API call
- [ ] Empty state message displayed

**API Verification:**
```bash
# Verify history cleared
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: []
```

---

## Test Suite D: Machine Identification with JWT Auth

### Overview
Tests machine identification feature with authenticated requests.

### D1: Identify Machine via Camera

**Objective:** Capture photo and identify machine with JWT auth

**Steps:**
1. Login to app
2. Navigate to Home tab
3. Tap "Identify Machine" button
4. Grant camera permission if prompted
5. Point camera at gym machine
6. Capture photo
7. Wait for AI identification

**Expected Results:**
- [ ] Camera permission granted
- [ ] Photo captured successfully
- [ ] Photo uploaded to backend with JWT auth header
- [ ] AI identification returns machine data
- [ ] Result screen shows machine name, instructions, video
- [ ] Machine added to recent history automatically

**API Verification:**
```bash
# Simulate machine identification request
# Note: This requires a base64-encoded image

curl -X POST https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/identify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,<base64-image-data>",
    "timestamp": "2025-11-12T10:30:00Z"
  }' | jq '.'

# Expected response:
# {
#   "machine_id": "machine_123",
#   "name": "Leg Press",
#   "confidence": 0.95,
#   "instructions": "...",
#   "video_url": "..."
# }
```

**Code Reference:**
- `src/features/identification/hooks/useIdentifyMachine.ts`
- `src/features/identification/services/identifyMachine.ts`
- `src/features/identification/screens/CameraScreen.tsx`

---

### D2: Identify from Photo Library

**Objective:** Select existing photo for identification

**Steps:**
1. Login to app
2. Navigate to Camera screen
3. Tap "Choose from Library" button
4. Grant photo library permission if prompted
5. Select gym machine photo
6. Wait for identification

**Expected Results:**
- [ ] Photo library permission granted
- [ ] Selected photo displayed
- [ ] API request sent with JWT auth
- [ ] Identification results returned
- [ ] Same flow as camera capture

---

### D3: Identification Error Handling

**Objective:** Test error scenarios during identification

**Test Scenarios:**

**Scenario 1: Network Timeout**
1. Start identification
2. Disable network mid-request
3. Observe error handling

**Expected:**
- [ ] Timeout after 10 seconds (see `app.config.ts:apiTimeout`)
- [ ] Error message displayed to user
- [ ] Retry button shown
- [ ] No app crash

**Scenario 2: 401 Unauthorized**
1. Expire JWT token
2. Attempt identification
3. Observe token refresh

**Expected:**
- [ ] Automatic token refresh triggered
- [ ] Request retried with new token
- [ ] Identification succeeds

**Scenario 3: Machine Not Recognized**
1. Take photo of non-machine object
2. Wait for response

**Expected:**
- [ ] API returns 404 or low confidence score
- [ ] User-friendly error message: "Machine not recognized"
- [ ] Suggestion to retake photo

---

## Test Suite E: Offline/Online Scenarios

### Overview
Comprehensive offline mode testing across all features.

### E1: App Launch Offline

**Objective:** Verify app functions when launched without network

**Steps:**
1. Turn on Airplane Mode
2. Force quit MachineMate app
3. Relaunch app
4. Attempt to navigate app

**Expected Results:**
- [ ] App launches successfully (no crash)
- [ ] Cached session data loaded if previously logged in
- [ ] Library tab shows cached favorites and history
- [ ] Attempting new identification shows network error
- [ ] Graceful degradation with offline indicators

---

### E2: Online → Offline Transition

**Objective:** Test app behavior when losing connectivity mid-session

**Steps:**
1. Launch app online
2. Login and use app normally
3. Turn on Airplane Mode
4. Try various actions:
   - Add favorite
   - View machine details
   - Navigate tabs

**Expected Results:**
- [ ] App detects offline state (useNetworkStatus hook)
- [ ] Offline banner/indicator shown
- [ ] Local operations continue working (cached data)
- [ ] Network requests fail gracefully
- [ ] No app crashes or freezes

**Code Reference:**
- `src/shared/hooks/useNetworkStatus.ts` - Network detection
- `@react-native-community/netinfo` - Network monitoring

---

### E3: Offline → Online Transition (Sync)

**Objective:** Verify data syncs when reconnecting to network

**Steps:**
1. Go offline
2. Add 2 favorites (saved locally)
3. View 3 machines (history saved locally)
4. Go online
5. Pull to refresh Library tab

**Expected Results:**
- [ ] Offline favorites sync to backend
- [ ] History syncs to backend
- [ ] Backend data merged with local data
- [ ] No data loss
- [ ] Conflicts resolved (latest timestamp wins)

**Sync Verification:**
```bash
# After going back online, verify backend has offline changes
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" | jq '.'

curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/history \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

### E4: Airplane Mode Toggle Stress Test

**Objective:** Rapid connectivity changes

**Steps:**
1. Rapidly toggle Airplane Mode on/off 10 times
2. Simultaneously perform app actions (add favorites, view machines)
3. Monitor app stability

**Expected Results:**
- [ ] App handles rapid network changes gracefully
- [ ] No crashes or memory leaks
- [ ] UI responds appropriately to network state
- [ ] Data integrity maintained (no corruption)

---

## Test Suite F: Production Backend Integration

### Overview
Tests specific to Cloud Run production backend.

### F1: Health Check

**Objective:** Verify backend is running and healthy

```bash
curl https://machinemate-api-buz66rae7q-uc.a.run.app/health | jq '.'

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-12T10:30:00Z",
#   "version": "1.0.0"
# }
```

---

### F2: CORS Headers

**Objective:** Verify CORS configuration allows mobile app requests

```bash
curl -X OPTIONS https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# Expected headers in response:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Authorization, Content-Type, apikey
```

---

### F3: API Response Times

**Objective:** Ensure acceptable performance

**Benchmarks:**
- Health check: < 200ms
- Favorites GET: < 500ms
- History GET: < 500ms
- Machine identification: < 5s (AI processing)

```bash
# Test response times
time curl -w "@curl-format.txt" -o /dev/null -s \
  https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN"

# Create curl-format.txt:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#       time_redirect:  %{time_redirect}\n
#    time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#        time_total:  %{time_total}\n
```

---

### F4: Rate Limiting

**Objective:** Test API rate limits don't block normal usage

```bash
# Make 100 requests in rapid succession
for i in {1..100}; do
  curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
    -H "Authorization: Bearer $TOKEN" \
    -w "Request $i: %{http_code}\n" \
    -o /dev/null -s
done

# Expected: All return 200 OK (or configure rate limit if implemented)
```

---

### F5: Error Logging & Monitoring

**Objective:** Verify errors are logged to monitoring system

**Steps:**
1. Trigger intentional error (e.g., invalid API request)
2. Check Sentry dashboard
3. Verify error event captured

**Expected Results:**
- [ ] Error appears in Sentry with correct context
- [ ] User ID attached to error event
- [ ] Stack trace captured
- [ ] Device/OS info included

**Code Reference:**
- `src/shared/observability/monitoring.ts` - Sentry configuration
- `src/shared/logger.ts` - Structured logging

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Execution Report

**Date:** 2025-11-12
**Tester:** [Your Name]
**Environment:** Production (Cloud Run)
**App Version:** 1.0.0
**Devices Tested:** iPhone 15 Pro (iOS 17.2), Pixel 7 (Android 14)

### Test Suite A: JWT Authentication Flow
- [ ] A1: User Sign-Up Flow - PASS
- [ ] A2: User Login Flow - PASS
- [ ] A3: Authenticated API Request - PASS
- [ ] A4: Token Refresh on 401 - FAIL (see notes)
- [ ] A5: Logout Flow - PASS

**Notes:**
- A4 failed due to [describe issue]
- Workaround: [describe workaround]

### Test Suite B: Favorites Sync
- [ ] B1: Add Favorite (Online) - PASS
- [ ] B2: Remove Favorite (Online) - PASS
- [ ] B3: Add Favorite (Offline) - PASS
- [ ] B4: Cross-Device Sync - PASS
- [ ] B5: Favorite Validation & Cleanup - PASS

... (continue for all test suites)

### Summary
- **Total Tests:** 25
- **Passed:** 23
- **Failed:** 2
- **Blocked:** 0

### Critical Issues
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## Troubleshooting

### Issue: 401 Unauthorized on All Requests

**Possible Causes:**
1. JWT token not being sent in Authorization header
2. Token expired and refresh failing
3. Supabase credentials mismatch between app and backend

**Debug Steps:**
```bash
# Check token is valid
TOKEN="<your-token>"
curl https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN" \
  -v

# Verify Supabase config in .env matches backend
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY
```

**Solution:**
- Verify `apiClient.ts` is injecting Authorization header
- Check Supabase credentials in `.env`
- Ensure backend validates JWT with same Supabase project

---

### Issue: Favorites/History Not Syncing

**Possible Causes:**
1. Network request failing silently
2. Backend endpoint not responding
3. AsyncStorage cache corrupted

**Debug Steps:**
```bash
# Test backend directly
curl -X GET https://machinemate-api-buz66rae7q-uc.a.run.app/api/v1/favorites \
  -H "Authorization: Bearer $TOKEN"

# Check React Native Debugger Network tab
# Look for failed requests

# Clear AsyncStorage cache
# Settings > Developer Options > Clear AsyncStorage (if implemented)
```

---

### Issue: App Crashes on Offline Mode

**Possible Causes:**
1. Network error not caught in try/catch
2. AsyncStorage read/write failing
3. Null pointer exception on missing data

**Debug Steps:**
- Check Sentry error logs for stack trace
- Review `useFavorites.ts` and `useRecentHistory.ts` error handling
- Test AsyncStorage operations in isolation

**Code Reference:**
- All API calls should be wrapped in try/catch
- Fallback to cached data on network errors

---

## Appendix A: API Endpoints Reference

### Authentication Endpoints
- `POST /auth/v1/signup` - Register new user
- `POST /auth/v1/token?grant_type=password` - Login
- `POST /auth/v1/logout` - Logout
- `POST /auth/v1/token?grant_type=refresh_token` - Refresh token

### Favorites Endpoints
- `GET /api/v1/favorites` - Get all favorites
- `POST /api/v1/favorites` - Add favorite (body: `{machine_id}`)
- `DELETE /api/v1/favorites/:machineId` - Remove favorite

### History Endpoints
- `GET /api/v1/history` - Get recent history
- `POST /api/v1/history` - Add to history (body: `{machine_id}`)

### Machine Identification
- `POST /api/v1/identify` - Identify machine from image

### Health Check
- `GET /health` - Backend health status

---

## Appendix B: Environment Configuration

### Development
```bash
APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:8000
```

### Production (Cloud Run)
```bash
APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://machinemate-api-buz66rae7q-uc.a.run.app
```

### Switching Between Environments
1. Update `.env` file
2. Clear Expo cache: `npx expo start --clear`
3. Rebuild app if necessary (for EAS builds)

---

## Appendix C: Known Limitations

1. **Token Refresh:** Automatic refresh only triggers on 401 response (not proactively before expiration)
2. **Offline Sync:** Fire-and-forget for history (no retry queue)
3. **Rate Limiting:** Not currently implemented on backend
4. **Image Size:** Max 10MB for machine identification images
5. **History Limit:** Hard limit of 10 items per user

---

## Next Steps

After completing all test suites:

1. **Document Results:** Fill out Test Results Template
2. **Report Issues:** Create GitHub issues for any failures
3. **Performance Audit:** Run Lighthouse audit on web views
4. **Security Review:** Audit JWT handling and secure storage
5. **User Acceptance Testing:** Beta test with real users
6. **App Store Submission:** Prepare for iOS/Android release

---

**Document Owner:** MachineMate Engineering Team
**Last Review:** 2025-11-12
**Next Review:** 2025-12-12
