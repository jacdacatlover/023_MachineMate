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

1. **Crash Reporting:**
   - Monitor Sentry/Expo Insights for crashes
   - Prioritize crashes affecting >1% of users
   - Fix critical crashes in hotfix release

2. **Analytics:**
   - Monitor user engagement metrics
   - Track feature usage
   - Identify drop-off points

3. **User Feedback:**
   - Monitor app store reviews
   - Respond to user feedback (aim for <24 hours)
   - Create issues for reported bugs

4. **Performance:**
   - Monitor app startup time
   - Track API response times
   - Monitor bundle size

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

For critical bugs in production:

1. Create hotfix branch:
   ```bash
   git checkout -b hotfix/1.0.1 main
   ```

2. Fix the bug and test thoroughly

3. Update version to `1.0.1`

4. Build and submit:
   ```bash
   eas build --platform all --profile production
   eas submit --platform all
   ```

5. Merge back to main:
   ```bash
   git checkout main
   git merge hotfix/1.0.1
   git push
   ```

## Rollback Plan

### OTA Rollback

If an OTA update causes issues:

```bash
eas update:republish --branch production --group [previous-group-id]
```

### App Store Rollback

**iOS:**
- Cannot rollback published version
- Submit new version with fixes ASAP
- Use "Expedited Review" if critical (limited uses)

**Android:**
- Can deactivate current release
- Promote previous version
- Submit new fixed version

### Communication

If rollback is needed:

1. **Internal:**
   - Notify team immediately
   - Document the issue
   - Plan hotfix release

2. **Users (if critical):**
   - Update app store description with known issues
   - Post on social media if applicable
   - Respond to affected users

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
