# MachineMate Release Process

This document outlines the complete release process for deploying MachineMate to the App Store and Google Play Store.

## Table of Contents

- [Pre-Release Checklist](#pre-release-checklist)
- [Version Management](#version-management)
- [Building](#building)
- [Testing](#testing)
- [Deployment](#deployment)
- [Post-Release](#post-release)
- [Rollback Plan](#rollback-plan)

## Pre-Release Checklist

### Code Quality

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors or warnings in production build
- [ ] All features tested on both iOS and Android
- [ ] Performance tested on mid-tier devices

### Content & Assets

- [ ] App icon updated and optimized (1024x1024)
- [ ] Splash screen updated
- [ ] All images optimized (compressed)
- [ ] Machine catalog data validated
- [ ] Privacy policy updated (if needed)
- [ ] Terms of service updated (if needed)

### Configuration

- [ ] App version incremented in `app.json` or `app.config.ts`
- [ ] iOS build number incremented
- [ ] Android version code incremented
- [ ] Environment variables set correctly for production
- [ ] API endpoints pointing to production
- [ ] Analytics/crash reporting enabled for production
- [ ] Bundle identifiers correct for production

### Documentation

- [ ] CHANGELOG.md updated with release notes
- [ ] README.md updated if needed
- [ ] API documentation updated if endpoints changed
- [ ] User-facing documentation updated

## Version Management

### Semantic Versioning

MachineMate uses semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, major feature updates
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, small improvements

### Version Updates

**app.json/app.config.ts:**
```json
{
  "version": "1.0.0",  // Update this
  "ios": {
    "buildNumber": "1"  // Increment for each iOS build
  },
  "android": {
    "versionCode": 1  // Increment for each Android build
  }
}
```

**Example progression:**
- Initial release: `1.0.0` (iOS: 1, Android: 1)
- Bug fix: `1.0.1` (iOS: 2, Android: 2)
- New feature: `1.1.0` (iOS: 3, Android: 3)
- Major update: `2.0.0` (iOS: 4, Android: 4)

## Building

### Environment Setup

1. **Set environment:**
   ```bash
   export APP_ENV=production
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run quality checks:**
   ```bash
   npm run lint
   npm run type-check
   npm test
   ```

### EAS Build (Recommended)

**Prerequisites:**
- EAS CLI installed: `npm install -g eas-cli`
- Logged in to Expo: `eas login`
- Project configured: `eas build:configure`

**Build for iOS:**
```bash
eas build --platform ios --profile production
```

**Build for Android:**
```bash
eas build --platform android --profile production
```

**Build for both platforms:**
```bash
eas build --platform all --profile production
```

### Local Build (Alternative)

**iOS (requires macOS and Xcode):**
```bash
npx expo prebuild --platform ios
cd ios && pod install && cd ..
npx expo run:ios --configuration Release
```

**Android:**
```bash
npx expo prebuild --platform android
npx expo run:android --variant release
```

## Testing

### Pre-Release Testing

1. **Internal Testing:**
   - Test on physical devices (iOS and Android)
   - Test all critical user flows:
     - Camera capture and machine identification
     - Library browsing and search
     - Favorites management
     - Settings and data clearing
   - Test offline scenarios
   - Test permission flows
   - Test error states

2. **TestFlight (iOS):**
   ```bash
   eas submit --platform ios --profile preview
   ```
   - Add internal testers
   - Collect feedback
   - Fix critical issues

3. **Internal Testing (Android):**
   ```bash
   eas submit --platform android --profile preview
   ```
   - Use internal testing track
   - Add testers via email
   - Monitor crash reports

### Manual QA Scenarios

**Critical Flows:**
- [ ] New user onboarding (first launch)
- [ ] Camera permission flow
- [ ] Photo permission flow
- [ ] Take photo and identify machine
- [ ] Upload photo from library
- [ ] View machine details
- [ ] Add/remove favorites
- [ ] Browse library and search
- [ ] Filter by category
- [ ] Clear data from settings
- [ ] App state restoration (force quit and reopen)
- [ ] Network error handling
- [ ] Low confidence identification handling

**Platform-Specific:**
- [ ] iOS: Dark mode toggle
- [ ] iOS: iPad layout
- [ ] Android: Back button navigation
- [ ] Android: Different screen sizes
- [ ] Android: Different Android versions (10, 11, 12, 13+)

## Deployment

### App Store (iOS)

1. **Build and Submit:**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

2. **App Store Connect:**
   - Log in to [App Store Connect](https://appstoreconnect.apple.com)
   - Select your app
   - Navigate to "TestFlight" or "App Store"
   - Fill in metadata:
     - App name
     - Subtitle
     - Description
     - Keywords
     - Screenshots (required sizes)
     - Privacy policy URL
     - Support URL
     - Category
     - Age rating
   - Submit for review

3. **Review Process:**
   - Average review time: 1-3 days
   - Respond to any questions from Apple
   - Monitor status in App Store Connect

### Google Play Store (Android)

1. **Build and Submit:**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

2. **Google Play Console:**
   - Log in to [Google Play Console](https://play.google.com/console)
   - Select your app
   - Create a new release in "Production" track
   - Upload APK/AAB
   - Fill in release notes
   - Complete store listing:
     - App name
     - Short description
     - Full description
     - Screenshots (phone, tablet, optionally 7-inch tablet)
     - Feature graphic
     - Privacy policy URL
     - Category
     - Content rating
   - Submit for review

3. **Review Process:**
   - Average review time: 1-7 days
   - Monitor for any policy violations
   - Respond to user reviews

## Post-Release

### Monitoring

#### Cloud Monitoring Dashboards

**Primary Dashboard:**
- URL: `https://console.cloud.google.com/monitoring/dashboards/custom/[DASHBOARD_ID]`
- Location: Created from `docs/infrastructure/monitoring-dashboards.json`
- Refresh: Real-time (auto-refresh every 1 minute)

**Key Metrics to Monitor:**

1. **Request Success Rate (SLO: 99.5%)**
   - Green: ≥99.5% success rate
   - Yellow: 99.0-99.5%
   - Red: <99.0%
   - Alert threshold: <99% (5-minute window)

2. **P95 Response Latency (Target: <500ms)**
   - Green: <500ms
   - Yellow: 500-1000ms
   - Red: >1000ms
   - Alert threshold: >500ms (5-minute window)

3. **Error Rate (Target: <1%)**
   - Track 4xx and 5xx errors separately
   - Alert on spike: >5% error rate

4. **Cold Start Performance (Target: <3s)**
   - Mobile app initialization time
   - Track P95 cold start duration
   - Alert if >5s consistently

5. **Resource Utilization**
   - CPU: Alert if >80% for 10 minutes
   - Memory: Alert if >85% for 5 minutes
   - Database connections: Alert if >80% pool utilization

#### Alert Channels

**Alert Policies:** Configured in `docs/infrastructure/alert-policies.json`

1. **High Error Rate Alert**
   - Trigger: >5% error rate for 5 minutes
   - Channel: Email + PagerDuty (if configured)
   - Runbook: See [High Error Rate Runbook](#high-error-rate-runbook)

2. **High Latency Alert**
   - Trigger: P95 latency >500ms for 5 minutes
   - Channel: Email
   - Runbook: See [High Latency Runbook](#high-latency-runbook)

3. **SLO Burn Rate Alert**
   - Trigger: Fast burn rate threatens monthly SLO
   - Channel: Email + Slack
   - Runbook: See [SLO Violation Response](#slo-violation-response)

4. **Database Pool Exhaustion**
   - Trigger: >80% pool utilization for 5 minutes
   - Channel: Email
   - Runbook: See [Database Issues](#database-issues-runbook)

5. **Memory Usage Alert**
   - Trigger: >85% memory for 5 minutes
   - Channel: Email
   - Runbook: See [High Memory Usage](#high-memory-usage-runbook)

6. **Cold Start Alert**
   - Trigger: P95 >5s for 10 minutes
   - Channel: Email
   - Runbook: See [Slow Cold Start](#slow-cold-start-runbook)

7. **VLM API Errors**
   - Trigger: >50% error rate to Vertex AI
   - Channel: Email (immediate)
   - Runbook: See [VLM API Issues](#vlm-api-issues-runbook)

#### Sentry Error Tracking

1. **Mobile App Crashes:**
   - Dashboard: `https://sentry.io/organizations/[ORG]/issues/?project=[PROJECT]`
   - Monitor for:
     - Unhandled exceptions
     - ANR (Application Not Responding)
     - JavaScript errors
   - Priority: Fix crashes affecting >1% of users
   - Response time: <24 hours for critical crashes

2. **Backend Errors:**
   - Dashboard: Sentry backend project
   - Monitor for:
     - 5xx errors
     - Database connection failures
     - VLM API failures
   - Priority: Fix errors affecting >5% of requests

3. **Performance Tracking:**
   - View Sentry breadcrumbs for performance events
   - Track cold start timing in error reports
   - Monitor navigation transitions

#### Cloud Logging

**Log Explorer Queries:**

1. **Backend Errors:**
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="machinemate-backend"
   severity>=ERROR
   ```

2. **Slow Requests:**
   ```
   resource.type="cloud_run_revision"
   jsonPayload.duration_ms>1000
   ```

3. **VLM API Calls:**
   ```
   jsonPayload.logger="vlm_client"
   ```

4. **Authentication Failures:**
   ```
   jsonPayload.logger="auth"
   jsonPayload.level="ERROR"
   ```

#### Daily Monitoring Checklist

**Every Morning (5 minutes):**
- [ ] Check Cloud Monitoring dashboard - any red indicators?
- [ ] Check Sentry - any new crash clusters?
- [ ] Review overnight alerts - any incidents?
- [ ] Verify SLO status - on track for 99.5%?

**Weekly Review (30 minutes):**
- [ ] Analyze error trends - any patterns?
- [ ] Review slow queries - optimization needed?
- [ ] Check performance metrics - degradation?
- [ ] Review user feedback - recurring issues?
- [ ] Update alert thresholds if needed

### OTA Updates (Over-The-Air)

For non-native code changes (JS, assets):

```bash
eas update --branch production --message "Fix: machine data typo"
```

**OTA Update Guidelines:**
- Use for bug fixes and small improvements
- Do NOT use for:
  - Native code changes
  - Permission changes
  - Breaking changes
- Test updates thoroughly before pushing
- Monitor update adoption rate

### Hotfix Process

For critical bugs in production requiring immediate deployment.

#### When to Issue a Hotfix

**Critical Issues (Deploy ASAP):**
- App crashes on launch affecting >5% of users
- Critical feature completely broken (camera, identification)
- Data loss or corruption
- Security vulnerability
- Backend API down or returning errors for all users

**Non-Critical Issues (Wait for regular release):**
- Minor UI glitches
- Non-essential feature bugs
- Performance improvements
- Content updates

#### Mobile App Hotfix (JS/Assets Only)

**For JavaScript/asset changes (no native code changes):**

1. **Create hotfix branch:**
   ```bash
   git checkout -b hotfix/mobile-1.0.1 main
   ```

2. **Fix the bug:**
   - Make minimal changes to fix the issue
   - Avoid scope creep - only fix the critical bug
   - Add tests to prevent regression

3. **Test thoroughly:**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```
   - Test on physical device (iOS and Android)
   - Verify the fix works
   - Ensure no new issues introduced

4. **Create OTA update:**
   ```bash
   # Update version in app.config.ts (patch version)
   eas update --branch production --message "Hotfix: [brief description]"
   ```

5. **Monitor deployment:**
   - Check EAS dashboard for rollout progress
   - Monitor Sentry for new errors
   - Verify fix reaches users (check version in logs)

6. **Merge back to main:**
   ```bash
   git checkout main
   git merge hotfix/mobile-1.0.1
   git push
   ```

**Expected Timeline:** 30-60 minutes from fix to user devices

#### Mobile App Hotfix (Native Code Changes)

**For native code changes or breaking changes:**

1. **Create hotfix branch:**
   ```bash
   git checkout -b hotfix/mobile-native-1.0.1 main
   ```

2. **Fix and test:**
   - Make minimal changes
   - Test on physical devices (both platforms)
   - Run full test suite

3. **Update version:**
   - Increment patch version in `app.config.ts`
   - Increment iOS buildNumber
   - Increment Android versionCode

4. **Build and submit:**
   ```bash
   eas build --platform all --profile production
   eas submit --platform all
   ```

5. **Request expedited review (if critical):**
   - iOS: Use "Expedited Review" in App Store Connect
   - Android: Request urgent publication in Play Console

6. **Monitor and merge:**
   - Monitor app store approval status
   - Merge back to main after approval
   - Continue monitoring post-release

**Expected Timeline:** 1-3 days (app store review time)

#### Backend Hotfix

**For critical backend issues:**

1. **Identify the issue:**
   ```bash
   # Check recent logs
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
     --project machinemate-prod \
     --limit 50 \
     --format json
   ```

2. **Create hotfix branch:**
   ```bash
   cd backend
   git checkout -b hotfix/backend-v1.0.1 main
   ```

3. **Fix the bug:**
   - Make minimal changes
   - Add tests for the fix
   - Update version in appropriate files

4. **Test locally:**
   ```bash
   # Run tests
   pytest tests/ -v

   # Start server locally
   uvicorn app.main:app --reload

   # Test the specific endpoint/functionality
   curl http://localhost:8000/health
   ```

5. **Build and deploy:**
   ```bash
   # Build Docker image
   docker build -t gcr.io/machinemate-prod/backend:v1.0.1-hotfix .

   # Push to GCR
   docker push gcr.io/machinemate-prod/backend:v1.0.1-hotfix

   # Deploy to Cloud Run
   gcloud run deploy machinemate-backend \
     --image gcr.io/machinemate-prod/backend:v1.0.1-hotfix \
     --region us-central1 \
     --project machinemate-prod
   ```

6. **Verify deployment:**
   ```bash
   # Check health endpoint
   curl https://[CLOUD_RUN_URL]/health

   # Check logs
   gcloud logging read "resource.type=cloud_run_revision" \
     --project machinemate-prod \
     --limit 20

   # Monitor for errors (5 minutes)
   ```

7. **Monitor key metrics:**
   - Check Cloud Monitoring dashboard
   - Verify error rate returned to normal
   - Check response latency
   - Monitor for any new errors

8. **Merge back to main:**
   ```bash
   git checkout main
   git merge hotfix/backend-v1.0.1
   git push
   ```

**Expected Timeline:** 15-30 minutes from fix to production

#### Coordinated Hotfix (Backend + Mobile)

**When both backend and mobile need fixes:**

1. **Assess backward compatibility:**
   - Can backend fix be deployed independently?
   - Can mobile fix work with old backend?
   - Are breaking changes required?

2. **Deploy in order:**
   ```
   Step 1: Deploy backend fix (15-30 min)
   Step 2: Verify backend working
   Step 3: Deploy mobile OTA update (30-60 min)
   Step 4: Monitor both systems
   ```

3. **If breaking changes required:**
   - Deploy backend with backward compatibility if possible
   - Add feature flag to gradually enable new behavior
   - Deploy mobile update
   - Remove backward compatibility code in next release

#### Hotfix Testing Checklist

Before deploying ANY hotfix:

**Backend:**
- [ ] All tests pass (`pytest`)
- [ ] Health endpoint returns 200
- [ ] Critical endpoints manually tested
- [ ] No new errors in logs after deployment
- [ ] Monitoring shows normal metrics

**Mobile:**
- [ ] Tests pass (`npm test`)
- [ ] Type checking passes
- [ ] Tested on physical device (iOS)
- [ ] Tested on physical device (Android)
- [ ] No console errors
- [ ] Critical user flows work (camera, identification)

**Both:**
- [ ] Fix verified to resolve the issue
- [ ] No new issues introduced
- [ ] Monitoring dashboard green
- [ ] Error rate normal
- [ ] Users can access the app

#### Post-Hotfix Actions

1. **Document the incident:**
   - What was the issue?
   - What was the root cause?
   - What was the fix?
   - How long were users affected?
   - File: `docs/operations/incidents/[DATE]-[ISSUE].md`

2. **Post-mortem (for major incidents):**
   - Schedule team review (within 48 hours)
   - Identify process improvements
   - Update monitoring/alerts to catch similar issues
   - Add tests to prevent regression

3. **Communication:**
   - Update status page (if applicable)
   - Respond to affected users
   - Internal team notification

## Rollback Plan

### When to Rollback

**Immediate Rollback Required:**
- Critical crashes affecting >10% of users
- Data loss or corruption
- Complete feature failure (app unusable)
- Security vulnerability exposed
- Backend errors affecting all requests

**Monitor and Hotfix Instead:**
- Issues affecting <5% of users
- Non-critical feature bugs
- Performance degradation (but app functional)
- UI issues

### Mobile App Rollback (OTA)

**For JavaScript/asset updates deployed via EAS:**

1. **Identify the problematic update:**
   ```bash
   # List recent updates
   eas update:list --branch production
   ```

2. **Find the last known good update:**
   - Note the update group ID of the previous stable version
   - Verify the timestamp matches pre-issue deployment

3. **Rollback to previous version:**
   ```bash
   # Republish the previous good update
   eas update:republish --branch production --group [PREVIOUS-GROUP-ID]
   ```

4. **Verify rollback:**
   ```bash
   # Check current update
   eas update:view --branch production

   # Verify users are receiving rolled-back version
   # Check Sentry - errors should decrease
   ```

5. **Monitor for 15-30 minutes:**
   - Check Sentry error rate
   - Monitor Cloud Logging for mobile errors
   - Verify user reports stop coming in
   - Check that new app opens receive old version

6. **Communicate:**
   - Notify team of rollback
   - Document what went wrong
   - Plan hotfix to address the issue

**Expected Timeline:** 5-10 minutes from decision to rollback completion

**Limitations:**
- Only works for OTA updates (JS/assets)
- Users must open app to receive rollback
- May take hours for all users to get rollback

### Mobile App Rollback (App Store)

**For native builds submitted to app stores:**

#### iOS (App Store)

**Important:** Apple does not allow rolling back published versions.

**Options:**

1. **Submit emergency hotfix (PREFERRED):**
   ```bash
   # Build fixed version
   eas build --platform ios --profile production

   # Submit to App Store
   eas submit --platform ios
   ```

   - Request "Expedited Review" in App Store Connect
   - Explain the critical nature in review notes
   - Expected approval: 1-24 hours (vs 1-3 days normally)
   - Limited expedited reviews available per year

2. **Remove app from sale (LAST RESORT):**
   - Log in to App Store Connect
   - Go to Pricing and Availability
   - Remove from sale in all territories
   - Prevents new downloads (existing users keep broken version)
   - Only for extreme cases (security, legal)

#### Android (Google Play)

**Android allows more flexible rollback options:**

1. **Promote previous version (RECOMMENDED):**
   ```bash
   # Via Google Play Console:
   # 1. Go to Release > Production
   # 2. Find previous working release
   # 3. Click "Promote to Production"
   # 4. Confirm rollout percentage (100% for immediate)
   ```

2. **Halt current rollout:**
   - If gradual rollout in progress:
     - Pause the rollout immediately
     - Prevents more users from getting bad version
     - Previous version continues for non-upgraded users

3. **Via gcloud CLI:**
   ```bash
   # List recent releases
   gcloud alpha app releases list --track production

   # Promote specific release
   gcloud alpha app releases promote \
     --track production \
     --version-code [PREVIOUS_VERSION_CODE]
   ```

**Expected Timeline:**
- Halt rollout: Immediate
- Full rollback: 2-4 hours for all users

### Backend Rollback (Cloud Run)

**For backend API issues:**

1. **Identify the issue:**
   ```bash
   # Check current revision
   gcloud run revisions list \
     --service machinemate-backend \
     --region us-central1 \
     --project machinemate-prod

   # View recent error logs
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
     --project machinemate-prod \
     --limit 50
   ```

2. **Find last known good revision:**
   ```bash
   # List revisions with traffic allocation
   gcloud run services describe machinemate-backend \
     --region us-central1 \
     --project machinemate-prod \
     --format="value(status.traffic)"
   ```

3. **Rollback to previous revision:**
   ```bash
   # Get previous revision name
   PREVIOUS_REVISION=$(gcloud run revisions list \
     --service machinemate-backend \
     --region us-central1 \
     --project machinemate-prod \
     --format="value(name)" \
     --limit 2 | tail -n 1)

   # Route 100% traffic to previous revision
   gcloud run services update-traffic machinemate-backend \
     --to-revisions=$PREVIOUS_REVISION=100 \
     --region us-central1 \
     --project machinemate-prod
   ```

4. **Verify rollback:**
   ```bash
   # Check health endpoint
   curl https://[CLOUD_RUN_URL]/health

   # Monitor logs for errors
   gcloud logging tail "resource.type=cloud_run_revision" \
     --project machinemate-prod

   # Check monitoring dashboard
   # - Error rate should decrease
   # - Latency should normalize
   # - Request success rate should improve
   ```

5. **Monitor for 10 minutes:**
   - Watch Cloud Monitoring dashboard
   - Verify error rate returns to baseline
   - Check Sentry for backend errors
   - Test critical endpoints manually

**Expected Timeline:** 2-5 minutes from decision to rollback completion

**Advanced: Canary Rollback**

If you want to test rollback cautiously:

```bash
# Route 10% traffic to old revision, 90% to new
gcloud run services update-traffic machinemate-backend \
  --to-revisions=$NEW_REVISION=90,$OLD_REVISION=10 \
  --region us-central1 \
  --project machinemate-prod

# Monitor for 5-10 minutes
# If old revision shows better metrics, route more traffic

# Full rollback
gcloud run services update-traffic machinemate-backend \
  --to-revisions=$OLD_REVISION=100 \
  --region us-central1 \
  --project machinemate-prod
```

### Database Rollback

**WARNING:** Database rollbacks are risky and should be last resort.

#### Supabase Migrations

1. **Assess the damage:**
   ```bash
   # Check migration status
   supabase migration list --remote

   # Review what changed
   supabase db diff
   ```

2. **Create rollback migration (PREFERRED):**
   ```bash
   # Create new migration to undo changes
   supabase migration new rollback_bad_migration

   # Edit migration to reverse changes
   # For example, if migration added column:
   # ALTER TABLE machines DROP COLUMN new_column;

   # Apply rollback migration
   supabase db push
   ```

3. **Restore from backup (LAST RESORT):**
   - Log in to Supabase dashboard
   - Go to Database > Backups
   - Select backup from before the issue
   - Click "Restore"
   - **WARNING:** All data since backup will be lost
   - Only for catastrophic failures

**Expected Timeline:**
- Rollback migration: 5-10 minutes
- Backup restore: 10-30 minutes + data loss

### Coordinated Rollback (Backend + Mobile)

**When both need to be rolled back:**

1. **Assess dependencies:**
   - Can backend be rolled back independently?
   - Does old mobile version work with old backend?
   - Are there breaking API changes?

2. **Rollback order:**
   ```
   Step 1: Rollback backend first (2-5 min)
   Step 2: Verify backend is stable
   Step 3: Rollback mobile OTA (5-10 min)
   Step 4: Monitor both systems (15-30 min)
   ```

3. **If breaking changes exist:**
   - Keep backend on new version with backward compatibility
   - Only rollback mobile
   - Or vice versa - depends on which is more stable

### Post-Rollback Actions

1. **Immediate (within 1 hour):**
   - [ ] Verify rollback successful
   - [ ] Monitor all metrics return to baseline
   - [ ] Document what happened
   - [ ] Notify stakeholders
   - [ ] Update team on status

2. **Within 24 hours:**
   - [ ] Root cause analysis
   - [ ] Create fix in hotfix branch
   - [ ] Test fix thoroughly
   - [ ] Plan re-deployment

3. **Within 48 hours:**
   - [ ] Post-mortem meeting
   - [ ] Document lessons learned
   - [ ] Update processes to prevent recurrence
   - [ ] Improve monitoring/alerts
   - [ ] Update this runbook if needed

### Rollback Communication Template

**Internal (Slack/Email):**
```
🚨 PRODUCTION ROLLBACK IN PROGRESS

Component: [Backend/Mobile/Both]
Issue: [Brief description]
Impact: [% of users affected]
Action: Rolling back to [previous version]
ETA: [Expected completion time]
On-call: [Name]
Status: [In Progress/Complete]
```

**User-facing (if needed):**
```
We're aware of an issue affecting [feature] and are working on a fix.
The issue has been resolved and service is restored.
We apologize for any inconvenience.
```

### Rollback Decision Matrix

| Severity | Users Affected | Action | Timeline |
|----------|----------------|--------|----------|
| Critical | >10% | Immediate rollback | <15 min |
| High | 5-10% | Rollback after quick assessment | <30 min |
| Medium | 1-5% | Monitor, prepare rollback | <1 hour |
| Low | <1% | Hotfix instead | Next release |

### Emergency Contacts

**On-Call Rotation:**
- Primary: [Name/Email/Phone]
- Secondary: [Name/Email/Phone]
- Escalation: [Name/Email/Phone]

**Platform Contacts:**
- Google Cloud Support: [Project support page]
- Supabase Support: support@supabase.io
- Expo/EAS Support: https://expo.dev/contact

**Critical Services:**
- Cloud Run: `gcloud` CLI access required
- Supabase: Dashboard admin access required
- EAS: Expo account admin access required

## Alert Response Runbooks

These runbooks provide step-by-step procedures for responding to monitoring alerts. Each runbook corresponds to an alert policy defined in `docs/infrastructure/alert-policies.json`.

### High Error Rate Runbook

**Alert:** Error rate >5% for 5 minutes

**Severity:** High

**Steps:**

1. **Assess the scope (2 minutes):**
   ```bash
   # Check Cloud Monitoring dashboard
   # Identify: When did errors start? Which endpoints?

   # Query recent errors
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" \
     --project machinemate-prod \
     --limit 100 \
     --format json > recent_errors.json
   ```

2. **Identify the cause (3-5 minutes):**
   - Check Sentry for error patterns
   - Look for common error messages
   - Check if related to recent deployment
   - Review error logs for stack traces

3. **Common causes and fixes:**

   **Database connection issues:**
   ```bash
   # Check database health
   # Check connection pool utilization
   # May need to scale database or adjust pool settings
   ```

   **VLM API failures:**
   ```bash
   # Check Vertex AI status
   # Verify API quotas not exceeded
   # Check for rate limiting
   ```

   **Recent deployment issue:**
   ```bash
   # Rollback to previous revision (see Rollback Plan)
   # Expected timeline: 2-5 minutes
   ```

4. **If errors persist:**
   - Escalate to on-call engineer
   - Prepare incident report
   - Consider rollback

### High Latency Runbook

**Alert:** P95 latency >500ms for 5 minutes

**Severity:** Medium

**Steps:**

1. **Check current latency (1 minute):**
   ```bash
   # View Cloud Monitoring dashboard
   # Check which percentiles are affected (P50, P95, P99)
   ```

2. **Identify slow endpoints (3 minutes):**
   ```bash
   # Query slow requests
   gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.duration_ms>1000" \
     --project machinemate-prod \
     --limit 50
   ```

3. **Common causes:**

   **Database slow queries:**
   - Check Supabase dashboard for slow queries
   - Consider adding indexes
   - Review query performance in logs

   **VLM API latency:**
   - Check Vertex AI response times in logs
   - May be temporary - monitor for recovery
   - Consider implementing caching

   **High traffic:**
   - Check request volume in dashboard
   - Verify Cloud Run has scaled appropriately
   - Check CPU/memory utilization

4. **Immediate actions:**
   - If caused by specific query: optimize or cache
   - If caused by traffic: verify auto-scaling working
   - If persistent: plan optimization work

### SLO Violation Response

**Alert:** SLO burn rate indicates monthly target at risk

**Severity:** High

**Steps:**

1. **Check SLO status:**
   - View Cloud Monitoring SLO dashboard
   - Check error budget remaining
   - Identify which SLI is violating (availability or latency)

2. **Calculate impact:**
   - How much error budget remains?
   - At current burn rate, when will budget exhaust?
   - How many users affected?

3. **Immediate actions:**
   - Stop any non-critical deployments
   - Review recent changes that may have degraded performance
   - Increase monitoring frequency

4. **Recovery plan:**
   - Identify and fix root cause
   - Consider rollback if recent deployment caused issue
   - Update alert thresholds if SLO targets unrealistic

### Database Issues Runbook

**Alert:** Database connection pool >80% utilization

**Severity:** High

**Steps:**

1. **Check pool status:**
   ```bash
   # Check current connections in Supabase dashboard
   # Review connection pool configuration
   ```

2. **Immediate mitigation:**
   ```bash
   # Check for connection leaks in logs
   # Look for long-running queries
   # Identify endpoints with poor connection management
   ```

3. **Short-term fixes:**
   - Restart backend if connection leak suspected
   - Kill long-running queries if identified
   - Increase pool size temporarily if needed

4. **Long-term fixes:**
   - Review connection management in code
   - Add connection pooling metrics
   - Consider connection pool size optimization

### High Memory Usage Runbook

**Alert:** Memory usage >85% for 5 minutes

**Severity:** Medium

**Steps:**

1. **Check current memory:**
   ```bash
   # View Cloud Monitoring dashboard
   # Check memory trend over time
   ```

2. **Identify cause:**
   - Recent traffic increase?
   - Memory leak in application?
   - Increased data in memory (cache, etc.)?

3. **Immediate actions:**
   ```bash
   # Check if about to hit OOM
   # If critical, restart service
   gcloud run services update machinemate-backend \
     --region us-central1 \
     --project machinemate-prod \
     --clear-labels
   # (Triggers rolling restart)
   ```

4. **Long-term fixes:**
   - Profile memory usage
   - Optimize caching strategies
   - Consider increasing memory allocation
   - Fix memory leaks if identified

### Slow Cold Start Runbook

**Alert:** Mobile app cold start P95 >5s for 10 minutes

**Severity:** Medium

**Steps:**

1. **Check performance metrics:**
   - Review performance profiling data
   - Check Sentry breadcrumbs for timing
   - Identify which phase is slow (font loading, data fetch, etc.)

2. **Common causes:**
   - Large bundle size
   - Slow font loading
   - Backend API latency during startup
   - Device issues (low-end devices, low memory)

3. **Investigation:**
   ```bash
   # Check bundle size
   npm run analyze-bundle

   # Review cold start performance marks
   # Check backend /machines endpoint latency
   ```

4. **Fixes:**
   - Optimize bundle (code splitting, tree shaking)
   - Optimize font loading
   - Add skeleton screens to improve perceived performance
   - Consider lazy loading non-critical features

### VLM API Issues Runbook

**Alert:** >50% error rate to Vertex AI

**Severity:** Critical

**Steps:**

1. **Check VLM API status:**
   ```bash
   # Query VLM API errors
   gcloud logging read "jsonPayload.logger=\"vlm_client\" AND severity>=ERROR" \
     --project machinemate-prod \
     --limit 50
   ```

2. **Common issues:**

   **Quota exceeded:**
   - Check GCP quotas for Vertex AI
   - Request quota increase if needed
   - Implement rate limiting

   **Authentication errors:**
   - Verify service account permissions
   - Check API key validity
   - Review IAM roles

   **API unavailability:**
   - Check Google Cloud Status Dashboard
   - Implement fallback behavior
   - Notify users of degraded service

3. **Immediate actions:**
   - If quota issue: implement rate limiting
   - If auth issue: fix credentials
   - If API down: implement graceful degradation

4. **User communication:**
   - Update app to show "Service temporarily unavailable"
   - Provide fallback experience if possible
   - Monitor for recovery

### General Alert Response Process

**For ANY production alert:**

1. **Acknowledge (< 5 minutes):**
   - Acknowledge alert in monitoring system
   - Notify team of investigation
   - Note start time

2. **Assess (< 10 minutes):**
   - Check severity and user impact
   - Review monitoring dashboards
   - Identify if rollback needed

3. **Act (< 30 minutes):**
   - Follow specific runbook
   - Implement fix or rollback
   - Document actions taken

4. **Verify (< 15 minutes):**
   - Monitor metrics return to normal
   - Verify user experience restored
   - Confirm no new issues introduced

5. **Document (< 1 hour):**
   - Create incident report
   - Update team on resolution
   - Plan post-mortem if needed

**Total Response Time Target:** <1 hour from alert to resolution

## Release Schedule

### Recommended Cadence

- **Major releases**: Quarterly (every 3 months)
- **Minor releases**: Monthly
- **Patches/Hotfixes**: As needed
- **OTA updates**: Weekly (for small fixes)

### Best Practices

1. **Avoid releasing on:**
   - Fridays (limited support availability)
   - Major holidays
   - Right before long weekends

2. **Plan releases for:**
   - Tuesday-Thursday (best for support availability)
   - Early in the day (time to monitor)

3. **Coordinate with:**
   - Backend deployments
   - Marketing campaigns
   - Support team availability

## Changelog Template

```markdown
# Version 1.0.0 (2025-01-15)

## New Features
- Feature description

## Improvements
- Improvement description

## Bug Fixes
- Bug fix description

## Known Issues
- Known issue (if any)
```

## Contacts

- **iOS App Store**: [App Store Connect](https://appstoreconnect.apple.com)
- **Android Play Store**: [Google Play Console](https://play.google.com/console)
- **EAS Build**: [Expo Dashboard](https://expo.dev)
- **Support**: support@machinemate.com

---

**Last Updated**: January 2025
**Next Review**: Quarterly
