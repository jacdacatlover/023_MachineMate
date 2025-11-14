# Incident Report - {{DATE}}

> Copy this file to `docs/operations/incidents/YYYY-MM-DD-short-slug.md` when an incident starts. Keep updates timestamped.

## Summary

- **Start time:** YYYY-MM-DD HH:MM UTC
- **End time:** YYYY-MM-DD HH:MM UTC (or “ongoing”)
- **Impact:** (e.g., “API 5xx for 20% of traffic”, “Auth failures in mobile app”)
- **Severity:** P1 / P2 / P3
- **Reporter:** Name / Slack handle

## Timeline (UTC)

| Time | Event |
| ---- | ----- |
| 00:00 | Alert triggered (source, link) |
| 00:05 | Primary acknowledged |
| 00:15 | Mitigation step taken |
| … | … |

## Detection

- Source + link to alert (GitHub Action, Sentry, Cloud Monitoring, etc.)
- Were there earlier warning signs?

## Root Cause

- What failed?
- Why did existing safeguards not prevent it?

## Mitigation & Resolution

- Steps taken (deploy rollback, feature flag off, Supabase migration revert, etc.)
- Verification steps confirming recovery

## Customer Impact

- Duration and % of users affected
- Any data integrity concerns?

## Follow-Up Actions

| Action | Owner | Due Date |
| ------ | ----- | -------- |
| e.g., Add alert for X | Name | YYYY-MM-DD |

## Learnings

- What worked well?
- What slowed us down?
- Any playbook updates needed (`docs/operations/reliability.md`, `docs/operations/oncall.md`, `docs/deployment/cloud-run.md`)?

## Artifacts

- Links to Grafana/Cloud Monitoring dashboards
- Relevant GitHub Actions run
- Sentry issues
- Slack thread
