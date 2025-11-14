# On-Call Rotation & Escalation (Phase 4)

This document defines who watches MachineMate production, when they take over, and how to escalate issues uncovered by monitoring, CI, or the health-check workflow.

## Rotation Overview

| Week | Primary | Backup | Notes |
| ---- | ------- | ------ | ----- |
| Week A (Mon 09:00 UTC) | Mobile Lead | Backend Lead | Covers Expo app, auth flows, Supabase client |
| Week B (Mon 09:00 UTC) | Backend Lead | Mobile Lead | Covers FastAPI, Supabase migrations, infra |

- **Handoff cadence:** Mondays at 09:00 UTC via 15-minute sync; record summary in Slack `#ops`.
- **Coverage expectation:** Primary responds within 15 minutes to P1 alerts, 30 minutes for P2. Backup steps in if the primary is unavailable after 20 minutes or proactively during scheduled PTO.
- **Time off:** Update this file and pin a note in `#ops` as soon as PTO is confirmed; ensure swaps are explicit.

## Alerts & Tooling

| Source | Trigger | Channel |
| ------ | ------- | ------- |
| GitHub Actions (`CI Quality Checks`) | Any job failure on `main`/`develop` | `#ops` webhook |
| GitHub Actions (`API & Supabase Health`) | Non-200 responses or timeout | `#ops` webhook |
| Cloud Monitoring | API latency p95 > 450 ms for 5 min, Cloud Run uptime < 99.9 % | Email + Pager/SMS |
| Sentry Release Health | Crash-free sessions < 99 % for 30 min | `#mobile-alerts` + Pager |

> Configure webhooks once secrets are available; until then, the primary must manually watch GitHub notifications.

## Responsibilities

1. **Alert Triage**
   - Acknowledge in Slack/Pager.
   - Create an incident doc from `docs/operations/incidents/TEMPLATE.md` as soon as impact is confirmed.
   - Update the incident doc with timestamps, impact, and mitigation steps.
2. **Status Updates**
   - Post to `#ops` every 30 minutes for P1 incidents, hourly for P2.
   - Loop in product/leadership channels if customer impact spans >1 hour.
3. **Postmortem**
   - Within 48 hours, ensure a root-cause summary and action items are documented; link the final doc in `docs/operations/reliability.md`.
4. **Maintenance**
   - Verify health-check workflow logs at least once per shift.
   - Spot-check Supabase/Cloud Run dashboards mid-week.

## Escalation Path

1. **Primary → Backup:** if workload exceeds capacity or no fix within 30 minutes.
2. **Backup → Engineering Manager:** if remediation requires deploy/rollback not covered in runbooks.
3. **Engineering Manager → Leadership:** when customer data integrity is at risk or downtime exceeds 60 minutes.

Document deviations from this path in the incident record.

## Contact Roster

| Role | Name | Slack | Phone / Pager |
| ---- | ---- | ----- | ------------- |
| Mobile Lead | _TBD_ | `@mobile-lead` | `+1-xxx-xxx-xxxx` |
| Backend Lead | _TBD_ | `@backend-lead` | `+1-xxx-xxx-xxxx` |
| Engineering Manager | _TBD_ | `@eng-manager` | `+1-xxx-xxx-xxxx` |

> Replace placeholders with real contacts before launch. Keep this table synced whenever the team changes.

## Checklist for New On-Call Owners

- [ ] Can access GitHub Actions logs and re-run jobs.
- [ ] Has `gcloud` + Supabase CLI access to prod/staging projects.
- [ ] Reviewed `docs/operations/reliability.md` and latest incident reports.
- [ ] Knows how to deploy/rollback (EAS + Cloud Run) per `docs/deployment/cloud-run.md` and `RELEASE.md`.
- [ ] Validated Pager/SMS notifications.
