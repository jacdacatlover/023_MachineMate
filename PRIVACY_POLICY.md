# Privacy Policy for MachineMate

**Last Updated:** January 15, 2025

MachineMate ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.

## Information We Collect

### Personal Information

When you create an account, we collect:
- **Email address**: Used for account authentication and communication
- **Account credentials**: Securely hashed passwords for authentication
- **User ID**: Unique identifier assigned to your account

### Usage Data

We automatically collect certain information when you use MachineMate:

- **Machine Identifications**: Photos you take or upload for gym equipment identification
- **Identification Results**: Machine names, descriptions, and confidence scores
- **User Preferences**:
  - Favorite machines you save
  - Browsing and search history
  - Recognition confidence threshold settings
- **Application Performance Data**:
  - App startup times
  - Navigation patterns
  - Screen render times
  - Error reports and crash logs

### Device Information

We may collect:
- Device type and model
- Operating system version (iOS/Android)
- App version
- Unique device identifiers (for error tracking)
- Network information (for connectivity status)

### Camera and Photo Library

MachineMate requires access to:
- **Camera**: To take photos of gym equipment for identification
- **Photo Library**: To select existing photos for identification

We only access photos when you explicitly choose to take or select them. Photos are processed for machine identification and are not stored on our servers unless you save the identification result.

## How We Use Your Information

We use collected information for:

1. **Core Functionality**:
   - Identifying gym equipment from photos using AI/ML models
   - Providing exercise instructions and safety information
   - Saving your favorite machines and viewing history

2. **Service Improvement**:
   - Analyzing usage patterns to improve identification accuracy
   - Optimizing app performance and user experience
   - Debugging errors and fixing crashes

3. **Communication**:
   - Sending important service updates
   - Responding to your inquiries and support requests
   - Notifying you of significant app changes

4. **Legal Compliance**:
   - Complying with applicable laws and regulations
   - Enforcing our Terms of Service
   - Protecting our rights and preventing fraud

## Third-Party Services

MachineMate uses the following third-party services that may collect and process your data:

### Supabase (Database & Authentication)

**What they do**: Provide database storage and user authentication services.

**Data shared**:
- Email address and hashed passwords (authentication)
- User ID and profile information
- Favorite machines and browsing history
- Machine identification records

**Privacy Policy**: https://supabase.com/privacy

**Data Location**: United States (us-east-1 region)

**Purpose**: Store user data securely and enable account authentication.

### Google Cloud Platform

#### Cloud Run (Backend Hosting)

**What they do**: Host our backend API services.

**Data shared**:
- API request data (photos for identification)
- User ID (for associating identifications)
- Request metadata (timestamps, IP addresses in logs)

**Privacy Policy**: https://cloud.google.com/terms/cloud-privacy-notice

**Data Location**: United States (us-central1 region)

**Purpose**: Process machine identification requests and serve API responses.

#### Vertex AI (Vision Language Model)

**What they do**: Provide AI/ML models for gym equipment identification.

**Data shared**:
- Photos you submit for identification
- Contextual prompts (e.g., "identify this gym equipment")

**Privacy Policy**: https://cloud.google.com/terms/cloud-privacy-notice

**Data Location**: United States

**Purpose**: Analyze photos and identify gym equipment using advanced AI models.

**Data Retention**: Photos sent to Vertex AI are processed in real-time and are not stored by Google for model training. We do not retain photos on our servers unless you save the identification result.

#### Cloud Logging (Application Logs)

**What they do**: Store application logs for monitoring and debugging.

**Data shared**:
- API request logs (without photos)
- Error messages and stack traces
- Performance metrics
- User IDs (for correlating errors)

**Privacy Policy**: https://cloud.google.com/terms/cloud-privacy-notice

**Data Location**: United States

**Purpose**: Monitor system health, debug errors, and improve service reliability.

**Data Retention**: Logs are retained for 30 days, then automatically deleted.

### Sentry (Error Tracking & Performance Monitoring)

**What they do**: Monitor application errors and performance issues.

**Data shared**:
- Error messages and stack traces
- Device information (model, OS version)
- App version and configuration
- User ID (for correlating errors, no personal information)
- Performance metrics (startup time, navigation speed)
- Breadcrumbs (user actions leading to errors)

**Privacy Policy**: https://sentry.io/privacy/

**Data Location**: United States

**Purpose**: Identify, track, and fix application errors and performance issues.

**Data Retention**: Error data retained for 90 days.

**PII Protection**: Sentry is configured to scrub personally identifiable information (PII) from error reports. We do not send photos, email addresses, or sensitive user data to Sentry.

### Expo/EAS (App Distribution & Updates)

**What they do**: Facilitate app building, distribution, and over-the-air updates.

**Data shared**:
- Device push notification tokens
- App version information
- Update channel preferences

**Privacy Policy**: https://expo.dev/privacy

**Purpose**: Enable app updates and deliver new features without requiring full app store updates.

## Data Retention

- **Account Data**: Retained until you delete your account
- **Machine Identifications**: Retained until you delete them or your account
- **Favorites & History**: Retained until you delete them or your account
- **Application Logs**: Automatically deleted after 30 days
- **Error Reports**: Automatically deleted after 90 days
- **Photos**: Not stored on our servers unless you save the identification result

## Your Rights and Choices

You have the right to:

### Access Your Data
Request a copy of all personal data we have about you.

### Correct Your Data
Update or correct your account information in the app settings.

### Delete Your Data
- **Individual Records**: Delete specific identifications, favorites, or history items within the app
- **Full Account Deletion**: Request complete deletion of your account and all associated data

To delete your account, contact us at privacy@machinemate.com. We will delete all your data within 30 days, except where required by law to retain it.

### Data Portability
Request an export of your data in a machine-readable format (JSON).

### Opt-Out of Analytics
While we don't use third-party advertising analytics, you can limit error tracking by disabling crash reporting in Settings (note: this may impact our ability to fix issues affecting you).

### Withdraw Consent
Stop using specific features (like machine identification) at any time. Note that core functionality requires certain permissions.

## Data Security

We implement industry-standard security measures:

- **Encryption in Transit**: All data transmitted between the app and our servers uses HTTPS/TLS encryption
- **Encryption at Rest**: Database data is encrypted using AES-256
- **Authentication**: Passwords are hashed using bcrypt with salt
- **Access Controls**: Database access is restricted using Row Level Security (RLS) policies
- **API Security**: All API requests require valid authentication tokens
- **Regular Security Audits**: We regularly review and update our security practices

However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.

## Children's Privacy

MachineMate is intended for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately, and we will delete the information.

## International Data Transfers

Your data may be transferred to and processed in the United States and other countries where our service providers operate. These countries may have data protection laws different from your country of residence.

By using MachineMate, you consent to the transfer of your information to the United States and other countries.

We ensure appropriate safeguards are in place for international data transfers, including:
- Standard contractual clauses with service providers
- Privacy Shield certification (where applicable)
- Compliance with GDPR for European users

## California Privacy Rights (CCPA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

- **Right to Know**: What personal information we collect, use, and disclose
- **Right to Delete**: Request deletion of your personal information
- **Right to Opt-Out**: Opt out of "sale" of personal information (Note: We do not sell personal information)
- **Right to Non-Discrimination**: We will not discriminate against you for exercising your CCPA rights

To exercise these rights, contact us at privacy@machinemate.com.

## European Privacy Rights (GDPR)

If you are in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR):

- **Legal Basis for Processing**:
  - Consent (for optional features)
  - Contractual necessity (for core app functionality)
  - Legitimate interests (for service improvement)

- **Data Protection Officer**: Contact privacy@machinemate.com

- **Right to Lodge a Complaint**: You may file a complaint with your local data protection authority

- **International Transfers**: We use standard contractual clauses for data transfers outside the EEA

## Changes to This Privacy Policy

We may update this Privacy Policy periodically. We will notify you of significant changes by:
- Posting the new Privacy Policy in the app
- Updating the "Last Updated" date
- Sending an email notification (for material changes)

Your continued use of MachineMate after changes constitutes acceptance of the updated Privacy Policy.

## Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or your data:

**Email**: privacy@machinemate.com

**Mail**:
MachineMate Privacy Team
[Your Business Address]
[City, State ZIP]

**Response Time**: We aim to respond to privacy inquiries within 30 days.

## Data Breach Notification

In the event of a data breach that affects your personal information, we will:
1. Notify affected users within 72 hours of discovery
2. Describe the nature of the breach and data affected
3. Provide guidance on protective measures you can take
4. Report to relevant authorities as required by law

## Summary of Data Practices

| Data Type | Purpose | Retention | Third Parties |
|-----------|---------|-----------|---------------|
| Email & Password | Authentication | Until account deletion | Supabase |
| Photos | Machine identification | Not stored (unless saved) | Google Vertex AI |
| Identifications | User history | Until deleted | Supabase |
| Favorites | User preferences | Until deleted | Supabase |
| Error Logs | Bug fixing | 90 days | Sentry |
| API Logs | Monitoring | 30 days | Google Cloud |
| Performance Data | Optimization | 90 days | Sentry |

---

**Your privacy is important to us.** This Privacy Policy is designed to be transparent about our data practices. If anything is unclear, please contact us at privacy@machinemate.com.
