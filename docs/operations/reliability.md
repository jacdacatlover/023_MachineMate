# Reliability & Incident Response (Phase 4)

This document captures the initial reliability targets, observability hooks, and manual response playbooks that Phase 4 calls for. It complements the deployment notes in `docs/deployment/cloud-run.md` and should evolve as we automate more of the runbooks.

## Service-Level Objectives

- **API latency:** p95 for `/api/v1/*` requests ≤ **400 ms** measured via Cloud Run request logs exported to Cloud Monitoring. Alert if any 5‑minute window exceeds 450 ms.
- **Backend availability:** Cloud Run service uptime ≥ **99.9 %** per calendar month. Alert on two consecutive failed health checks or any deployment with more than three restarts in 15 minutes.
- **Mobile stability:** Crash-free sessions ≥ **99.5 %** in Sentry release health for the active `APP_ENV`. Alert if a release drops below 99 % for 30 minutes.
- **Data sync freshness:** `favorites`/`history` replication lag < **2 minutes** between Supabase and client cache (instrumented via background sync metrics in a later phase). Flag manually if sync jobs stall.

## Observability Hooks

1. **Mobile (Expo)**
   - `initMonitoring` now tags Sentry events with `app.environment`, `app.version`, `cloud_run_release`, and Supabase user metadata via `setMonitoringUser`.
   - The shared logger forwards warn/error/info entries as breadcrumbs categorized by `auth`, `recognition`, or `uploads`. This allows us to reconstruct user journeys during incidents.
   - Action item: Phase 3 auth work should call `setMonitoringUser` whenever sessions change so the SLO dashboards can filter by user role.
2. **Backend (FastAPI on Cloud Run)**
   - Configure structured logging (`google-cloud-logging` or `structlog`) so every request includes `trace_id`, `user_id`, and `request_id`.
   - Export metrics to Cloud Monitoring (latency, error rate) and hook Sentry’s Python SDK for exception parity with the mobile client.
3. **Storage & Supabase**
   - Enable Supabase log drains → BigQuery for auditing RLS policies.
   - Track `favorites`, `history`, and `media_assets` table growth to anticipate storage limits.

## Incident Response Workflow

1. **Detection**
   - Alerts originate from Cloud Monitoring (latency/uptime), Sentry (error regressions), or the scheduled health-check workflow (see below).
2. **Triage (≤15 min)**
   - Confirm alert validity via Cloud Run logs (`gcloud run services logs read machinemate-api --region=$REGION`).
   - Check Supabase status page and the `supabase status` CLI if auth/storage issues are suspected.
3. **Mitigation (≤30 min)**
   - Roll back to the previous healthy Cloud Run revision: `gcloud run services update-traffic machinemate-api --to-revisions REVISION=100`.
   - Revert problematic EAS OTA or disable new feature flags via Config.
   - For data incidents, pause sync jobs and toggle RLS policies to read-only if needed.
4. **Communication**
   - Log the incident in `docs/release/qa-runs.md` (temporary home) with timestamps, impact, and mitigation.
   - Notify the team via Slack/Teams with status updates every 30 minutes until resolved.
5. **Postmortem**
   - Within 48 hours capture root cause, fix, and follow-up tasks in `docs/operations/incidents/YYYY-MM-DD.md` (create folder as needed).

## Rollback & Recovery Reference

1. **Backend**
   - Redeploy earlier container via GitHub Actions “Deploy Backend” workflow or `gcloud run deploy` using the prior Artifact Registry image tag.
   - Re-run Supabase migrations against staging before re-applying to production. If a migration caused the issue, generate a revert SQL script under `supabase/migrations`.
2. **Mobile**
   - Use EAS Update rollback (`eas update:republish --branch production --message "Rollback to build X"`).
   - If a store build is affected, temporarily delist release or push an emergency patch following `RELEASE.md`.
3. **Data**
   - Supabase PITR (Point-in-Time Recovery) is configured for 7 days; coordinate with Supabase support before initiating.
   - For storage buckets, restore from the versioned copy kept in the `machines` bucket backup folder.

## Scheduled Health Checks & Alerting

1. **GitHub Action (recommended)**
   - `.github/workflows/healthcheck.yml` (added in Phase 4) runs every 10 minutes and probes:
     - `GET ${{ secrets.HEALTHCHECK_API_BASE_URL }}/health`
     - `GET ${{ secrets.HEALTHCHECK_API_BASE_URL }}/api/v1/machines?limit=1`
     - Supabase favorites count via `$${ secrets.HEALTHCHECK_SUPABASE_REST_URL }/rest/v1/favorites?select=count&limit=1`
   - Required GitHub secrets:
     - `HEALTHCHECK_API_BASE_URL` – Cloud Run base URL (e.g., `https://api.machinemate.com`).
     - `HEALTHCHECK_SUPABASE_REST_URL` – Supabase project URL (`https://project.supabase.co`).
     - `HEALTHCHECK_SUPABASE_ANON_KEY` – anon/public API key for REST probes.
   - Extend the workflow with Slack/Email hooks (e.g., `workflow_run` notifications) once secrets are in place.
2. **Cloud Scheduler / Cloud Monitoring**
   - Secondary option: configure Cloud Scheduler to hit `/health` and a Supabase RPC hourly, funnel logs to Cloud Monitoring, and build an alert policy for 2 consecutive failures.
3. **Manual checklist**
   - Until automation ships, run `npm run lint && npm run type-check && npm test` plus `supabase db push --db-url <staging>` before merges touching auth/data.

## Ownership & Next Steps

- **Primary on-call:** rotation + contacts now live in `docs/operations/oncall.md`; keep that file aligned with staffing changes.
- **Action items**
  1. Health-check workflow added in `.github/workflows/healthcheck.yml`—monitor first few runs and hook Slack/email notifications.
  2. Add Cloud Monitoring dashboards that visualize the three SLOs and wire alert policies.
  3. Wire Supabase session changes to `setMonitoringUser` once the Phase 3 auth hook lands.

Keep this document close to the code by updating it alongside any infra or observability change. Once Phase 4 finishes, link it from `plan/detailplan.md`, `docs/deployment/cloud-run.md`, and reference new incident summaries under `docs/operations/incidents/`.
