# MachineMate Monitoring Setup Guide

This guide explains how to deploy Cloud Monitoring dashboards and alert policies for the MachineMate backend service.

## Overview

MachineMate uses Google Cloud Monitoring for observability with the following SLOs:

### Service Level Objectives (SLOs)

1. **Availability**: 99.5% success rate (error rate <0.5%)
2. **Latency**: P95 <500ms, P99 <1s
3. **Cold Start**: P99 <5s

## Prerequisites

- Google Cloud project with Cloud Run service deployed
- `gcloud` CLI installed and authenticated
- Structured logging enabled in backend (see `backend/app/logging_config.py`)

## File Structure

```
docs/infrastructure/
├── monitoring-dashboards.json    # Dashboard configuration
├── alert-policies.json            # Alert policy definitions
└── monitoring-setup.md            # This file
```

## 1. Deploy Monitoring Dashboard

### Using gcloud CLI

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"
export REGION="us-west1"  # Or your Cloud Run region

# Update the dashboard JSON with your project info
sed -i '' "s/PROJECT_ID/$PROJECT_ID/g" docs/infrastructure/monitoring-dashboards.json

# Create the dashboard
gcloud monitoring dashboards create --config-from-file=docs/infrastructure/monitoring-dashboards.json
```

### Using Cloud Console

1. Go to [Cloud Monitoring Dashboards](https://console.cloud.google.com/monitoring/dashboards)
2. Click **Create Dashboard**
3. Click **JSON editor** in the top right
4. Paste the contents of `monitoring-dashboards.json`
5. Replace `PROJECT_ID` and `REGION` with your values
6. Click **Save**

### Dashboard Widgets

The dashboard includes:

- **Request Success Rate**: Tracks availability SLO (99.5%)
- **Request Latency P95**: Tracks latency SLO (<500ms)
- **Error Rate**: Real-time error rate monitoring
- **Active Container Instances**: Auto-scaling visibility
- **Cold Start Latency**: P99 cold start performance
- **Error Rate by Endpoint**: Log-based error breakdown
- **CPU Utilization**: Resource usage tracking
- **Memory Utilization**: Memory pressure monitoring
- **Database Connection Pool**: Connection health logs

## 2. Deploy Alert Policies

### Using gcloud CLI

```bash
# Create each alert policy from the JSON file
# Note: You need to extract and deploy each policy individually

# Example for the first alert (high error rate):
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --policy-from-file=<(jq '.alertPolicies[0]' docs/infrastructure/alert-policies.json)

# Repeat for other alerts by changing the array index [1], [2], etc.
```

### Using Python Script

Create `scripts/deploy-alerts.py`:

```python
#!/usr/bin/env python3
import json
import subprocess
import sys

with open('docs/infrastructure/alert-policies.json') as f:
    config = json.load(f)

for i, policy in enumerate(config['alertPolicies']):
    print(f"Deploying alert policy {i+1}: {policy['displayName']}")

    # Write policy to temp file
    with open('/tmp/alert-policy.json', 'w') as tmp:
        json.dump(policy, tmp, indent=2)

    # Deploy using gcloud
    result = subprocess.run([
        'gcloud', 'alpha', 'monitoring', 'policies', 'create',
        '--policy-from-file=/tmp/alert-policy.json'
    ], capture_output=True, text=True)

    if result.returncode == 0:
        print(f"✅ Created: {policy['displayName']}")
    else:
        print(f"❌ Failed: {result.stderr}")
        sys.exit(1)

print(f"\n✅ Successfully deployed {len(config['alertPolicies'])} alert policies")
```

Run the script:
```bash
chmod +x scripts/deploy-alerts.py
./scripts/deploy-alerts.py
```

### Configured Alerts

1. **High Error Rate** (>1%) - Critical
   - Triggers when 5xx error rate >1% for 5 minutes
   - Auto-closes after 30 minutes of resolution

2. **High Latency P95** (>1s) - Warning
   - Triggers when P95 latency >1 second for 5 minutes
   - Indicates performance degradation

3. **Availability SLO Violation** (<99.5%)
   - Triggers when success rate drops below SLO
   - Measured over 1 hour window

4. **Database Connection Pool Exhausted**
   - Log-based alert for connection issues
   - Immediate notification

5. **Cold Start Latency High** (>5s P99)
   - Monitors container startup performance
   - Triggers after 10 minutes above threshold

6. **Memory Utilization High** (>90%)
   - Prevents OOM kills
   - 10-minute duration before alerting

7. **VLM API Failures**
   - Monitors Fireworks AI integration health
   - Log-based alert on API errors

## 3. Configure Notification Channels

### Create Notification Channels

```bash
# Email notification
gcloud alpha monitoring channels create \
  --display-name="MachineMate Alerts Email" \
  --type=email \
  --channel-labels=email_address=alerts@yourdomain.com

# Slack notification (requires Slack webhook)
gcloud alpha monitoring channels create \
  --display-name="MachineMate Alerts Slack" \
  --type=slack \
  --channel-labels=url=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Get channel IDs
gcloud alpha monitoring channels list
```

### Add Channels to Alert Policies

Update each alert policy to include notification channels:

```bash
# Get the policy ID
POLICY_ID=$(gcloud alpha monitoring policies list --filter="displayName:'MachineMate - High Error Rate'" --format="value(name)")

# Update with notification channel
gcloud alpha monitoring policies update $POLICY_ID \
  --add-notification-channels=CHANNEL_ID
```

## 4. Verify Deployment

### Check Dashboard

1. Navigate to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Click **Dashboards** → Find "MachineMate Backend - SLO Dashboard"
3. Verify all widgets are loading data

### Check Alerts

```bash
# List all alert policies
gcloud alpha monitoring policies list --filter="displayName~'MachineMate'"

# Test an alert (optional - generates test notification)
gcloud alpha monitoring policies test POLICY_ID
```

## 5. Monitoring Best Practices

### Log Correlation

The backend emits structured logs with `trace_id` for correlation:

```json
{
  "timestamp": "2025-11-14T16:18:13.198014Z",
  "level": "info",
  "event": "request_completed",
  "trace_id": "abc123xyz",
  "user_id": "user_456",
  "path": "/api/v1/machines",
  "status_code": 200
}
```

Use `trace_id` to trace requests across logs and monitoring dashboards.

### SLO Error Budget

- **Monthly error budget**: 0.5% of requests
- **Budget burn rate**: Monitor in dashboard
- **Policy**: Hold releases if budget exhausted

### Alert Response Times

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| Critical (>5% errors) | Immediate | Page on-call |
| High (1-5% errors) | 15 minutes | Slack alert |
| Warning (latency) | 1 hour | Email |
| Info | Next business day | Dashboard review |

## 6. Maintenance

### Update Thresholds

Edit `docs/infrastructure/alert-policies.json` and redeploy:

```bash
# Update policy
gcloud alpha monitoring policies update POLICY_ID \
  --policy-from-file=<(jq '.alertPolicies[0]' docs/infrastructure/alert-policies.json)
```

### Add New Metrics

1. Update `monitoring-dashboards.json` with new widgets
2. Redeploy dashboard:
   ```bash
   gcloud monitoring dashboards update DASHBOARD_ID \
     --config-from-file=docs/infrastructure/monitoring-dashboards.json
   ```

## 7. Troubleshooting

### Dashboard Not Showing Data

- Verify Cloud Run service is deployed and receiving traffic
- Check that structured logging is enabled (`LOG_FORMAT=json`)
- Ensure `RELEASE_SHA` environment variable is set in Cloud Run

### Alerts Not Firing

- Check notification channels are configured
- Verify alert conditions match actual metric names
- Test alert manually: `gcloud alpha monitoring policies test POLICY_ID`

### Missing Trace IDs in Logs

- Ensure `X-Cloud-Trace-Context` header is set by Cloud Run
- Verify logging middleware is active in `backend/app/main.py`
- Check trace extraction logic in `backend/app/middleware/logging.py`

## Resources

- [Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Alert Policy Reference](https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies)
- [Dashboard Configuration](https://cloud.google.com/monitoring/dashboards/api-dashboard)
- [SLO Monitoring Guide](https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
