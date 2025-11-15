# EAS Build & Submit Configuration Guide

This guide explains how to configure Expo Application Services (EAS) for building and submitting MachineMate to app stores.

## Prerequisites

1. **EAS CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account**: Create at https://expo.dev

3. **Login to EAS**:
   ```bash
   eas login
   ```

## EAS Project Setup

### 1. Initialize EAS Project

If not already initialized:

```bash
eas init
```

This will create an EAS project and give you an `EAS_PROJECT_ID`.

### 2. Configure EAS Secrets

EAS secrets are environment variables stored securely on Expo's servers. They are injected into builds at build time.

#### Set Shared Secrets (All Profiles)

```bash
# Supabase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-supabase-anon-key"

# EAS Project ID (get from expo.dev project settings)
eas secret:create --scope project --name EAS_PROJECT_ID --value "your-eas-project-id"

# Sentry Configuration
eas secret:create --scope project --name SENTRY_DSN --value "https://your-sentry-dsn@sentry.io/project-id"
eas secret:create --scope project --name SENTRY_ORG --value "machinemate"
eas secret:create --scope project --name SENTRY_PROJECT --value "machinemate-app"
```

#### Set Environment-Specific Secrets (Optional)

If you want different Sentry projects for each environment:

```bash
# Development
eas secret:create --scope project --name SENTRY_DSN_DEV --value "https://dev-dsn@sentry.io/dev-project"

# Preview
eas secret:create --scope project --name SENTRY_DSN_PREVIEW --value "https://preview-dsn@sentry.io/preview-project"

# Production
eas secret:create --scope project --name SENTRY_DSN_PROD --value "https://prod-dsn@sentry.io/prod-project"
```

#### List All Secrets

```bash
eas secret:list
```

#### Update a Secret

```bash
eas secret:delete --name SECRET_NAME
eas secret:create --scope project --name SECRET_NAME --value "new-value"
```

## Build Profiles

MachineMate has four build profiles configured in `eas.json`:

### 1. Development Profile

**Purpose**: Local development builds with dev client

**Usage**:
```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

**Characteristics**:
- Development client enabled
- Points to `http://localhost:8000` API
- Internal distribution
- Debug logging enabled
- Crash reporting disabled

### 2. Preview Profile

**Purpose**: Internal testing and staging builds

**Usage**:
```bash
# iOS (simulator)
eas build --profile preview --platform ios

# Android (APK for easy distribution)
eas build --profile preview --platform android
```

**Characteristics**:
- Points to preview API (configure in secrets)
- Internal distribution
- iOS: Builds for simulator
- Android: Generates APK (easier for testers)
- Info-level logging
- Crash reporting enabled

**Share with Testers**:
After build completes, share the build URL with testers. They can install via Expo Go or download the IPA/APK.

### 3. Production Profile

**Purpose**: App Store / Google Play releases

**Usage**:
```bash
# iOS (App Store)
eas build --profile production --platform ios

# Android (Play Store)
eas build --profile production --platform android
```

**Characteristics**:
- Points to production Cloud Run API
- App Store distribution
- iOS: App Store build type
- Android: App Bundle (AAB)
- Auto-increments build numbers
- Warn-level logging
- Crash reporting enabled

### 4. Production-Simulator Profile

**Purpose**: Test production configuration locally

**Usage**:
```bash
eas build --profile production-simulator --platform ios
```

**Characteristics**:
- Extends production profile
- Builds for iOS simulator
- Useful for testing production config without deploying

## App Store Submission

### iOS App Store

#### Prerequisites

1. **Apple Developer Account**: https://developer.apple.com
2. **App Store Connect**: Create app at https://appstoreconnect.apple.com
3. **Certificates & Provisioning**: EAS handles automatically

#### Update Submit Configuration

Edit `eas.json` submit section:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123XYZ"
    }
  }
}
```

**Get Your Values**:
- `appleId`: Your Apple ID email
- `ascAppId`: From App Store Connect > App > App Information > Apple ID
- `appleTeamId`: From https://developer.apple.com/account > Membership

#### Submit to App Store

```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --platform ios
```

### Android Play Store

#### Prerequisites

1. **Google Play Console**: https://play.google.com/console
2. **Service Account**: For automated submission

#### Create Service Account

1. Go to https://play.google.com/console
2. Setup > API access
3. Create service account with "Admin" role
4. Download JSON key file
5. Save as `google-service-account.json` in project root (DO NOT commit!)

#### Update Submit Configuration

`eas.json` is already configured:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

**Tracks**:
- `internal`: Internal testing (limited users)
- `alpha`: Closed alpha testing
- `beta`: Open beta testing
- `production`: Public release

#### Submit to Play Store

```bash
# Build for production
eas build --profile production --platform android

# Submit to Play Console (internal track)
eas submit --platform android
```

## Environment Variables Reference

### Build-Time Variables (eas.json)

These are defined in `eas.json` and can be overridden with EAS secrets:

| Variable | Development | Preview | Production |
|----------|------------|---------|------------|
| `APP_ENV` | development | preview | production |
| `EXPO_PUBLIC_API_BASE_URL` | localhost:8000 | preview URL | Cloud Run URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Set via secret | Set via secret | Set via secret |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Set via secret | Set via secret | Set via secret |
| `SENTRY_DSN` | Set via secret | Set via secret | Set via secret |
| `SENTRY_ORG` | machinemate | machinemate | machinemate |
| `SENTRY_PROJECT` | machinemate-app | machinemate-app | machinemate-app |
| `EAS_PROJECT_ID` | Set via secret | Set via secret | Set via secret |

### Runtime Variables (app.config.ts)

These are accessible in the app via `Constants.expoConfig.extra`:

```typescript
import Constants from 'expo-constants';

const { apiUrl, enableAnalytics, sentryDsn } = Constants.expoConfig.extra;
```

## Over-the-Air (OTA) Updates

EAS Update allows deploying JavaScript/asset changes without rebuilding:

### Publish Update

```bash
# Development channel
eas update --channel development --message "Fix login bug"

# Preview channel
eas update --channel preview --message "Add new feature"

# Production channel
eas update --channel production --message "Hotfix: crash on startup"
```

### Channels

- `development`: Dev builds automatically receive updates
- `preview`: Preview builds automatically receive updates
- `production`: Production builds automatically receive updates

### Update Strategy

1. **Bug Fixes**: Use OTA updates for JavaScript fixes
2. **New Features**: Can use OTA if no native changes
3. **Native Changes**: Require new build (camera permissions, native modules, etc.)

### View Updates

```bash
eas update:list --branch production
```

## Build & Submit Workflow

### Pre-Release Checklist

- [ ] Update version in `app.config.ts`
- [ ] Update iOS build number
- [ ] Update Android version code
- [ ] Test on physical devices (iOS and Android)
- [ ] Run production build locally: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Check error reporting in Sentry
- [ ] Review App Store screenshots and metadata
- [ ] Update PRIVACY_POLICY.md if needed
- [ ] Update TERMS_OF_SERVICE.md if needed

### iOS Release Process

```bash
# 1. Build for production
eas build --profile production --platform ios

# 2. Wait for build to complete (check status)
eas build:list

# 3. Submit to App Store Connect
eas submit --platform ios

# 4. In App Store Connect:
#    - Add version information
#    - Upload screenshots
#    - Write release notes
#    - Submit for review

# 5. After approval, release to App Store
```

### Android Release Process

```bash
# 1. Build for production
eas build --profile production --platform android

# 2. Submit to Play Console (internal track)
eas submit --platform android

# 3. In Play Console:
#    - Review internal testing
#    - Promote to beta/production
#    - Add release notes
#    - Roll out gradually (10% -> 50% -> 100%)

# 4. Monitor crash reports in Sentry
```

## Troubleshooting

### Build Failures

**Check build logs**:
```bash
eas build:list
# Click on build URL to view logs
```

**Common issues**:
- Missing secrets: Run `eas secret:list` to verify
- Invalid credentials: Re-run `eas credentials`
- Native dependencies: Check package.json and rebuild

### Submit Failures

**iOS**:
- Invalid Apple ID credentials: Update in `eas.json`
- Missing App Store Connect app: Create in App Store Connect first
- Certificate issues: Run `eas credentials`

**Android**:
- Service account permissions: Verify in Play Console
- Track not found: Create internal testing track first
- Version code conflict: Increment version code

### Update Failures

**Branch/Channel mismatch**:
```bash
eas channel:list
eas branch:list
```

**Clear cache**:
```bash
eas update --clear-cache
```

## Monitoring

### Build Status

```bash
# List recent builds
eas build:list

# Check specific build
eas build:view <build-id>

# Cancel build
eas build:cancel <build-id>
```

### Update Status

```bash
# List updates
eas update:list

# View update details
eas update:view <update-id>
```

### Analytics

- **Expo Dashboard**: https://expo.dev/accounts/[account]/projects/[project]
- **Sentry**: Error tracking and performance monitoring
- **App Store Connect**: iOS analytics
- **Play Console**: Android analytics

## Security Best Practices

1. **Never commit secrets**: Use `.env` for local, EAS secrets for builds
2. **Rotate keys regularly**: Update Supabase and Sentry keys periodically
3. **Use separate projects**: Different Supabase/Sentry projects for dev/preview/prod
4. **Limit service account permissions**: Minimal necessary access
5. **Enable 2FA**: On Apple ID, Google Play, and Expo accounts
6. **Review build logs**: Check for accidentally logged secrets

## Cost Estimation

### EAS Build

- **Free Tier**: Limited builds per month
- **Production**: Unlimited builds (~$29-99/month)
- Ref: https://expo.dev/pricing

### EAS Update

- Usually included in build plan

### Apple Developer

- $99/year

### Google Play Developer

- $25 one-time fee

## Resources

- **EAS Documentation**: https://docs.expo.dev/eas/
- **Build Configuration**: https://docs.expo.dev/build/eas-json/
- **Submit to Stores**: https://docs.expo.dev/submit/introduction/
- **OTA Updates**: https://docs.expo.dev/eas-update/introduction/
- **Expo Forums**: https://forums.expo.dev/

---

**Next Steps**:
1. Set up EAS secrets (see "Configure EAS Secrets" above)
2. Run a preview build to test the configuration
3. Set up App Store Connect and Play Console
4. Configure submission settings in `eas.json`
5. Run production builds
6. Submit to app stores!
