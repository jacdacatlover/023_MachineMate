# Infrastructure Overview

High-level view of how MachineMate is hosted, the environments we support, and
where to find deeper runbooks.

## Goals & Principles

- **Lightweight app** – stream media rather than bundling heavy assets.
- **Single public API** – the mobile client only talks to our backend; we can
  swap providers behind the scenes.
- **Cost-aware MVP** – begin with Supabase + Cloud Run, scale components
  independently when usage or performance demands.
- **Reproducible infra** – Terraform + CI/CD using Workload Identity Federation
  so no long-lived keys are needed.

## Architecture (MVP)

```
[Expo RN App] --HTTPS--> [Cloud Run: FastAPI]
      |                         |
      |                         +--> Fireworks AI (identify)
      |                         +--> Supabase Auth (JWT validation)
      |                         +--> Supabase Postgres (favorites/history)
      |                         +--> Supabase Storage (media assets)
      |
      +-- Sentry (sentry-expo) for crash & perf
```

- Backend emits structured logs, health/readiness probes, and metrics endpoints.
- CI builds the Docker image, pushes to Artifact Registry, then deploys to Cloud
  Run via Terraform or GitHub Actions.

## Environments & Domains

- Environments: `dev`, `staging`, `prod` (separate Supabase projects + Cloud
  Run services).
- Suggested domains: `api.dev.yourdomain.com`, `api.staging.yourdomain.com`,
  `api.yourdomain.com`.
- Expo config (`app.config.ts`) reads `EXPO_PUBLIC_API_BASE_URL` per environment.

## Reference Guide Map

- **Secrets & Env Vars** – `docs/infrastructure/secrets.md`
  - Inventory of `.env`, Supabase keys, GCP secrets, rotation playbooks.
- **Supabase Schema** – `docs/infrastructure/supabase.md`
  - Database tables, storage buckets, JWT configuration, migrations, testing.
- **Phase 1 Setup** – `docs/infrastructure/phase1-setup.md`
  - Step-by-step `supabase db push`, verification, and auth exercises.
- **Cloud Run Deployments** – `docs/deployment/cloud-run.md`
  - gcloud/Terraform/Docker flow, manual verification, CI/CD hooks.
- **Roadmap & Phases** – `docs/roadmap.md`
  - Status of each phase and what’s next.

## Monitoring & Logging

- Mobile: `createLogger(namespace)` and `sentry-expo` capture breadcrumbs,
  performance timings, and crash reports (requires `EXPO_PUBLIC_SENTRY_DSN`).
- Backend: structured logging (JSON) shipped to Cloud Logging; Sentry DSN can be
  provided via Secret Manager.
- Consider wrapping risky surfaces in `ErrorBoundary` to improve UX and ensure
  `reportError` fires.

## Next Steps

- Need to refresh machine guidance copy? Run `node scripts/embedReferences.js`.
- Touching machine data? Validate JSON and run `npm run type-check`.
- Adding new infrastructure? Document it here and extend Terraform with a new
  module plus `.example` vars.
